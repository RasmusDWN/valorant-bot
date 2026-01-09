import {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle
} from 'discord.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BULLETS_PER_PAGE = 5;

export default {
    data: new SlashCommandBuilder()
        .setName('currentpatchnotes')
        .setDescription('Show the latest Valorant patch notes with TL;DR'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // 1️⃣ Get the latest patch URL
            const listUrl = 'https://playvalorant.com/en-us/news/tags/patch-notes/';
            const listRes = await fetch(listUrl);
            const listHtml = await listRes.text();
            const $list = cheerio.load(listHtml);

            const firstLink = $list('a[href*="game-updates/valorant-patch-notes-"]')
                .first()
                .attr('href');

            if (!firstLink) throw new Error('Could not find latest patch link');

            const patchUrl = `https://playvalorant.com${firstLink}`;

            // 2️⃣ Fetch the patch page
            const patchRes = await fetch(patchUrl);
            const patchHtml = await patchRes.text();
            const $ = cheerio.load(patchHtml);

            // 3️⃣ Banner image
            const bannerImage = $('meta[property="og:image"]').attr('content') || null;

            // 4️⃣ Extract TL;DR from <p> tags under TL;DR heading
            let tldrItems = [];
            $('h2, h3').each((_, el) => {
                const heading = $(el).text().trim().toLowerCase();
                if (heading.includes('tl;dr') || heading.includes('tldr')) {
                    let next = $(el).next();
                    while (next.length && !['h2', 'h3'].includes(next[0].name)) {
                        if (next[0].name === 'p') {
                            const text = next.text().trim();
                            if (text) tldrItems.push(text);
                        }
                        next = next.next();
                    }
                }
            });

            if (tldrItems.length === 0) tldrItems.push('TL;DR not found for this patch.');

            const totalPages = Math.ceil(tldrItems.length / BULLETS_PER_PAGE);

            // 5️⃣ Generate embed for a specific page
            const generateEmbed = (pageIndex) => {
                const start = pageIndex * BULLETS_PER_PAGE;
                const pageItems = tldrItems.slice(start, start + BULLETS_PER_PAGE);

                return new EmbedBuilder()
                    .setTitle('🔥 Latest Valorant Patch Notes')
                    .setURL(patchUrl)
                    .setDescription(pageItems.map(b => `• ${b}`).join('\n'))
                    .setColor('#FF4655')
                    .setImage(bannerImage)
                    .setFooter({ text: `Page ${pageIndex + 1}/${totalPages}` });
            };

            // 6️⃣ Navigation buttons
            const navButtons = (pageIndex) => {
                // If TL;DR fits on one page, return empty array (no buttons)
                if (totalPages <= 1) return [];

                const row = new ActionRowBuilder();

                // Prev / Next buttons
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('prevPage')
                        .setLabel('⬅️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('nextPage')
                        .setLabel('Next ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageIndex === totalPages - 1)
                );

                // Add "View Full Patch Notes" only if there’s more content than one page
                if (tldrItems.length > BULLETS_PER_PAGE) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel('View Full Patch Notes')
                            .setStyle(ButtonStyle.Link)
                            .setURL(patchUrl)
                    );
                }

                return [row];
            };

            // 7️⃣ Track pages per user
            const userPages = new Map(); // userId => page number

            // Send initial reply
            const message = await interaction.editReply({
                embeds: [generateEmbed(0)],
                components: navButtons(0)
            });

            // 8️⃣ Collector for pagination
            const collector = message.createMessageComponentCollector({ time: 120000 });

            collector.on('collect', async i => {
                if (!userPages.has(i.user.id)) userPages.set(i.user.id, 0);
                let page = userPages.get(i.user.id);

                if (i.customId === 'prevPage') page = Math.max(0, page - 1);
                if (i.customId === 'nextPage') page = Math.min(totalPages - 1, page + 1);

                userPages.set(i.user.id, page);

                await i.update({
                    embeds: [generateEmbed(page)],
                    components: navButtons(page)
                });
            });

        } catch (err) {
            console.error('Patch TL;DR error:', err);
            await interaction.editReply("Oops, I couldn't fetch the latest patch TL;DR 😢");
        }
    }
};
