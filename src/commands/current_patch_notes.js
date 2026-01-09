import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BULLETS_PER_PAGE = 5;

// /currentpatchnotes
//
// Uses Cheerio to scrape the latest Valorant patch notes page, and links it. Also
// extracts the TL;DR section for the embed description, with pagination if necessary.
export default {
    data: new SlashCommandBuilder()
        .setName('currentpatchnotes')
        .setDescription('Show the latest Valorant patch notes with TL;DR'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Get the latest patch URL
            const listUrl = 'https://playvalorant.com/en-us/news/tags/patch-notes/';
            const listHtml = await safeFetch(listUrl);
            const $list = cheerio.load(listHtml);

            const firstLink = $list('a[href*="game-updates/valorant-patch-notes-"]')
                .first()
                .attr('href');

            if (!firstLink) throw new Error('Could not find latest patch link');

            const patchUrl = `https://playvalorant.com${firstLink}`;

            // Fetch the patch page
            const patchRes = await fetch(patchUrl);
            const patchHtml = await patchRes.text();
            const $ = cheerio.load(patchHtml);

            // Banner image
            const bannerImage = $('meta[property="og:image"]').attr('content') || null;

            const tldrItems = extractTldr($);

            if (tldrItems.length === 0) {
                tldrItems = ['TL;DR not found for this patch.']
            }

            const totalPages = Math.ceil(tldrItems.length / BULLETS_PER_PAGE);

            // Generate embed for a specific page
            const generateEmbed = (pageIndex) => {
                const start = pageIndex * BULLETS_PER_PAGE;
                const pageItems = tldrItems.slice(start, start + BULLETS_PER_PAGE);

                return new EmbedBuilder()
                    .setTitle('🔥 Latest Valorant Patch Notes')
                    .setURL(patchUrl)
                    .setDescription(
                        `**TL;DR:**\n` +
                        pageItems.map(b => `• ${b}`).join('\n')
                    )
                    .setColor('#FF4655')
                    .setImage(bannerImage)
                    .setFooter({ text: `Page ${pageIndex + 1}/${totalPages}` });
            };

            // Navigation buttons
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

            // Track pages per user
            const userPages = new Map(); // userId => page number

            // Send initial reply
            const message = await interaction.editReply({
                embeds: [generateEmbed(0)],
                components: navButtons(0)
            });

            // Collector for pagination
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
            await interaction.editReply("Sorry, I couldn't fetch the latest patch notes right now. Please try again later.");
        }
    }
};

// Extract TL;DR from <p> tags under TL;DR heading
function extractTldr($) {
    let items = [];

    $('p').each((_, el) => {
        const text = $(el)
            .text()
            .replace(/\u0000/g, '') // Clean unwanted characters
            .trim()
            .toLowerCase();
        const includesTldr = text.includes('tldr') || text.includes('tl;dr') || text.includes('tl:dr');

        if (includesTldr) {
            const ul = $(el).next('ul');

            ul.find('li').each((_, li) => {
                const bullet = $(li).text().replace(/\u0000/g, '').trim();
                if (bullet) items.push(bullet);
            });
        }
    });

    return items;
}

async function safeFetch(url) {
    let response;
    try {
        response = await fetch(url);
    } catch (err) {
        throw new Error(`Network error when trying to fetch ${url}: ${err.message}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return text;
}
