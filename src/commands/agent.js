import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { createAbilityEmbed, createAgentEmbed } from '../embeds/agent.js';

// /agent #{agent-name}
//
// Fetches and displays information about a specific Valorant agent.
export default {
    data: new SlashCommandBuilder()
        .setName('agent')
        .setDescription('Get information about a specific Valorant agent')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The agent name')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const agentName = interaction.options.getString('name').toLowerCase();

        try {
            const response = await fetch('https://valorant-api.com/v1/agents');
            const data = await response.json();

            const agent = data.data.find(agent =>
                agent.isPlayableCharacter &&
                agent.displayName.toLowerCase() === agentName
            );

            if (!agent) {
                await interaction.editReply(`Agent "${agentName}" not found. Please check the name and try again.`);
                return;
            }

            const { embed, buttons } = createAgentEmbed(agent);

            const message = await interaction.editReply({ embeds: [embed], components: [buttons] });

            // Collector to handle button interactions
            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId.startsWith('ability_')) {
                    const index = parseInt(i.customId.replace('ability_', ''));
                    const ability = agent.abilities[index];

                    const abilityEmbed = createAbilityEmbed(ability, agent.displayName);

                    await i.reply({ embeds: [abilityEmbed], ephemeral: true });
                }
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('Sorry, the agents must be sleeping... Please try again later.');
        }
    }
};
