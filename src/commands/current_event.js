import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';


export default {
    data: new SlashCommandBuilder()
        .setName('currentevent')
        .setDescription('Get information about the current Valorant event'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const response = await fetch('https://valorant-api.com/v1/events');
            const data = await response.json();

            // If the event's endTime is in the future and the startTime is in the past, it's active
            const isActive = (event) => {
                const now = new Date();
                const startTime = new Date(event.startTime);
                const endTime = new Date(event.endTime);
                return startTime <= now && now <= endTime;
            }

            const currentEvent = data.data.find(isActive);

            if (!currentEvent) {
                await interaction.editReply('There is currently no active event in Valorant.');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(currentEvent.displayName)
                .setColor('#ff4655')
                .setDescription(currentEvent.shortDisplayName || 'No description available.')
                .addFields(
                    { name: 'Start Time', value: new Date(currentEvent.startTime).toLocaleString(), inline: true },
                    { name: 'End Time', value: new Date(currentEvent.endTime).toLocaleString(), inline: true }
                )
                .setImage(currentEvent.displayIcon || null);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while fetching the current event data. Please try again later.');
        }
    }
};
