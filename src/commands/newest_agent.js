import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { createAbilityEmbed, createAgentEmbed } from '../embeds/agent.js';

// /newestagent
//
// Fetches and displays information about the newest Valorant agent.
export default {
    data: new SlashCommandBuilder()
        .setName('newestagent')
        .setDescription('See the newest Valorant agent'),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const response = await fetch('https://valorant-api.com/v1/agents');
            const data = await response.json();

            const newestAgent = data.data
                .filter(agent => agent.isPlayableCharacter)
                .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))[0];

            const { embed, buttons } = createAgentEmbed(newestAgent);

            const message = await interaction.editReply({ embeds: [embed], components: [buttons] });

            // Collector to handle button interactions
            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId.startsWith('ability_')) {
                    const index = parseInt(i.customId.replace('ability_', ''));
                    const ability = newestAgent.abilities[index];

                    const abilityEmbed = createAbilityEmbed(ability, newestAgent.displayName);

                    await i.reply({ embeds: [abilityEmbed], ephemeral: true });
                }
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while fetching the agent data. Please try again later.');
        }
    }
}
