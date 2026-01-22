import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

import { fetchSkinByName } from '../utils/fetch_skin.js';
import { createBundleEmbed, createBundleButtons } from '../embeds/bundle.js';
import { createSkinEmbed } from '../embeds/skin.js';

export default {
    data: new SlashCommandBuilder()
        .setName('current-bundle')
        .setDescription('Shows the current bundle from the Valorant store'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // 1️⃣ Fetch ValorantStrike store page
            const storeUrl = 'https://valorantstrike.com/valorant-store/';
            const storeRes = await fetch(storeUrl);
            const storeHtml = await storeRes.text();
            const $ = cheerio.load(storeHtml);
            const COLLECTOR_TIMEOUT = 60000; // 60 seconds for button interactions
            // Create a map of skin names to skin objects
        

            // 2️⃣ Find the first div with class "et_pb_text_inner" that has a <p> inside
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

            // 3️⃣ Get the first <p> inside that div
            const pTag = parentDiv.find('p').first();
            if (!pTag || !pTag.text().trim()) {
                return interaction.editReply('Unable to fetch the current bundle information. Please try again later.');
            }

            const bundleName = pTag.text().trim();

            // 4️⃣ Fetch bundles, skins, and content tiers from Valorant API
            const [bundlesRes, skinsRes, tiersRes] = await Promise.all([
                fetch('https://valorant-api.com/v1/bundles'),
                fetch('https://valorant-api.com/v1/weapons/skins'),
                fetch('https://valorant-api.com/v1/contenttiers')
            ]);

            const bundleData = (await bundlesRes.json()).data;
            const skinsData = (await skinsRes.json()).data;
            const tiersData = (await tiersRes.json()).data;

            // 5️⃣ Map tier UUID to VP price
            const tierPriceMap = {};
            tiersData.forEach(tier => {
                if (tier.uuid) tierPriceMap[tier.uuid] = tier.price;
            });

            // 6️⃣ Match the bundle name with API
            const bundle = bundleData.find(b =>
                bundleName.toLowerCase().includes(b.displayName.toLowerCase()) ||
                b.displayName.toLowerCase().includes(bundleName.toLowerCase())
            );

            if (!bundle) {
                return interaction.editReply(`Unable to match the current bundle with our database. Please try again later.`);
            }

            // 7️⃣ Gather all skins in the bundle using API's content items
            let skinsInBundle = [];
            if (bundle.content?.items) {
                const skinUUIDs = bundle.content.items.map(item => item.uuid).filter(Boolean);
                skinsInBundle = skinsData
                    .filter(skin => skinUUIDs.includes(skin.uuid))
                    .map(skin => ({
                        ...skin,
                        price: skin.contentTierUuid ? tierPriceMap[skin.contentTierUuid] : 'N/A'
                    }));
            } else {
                // fallback: match by displayName (rare cases)
                skinsInBundle = skinsData
                    .filter(skin => skin.displayName.toLowerCase().includes(bundle.displayName.toLowerCase()))
                    .map(skin => ({
                        ...skin,
                        price: skin.contentTierUuid ? tierPriceMap[skin.contentTierUuid] : 'N/A'
                    }));
            }
                // Create a map of skin names to skin objects for button interactions
                const skinMap = {};
                skinsInBundle.forEach(skin => {
                skinMap[skin.displayName.toLowerCase()] = skin;
            });

            // 8️⃣ Send embed + buttons
            const message = await interaction.editReply({
                embeds: [createBundleEmbed(bundle, skinsInBundle)],
                components: createBundleButtons(skinsInBundle)
            });

            // 9️⃣ Handle skin button interactions
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
