import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { fetchSkinByName } from '../utils/fetch_skin.js';
import { fetchWeaponFromSkin } from '../utils/weapons.js';
import { getTierName, getTierPrice } from '../utils/tiers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skin')
        .setDescription('Look up a skin')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The skin name (e.g. "Reaver Vandal")')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const skinName = interaction.options.getString('name').toLowerCase();

        try {
            const skin = await fetchSkinByName(skinName);

            if (!skin) {
                await interaction.editReply(`Skin "${skinName}" not found. Please check the name and try again.`);
                return;
            }

            const weapon = await fetchWeaponFromSkin(skin);
            const weaponName = weapon.displayName;
            const chromas = skin.chromas?.length || 0;

            const tier = skin.contentTierUuid
                ? getTierName(skin.contentTierUuid)
                : 'Unknown';

            const price = getTierPrice(skin.contentTierUuid);

            const embed = new EmbedBuilder()
                .setTitle(weaponName)
                .setColor('#ff4655')
                .setThumbnail(weapon?.displayIcon || null)
                .addFields(
                    { name: 'Price', value: price, inline: true },
                    { name: 'Tier', value: tier, inline: true },
                    { name: 'Chromas', value: chromas.toString(), inline: true }
                )
                .setImage(skin.fullRender || skin.displayIcon || null);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while fetching the skin data. Please try again later.');
        }
    }
};
