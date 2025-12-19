import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fetch from 'node-fetch';

import { fetchSkinByName } from '../utils/fetch_skin.js';

import { createBundleEmbed, createBundleButtons } from '../embeds/bundle.js';
import { createSkinEmbed } from '../embeds/skin.js';

const BUNDLES_PER_PAGE = 5;

export default {
    data: new SlashCommandBuilder()
        .setName('bundles')
        .setDescription('Browse Valorant bundles'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const [bundleRes, skinsRes] = await Promise.all([
                fetch('https://valorant-api.com/v1/bundles'),
                fetch('https://valorant-api.com/v1/weapons/skins')
            ]);

            const bundleData = (await bundleRes.json()).data;
            const skinsData = (await skinsRes.json()).data;

            let page = 0;
            const totalPages = Math.ceil(bundleData.length / BUNDLES_PER_PAGE);
            const generateEmbed = (pageIndex) => {
                const start = pageIndex * BUNDLES_PER_PAGE;
                const pageItems = bundleData.slice(start, start + BUNDLES_PER_PAGE);

                const embed = new EmbedBuilder()
                    .setTitle(`Valorant Bundles (Page ${pageIndex + 1}/${totalPages})`)
                    .setColor(globalThis.VALORANT_RED);

                pageItems.forEach(bundle => {
                    embed.addFields({
                        name: bundle.displayName,
                        value: '',
                    });
                });

                embed.addFields({
                    name: '',
                    value: 'Click the buttons below to view a specific bundle.',
                })

                return embed;
            };

            const generateButtons = (pageIndex) => {
                const start = pageIndex * BUNDLES_PER_PAGE;
                const pageItems = bundleData.slice(start, start + BUNDLES_PER_PAGE);

                const row = new ActionRowBuilder();

                pageItems.forEach((bundle) => {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`bundle_${bundle.uuid}`)
                            .setLabel(bundle.displayName.substring(0, 20))
                            .setStyle(ButtonStyle.Secondary)
                    );
                });

                return row;
            }

            const navButtons = (pageIndex) => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prevBundles')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === 0),
                new ButtonBuilder()
                    .setCustomId('nextBundles')
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === totalPages - 1)
            );

            const message = await interaction.editReply({
                embeds: [generateEmbed(page)],
                components: [generateButtons(page), navButtons(page)],
            });

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                /* ---------- SKIN BUTTON (from bundle message) ---------- */
                if (i.customId.startsWith('skin_')) {
                    const skinName = i.customId
                        .replace('skin_', '')
                        .replaceAll('_', ' ');

                    await i.deferReply();

                    const skin = await fetchSkinByName(skinName.toLowerCase());
                    const embed = await createSkinEmbed(skin);

                    await i.editReply({ embeds: [embed] });
                    return;
                }

                /* ---------- BUNDLE BUTTON ---------- */
                if (i.customId.startsWith('bundle_')) {
                    const uuid = i.customId.replace('bundle_', '');
                    const bundle = bundleData.find(b => b.uuid === uuid);

                    const skinsInBundle = skinsData.filter(skin =>
                        skin.displayName.toLowerCase().startsWith(bundle.displayName.toLowerCase())
                    );

                    const embed = createBundleEmbed(bundle, skinsInBundle);
                    const buttons = createBundleButtons(skinsInBundle);

                    const bundleMessage = await i.reply({
                        embeds: [embed],
                        components: buttons,
                        fetchReply: true
                    });

                    // attach skin collector to message
                    const skinCollector = bundleMessage.createMessageComponentCollector({
                        time: 60000
                    });

                    skinCollector.on('collect', async skinInteraction => {
                        if (!skinInteraction.customId.startsWith('skin_')) return;

                        const skinName = skinInteraction.customId.replace('skin_', '').replaceAll('_', ' ');

                        await skinInteraction.deferReply();

                        const skin = await fetchSkinByName(skinName.toLowerCase());
                        const embed = await createSkinEmbed(skin);

                        await skinInteraction.editReply({ embeds: [embed] });
                    });

                    return;
                }

                /* ---------- NAVIGATION ---------- */
                if (i.customId === 'prevBundles') page--;
                if (i.customId === 'nextBundles') page++;

                await i.update({
                    embeds: [generateEmbed(page)],
                    components: [generateButtons(page), navButtons(page)],
                });
            });
        } catch (error) {
            console.error('Error fetching bundles:', error);
            await interaction.editReply('There was an error fetching the bundles. Please try again later.');
        }
    }
};
