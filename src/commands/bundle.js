import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fetch from 'node-fetch';

import { fetchSkinByName } from '../utils/fetch_skin.js';
import { fetchWeaponFromSkin } from '../utils/weapons.js';
import { getTierName, getTierPrice } from '../utils/tiers.js';

import { createBundleEmbed, createBundleButtons } from '../embeds/bundle.js';

export default {
    data: new SlashCommandBuilder()
        .setName('bundle')
        .setDescription('View a specific Valorant bundle')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the bundle')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const name = interaction.options.getString('name');

        try {
            const [bundleRes, skinsRes] = await Promise.all([
                fetch('https://valorant-api.com/v1/bundles'),
                fetch('https://valorant-api.com/v1/weapons/skins')
            ]);

            const bundleData = (await bundleRes.json()).data;
            const skinsData = (await skinsRes.json()).data;

            // Find bundle by partial text match
            const bundle = bundleData.find(b =>
                b.displayName.toLowerCase().includes(name.toLowerCase())
            );

            if (!bundle) {
                return interaction.editReply(`No bundle found with name containing "${name}". Please check the name and try again.`);
            }

            // Filter skins that start with the same name as the bundle
            const skinsInBundle = skinsData.filter(skin =>
                skin.displayName.toLowerCase().startsWith(bundle.displayName.toLowerCase())
            );

            const message = await interaction.editReply({ embeds: [createBundleEmbed(bundle, skinsInBundle)], components: createBundleButtons(skinsInBundle) });

            // Handle button clicks
            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (!i.customId.startsWith('skin_')) return;

                const skinName = i.customId.replace("skin_", "").replaceAll("_", " "); // Extract skin name from customId
                const skin = await fetchSkinByName(skinName.toLowerCase());
                const weapon = await fetchWeaponFromSkin(skin);

                return i.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(skin.displayName)
                            .setColor('#ff4655')
                            .setThumbnail(weapon.displayIcon)
                            .addFields(
                                { name: 'Price', value: getTierPrice(skin.contentTierUuid), inline: true },
                                { name: 'Tier', value: getTierName(skin.contentTierUuid), inline: true },
                                { name: 'Chromas', value: (skin.chromas?.length || 0).toString(), inline: true }
                            )
                            .setImage(skin.fullRender ?? skin.displayIcon ?? null)
                    ]
                });
            });
        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while fetching bundle data. Please try again later.');
        }
    }
};
