import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fetch from 'node-fetch';

import { fetchSkinByName } from '../utils/fetch_skin.js';
import { fetchWeaponFromSkin } from '../utils/weapons.js';
import { getTierName, getTierPrice } from '../utils/tiers.js';

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

            const embed = new EmbedBuilder()
                .setTitle(bundle.displayName)
                .setColor('#ff4656')
                .setImage(bundle.displayIcon)
                .setDescription(
                    skinsInBundle.length > 0
                        ? 'Skins in this bundle:\n' + skinsInBundle.map(skin => `- ${skin.displayName}`).join('\n')
                        : 'No skins found for this bundle.'
                )


            // Create buttons for each skin, split into rows of max 5
            const rows = [];
            for (let i = 0; i < skinsInBundle.length; i += 5) {
                rows.push(
                    new ActionRowBuilder().addComponents(
                        ...skinsInBundle.slice(i, i + 5).map(skin =>
                            new ButtonBuilder()
                                .setCustomId(`skin_${skin.displayName.replaceAll(" ", "_")}`)
                                .setLabel(skin.displayName)
                                .setStyle(ButtonStyle.Primary)
                        )
                    )
                );
            }

            const message = await interaction.editReply({ embeds: [embed], components: rows });

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
