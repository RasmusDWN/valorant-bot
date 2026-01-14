import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

import { fetchSkinByName } from '../utils/fetch_skin.js';
import { createBundleEmbed, createBundleButtons } from '../embeds/bundle.js';
import { createSkinEmbed } from '../embeds/skin.js';

export default {
    data: new SlashCommandBuilder()
        .setName('current-bundle')
        .setDescription('Show the current Valorant store bundle'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // 1️⃣ Fetch ValorantStrike store page
            const storeUrl = 'https://valorantstrike.com/valorant-store/';
            const storeRes = await fetch(storeUrl);
            const storeHtml = await storeRes.text();
            const $ = cheerio.load(storeHtml);

            // 2️⃣ Find the first div with class "et_pb_text_inner" that has a <p> inside
            let parentDiv = null;
            $('div.et_pb_text_inner').each((i, el) => {
                if ($(el).find('p').length > 0) {
                    parentDiv = $(el);
                    return false; // stop after first valid div
                }
            });

            if (!parentDiv) {
                return interaction.editReply('Could not find a container div with a <p>-tag inside 😢');
            }

            // 3️⃣ Get the first <p> inside that div
            const pTag = parentDiv.find('p').first();
            if (!pTag || !pTag.text().trim()) {
                return interaction.editReply('Could not find the featured bundle name inside the <p> 😢');
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
                return interaction.editReply(`Found "${bundleName}" in the <p>, but could not match it to a Valorant API bundle 😭`);
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

            // 8️⃣ Send embed + buttons
            const message = await interaction.editReply({
                embeds: [createBundleEmbed(bundle, skinsInBundle)],
                components: createBundleButtons(skinsInBundle)
            });

            // 9️⃣ Handle skin button interactions
            const collector = message.createMessageComponentCollector({ time: 60000 });
            collector.on('collect', async i => {
                if (!i.customId.startsWith('skin_')) return;

                const skinName = i.customId.replace('skin_', '').replaceAll('_', ' ');
                const skin = await fetchSkinByName(skinName.toLowerCase());

                const embedSkin = await createSkinEmbed(skin);

                // Add VP cost to skin embed
                if (skin.contentTierUuid && tierPriceMap[skin.contentTierUuid]) {
                    embedSkin.addFields({
                        name: 'Cost',
                        value: `${tierPriceMap[skin.contentTierUuid]} VP`,
                        inline: true
                    });
                }

                await i.reply({ embeds: [embedSkin] });
            });

        } catch (err) {
            console.error('Error fetching current bundle:', err);
            await interaction.editReply('An error occurred while fetching the current Valorant bundle 😢');
        }
    }
};
