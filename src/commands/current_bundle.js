import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

import { fetchSkinByName } from '../utils/fetch_skin.js';
import { createBundleEmbed, createBundleButtons } from '../embeds/bundle.js';
import { createSkinEmbed } from '../embeds/skin.js';

const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, ''); // Normalize strings for comparison

export default {
    data: new SlashCommandBuilder()
        .setName('currentbundle')
        .setDescription('Shows the current bundle from the Valorant store'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Fetch ValorantStrike store page
            const storeUrl = 'https://valorantstrike.com/valorant-store/';
            const storeRes = await fetch(storeUrl);
            const storeHtml = await storeRes.text();
            const $ = cheerio.load(storeHtml);
            const COLLECTOR_TIMEOUT = 60000; // 60 seconds for button interactions

            // Find the first div with class "et_pb_text_inner" that has a <p> inside
            let parentDiv = null;
            $('div.et_pb_text_inner').each((i, el) => {
                if ($(el).find('p').length > 0) {
                    parentDiv = $(el);
                    return false; // stop after first valid div
                }
            });

            if (!parentDiv) {
                return interaction.editReply('Unable to fetch the current bundle information. Please try again later.');
            }

            // Get the first <p> inside that div
            const pTag = parentDiv.find('p').first();
            if (!pTag || !pTag.text().trim()) {
                return interaction.editReply('Unable to fetch the current bundle information. Please try again later.');
            }

            const bundleName = pTag.text().trim();

            // Fetch bundles, skins, and content tiers from Valorant API
            const [bundlesRes, skinsRes, tiersRes, themesRes] = await Promise.all([
                fetch('https://valorant-api.com/v1/bundles'),
                fetch('https://valorant-api.com/v1/weapons/skins'),
                fetch('https://valorant-api.com/v1/contenttiers'),
                fetch('https://valorant-api.com/v1/themes')
            ]);

            const bundleData = (await bundlesRes.json()).data;
            const skinsData = (await skinsRes.json()).data;
            const tiersData = (await tiersRes.json()).data;
            const themesData = (await themesRes.json()).data;

            // Map tier UUID to VP price
            const tierPriceMap = {};
            tiersData.forEach(tier => {
                if (tier.uuid) tierPriceMap[tier.uuid] = tier.price;
            });

            // Match the bundle name with API
            const bundle = bundleData.find(b =>
                normalize(bundleName).includes(normalize(b.displayName)) ||
                normalize(b.displayName).includes(normalize(bundleName))
            );

            if (!bundle) {
                return interaction.editReply(`Unable to match the current bundle with our database. Please try again later.`);
            }

            const matchedTheme = themesData.find(theme =>
                normalize(bundle.displayName).includes(normalize(theme.displayName)) ||
                normalize(theme.displayName).includes(normalize(bundle.displayName))
            );

            if (!matchedTheme) {
                console.warn('No matching theme found for bundle:', bundle.displayName);
            }

            // Gather all skins in the bundle belonging to the matched theme
            const skinsInBundle = skinsData
                .filter(skin => skin.themeUuid === matchedTheme.uuid)
                .map(skin => ({
                    ...skin,
                    price: skin.contentTierUuid
                        ? tierPriceMap[skin.contentTierUuid]
                        : 'N/A'
                }))
                .sort((a, b) => (a.displayName.localeCompare(b.displayName))); // Sort alphabetically

            if (!skinsInBundle.length) {
                return interaction.editReply(`No skins were found for the current bundle "${bundle.displayName}"`);
            }

            // Map skin names for button interactions
            const skinMap = {};
            skinsInBundle.forEach(skin => {
                skinMap[skin.displayName.toLowerCase()] = skin;
            });

            // Send embed + buttons
            const message = await interaction.editReply({
                embeds: [createBundleEmbed(bundle, skinsInBundle)],
                components: createBundleButtons(skinsInBundle)
            });

            // Handle skin button interactions
            const collector = message.createMessageComponentCollector({ time: COLLECTOR_TIMEOUT });
            collector.on('collect', async i => {
                try {
                    if (!i.customId.startsWith('skin_')) return;

                    const skinName = i.customId.replace('skin_', '').replaceAll('_', ' ').toLowerCase();
            const skin = skinMap[skinName] || await fetchSkinByName(skinName);
                    if (!skin) {
                        return i.reply({ content: `Unable to fetch data for the Skins name. Please try again later.`, ephemeral: true });
                    }

                    const embedSkin = await createSkinEmbed(skin);
                    await i.reply({ embeds: [embedSkin], ephemeral: true });

                } catch (err) {
                    console.error('Error handling skin button click:', err);
                    await i.reply({ content: 'Something went wrong while showing this skin. Please try again later.', ephemeral: true });
                    }
            });

        } catch (err) {
            console.error('Error fetching current bundle:', err);
            await interaction.editReply('An error occurred while fetching the current Valorant bundle. Please try again later.');
        }
    }
};
