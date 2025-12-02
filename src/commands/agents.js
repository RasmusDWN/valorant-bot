import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';

export default {
    data: new SlashCommandBuilder()
        .setName('agents')
        .setDescription('Lists all Valorant agents'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const response = await fetch('https://valorant-api.com/v1/agents');
            const data = await response.json();

            const agents = data.data
                .filter(agent => agent.isPlayableCharacter)
                .map(agent => agent.displayName)
                .join(', ');

            await interaction.editReply(`Agents: ${agents}`);
        } catch (error) {
            console.error('Error fetching agents:', error);
            await interaction.editReply('Sorry, the agents must be sleeping... Please try again later.');
        }
    }
};