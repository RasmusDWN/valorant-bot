import { SlashCommandBuilder } from 'discord.js';

import fetch from 'node-fetch';

import { createSkinEmbed } from '../embeds/skin.js';

export default {
    data: new SlashCommandBuilder()
        .setName('randomskin')
        .setDescription('Get a random Valorant skin'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const response = await fetch('https://valorant-api.com/v1/weapons');
            const data = await response.json();

            // Filter weapons that have skins
            const weaponsWithSkins = data.data.filter(weapon => weapon.skins && weapon.skins.length > 0);

            // Pick a random weapon
            const weapon = weaponsWithSkins[Math.floor(Math.random() * weaponsWithSkins.length)];

            // pick a random skin from that weapon
            const skin = weapon.skins[Math.floor(Math.random() * weapon.skins.length)];

            const embed = await createSkinEmbed(skin);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while fetching the random skin. Please try again later.');
        }
    }
};
