import { SlashCommandBuilder } from 'discord.js';

import { fetchSkinByName } from '../utils/fetch_skin.js';

import { createSkinEmbed } from '../embeds/skin.js';

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

            const embed = await createSkinEmbed(skin);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while fetching the skin data. Please try again later.');
        }
    }
};
