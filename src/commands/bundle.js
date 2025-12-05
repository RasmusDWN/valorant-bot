import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fetch from 'node-fetch';

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

        try {
            const name = interaction.options.getString('name');
            const response = await fetch('https://valorant-api.com/v1/bundles');
            const data = await response.json();
            const bundles = data.data;

            // Find bundle by partial name match
            const bundle = bundles.find(b =>
                b.displayName.toLowerCase().includes(name.toLowerCase())
            );

            if (!bundle) {
                return interaction.editReply(`No bundle found with name containing "${name}". Please check the name and try again.`);
            }

            const embed = new EmbedBuilder()
                .setTitle(bundle.displayName)
                .setColor('#ff4656')
                .setImage(bundle.displayIcon);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while fetching bundle data. Please try again later.');
        }
    }
};
