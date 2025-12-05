import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';


export default {
    data: new SlashCommandBuilder()
        .setName('currentseason')
        .setDescription('Get information about the current Valorant season'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const response = await fetch('https://valorant-api.com/v1/seasons');
            const data = await response.json();

            // If the season's endTime is in the future and the startTime is in the past, it's active
            const isActive = (season) => {
                const now = new Date();
                const startTime = new Date(season.startTime);
                const endTime = new Date(season.endTime);
                return startTime <= now && now <= endTime;
            }

            const currentSeason = data.data.find(isActive);

            if (!currentSeason) {
                await interaction.editReply('There is currently no active season in Valorant.');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(currentSeason.displayName)
                .setColor('#ff4655')
                .addFields(
                    { name: 'Start Time', value: new Date(currentSeason.startTime).toLocaleString(), inline: true },
                    { name: 'End Time', value: new Date(currentSeason.endTime).toLocaleString(), inline: true }
                )
                .setImage(currentSeason.displayIcon || null);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while fetching the current season data. Please try again later.');
        }
    }
};
