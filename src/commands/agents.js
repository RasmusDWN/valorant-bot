import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { createAgentEmbed, createAbilityEmbed } from '../embeds/agent.js';

export default {
    data: new SlashCommandBuilder()
        .setName('agents')
        .setDescription('Lists all Valorant agents'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const response = await fetch('https://valorant-api.com/v1/agents');
            const data = await response.json();

            let agentList = data.data.filter(agent => agent.isPlayableCharacter);
            // Sort agents alphabetically by displayName
            agentList = agentList.sort((a, b) => a.displayName.localeCompare(b.displayName));

            const AGENTS_PER_PAGE = 5;
            let currentPage = 0;
            const totalPages = Math.ceil(agentList.length / AGENTS_PER_PAGE);

            const generateEmbed = (page) => {
                const start = page * AGENTS_PER_PAGE;
                const end = start + AGENTS_PER_PAGE;
                const agentsSlice = agentList.slice(start, end);
                return new EmbedBuilder()
                    .setTitle(`Valorant Agents (Page ${page + 1}/${totalPages})`)
                    .setColor('#ff4655')
                    .setDescription(agentsSlice.map(agent => agent.displayName).join('\n'));
            };

            const generateButtons = (page) => {
                const start = page * AGENTS_PER_PAGE;
                const end = start + AGENTS_PER_PAGE;
                const agentsSlice = agentList.slice(start, end);

                // First row: agent buttons
                const agentRow = new ActionRowBuilder().addComponents(
                    ...agentsSlice.map((agent, idx) =>
                        new ButtonBuilder()
                            .setCustomId(`agent_${start + idx}`)
                            .setLabel(agent.displayName)
                            .setStyle(ButtonStyle.Primary)
                    )
                );

                // Second row: pagination
                const navRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('⬅️ Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1)
                );

                return [agentRow, navRow];
            };

            const message = await interaction.editReply({
                embeds: [generateEmbed(currentPage)],
                components: generateButtons(currentPage)
            });

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return;

                // Pagination
                if (i.customId === 'prev') {
                    currentPage--;
                    return i.update({
                        embeds: [generateEmbed(currentPage)],
                        components: generateButtons(currentPage)
                    });
                }

                if (i.customId === 'next') {
                    currentPage++;
                    return i.update({
                        embeds: [generateEmbed(currentPage)],
                        components: generateButtons(currentPage)
                    });
                }

                // Agent selected
                if (i.customId.startsWith('agent_')) {
                    const agentIndex = parseInt(i.customId.split('_')[1]);
                    const agent = agentList[agentIndex];

                    const { embed, buttons } = createAgentEmbed(agent);

                    // Update original message with agent details
                    return i.update({
                        embeds: [embed],
                        components: [
                            new ActionRowBuilder().addComponents(
                                ...agent.abilities
                                    .map((ability, index) =>
                                        new ButtonBuilder()
                                            .setCustomId(`ability_${agentIndex}_${index}`)
                                            .setLabel(`${ability.slot}: ${ability.displayName}`)
                                            .setStyle(ButtonStyle.Secondary)
                                    )
                            )
                        ]
                    })
                }

                // Ability selected
                if (i.customId.startsWith('ability_')) {
                    const parts = i.customId.split('_'); // Ability, agentIndex, abilityIndex
                    const agentIndex = parseInt(parts[1]);
                    const abilityIndex = parseInt(parts[2]);

                    const agent = agentList[agentIndex];
                    const ability = agent.abilities[abilityIndex];

                    const abilityEmbed = createAbilityEmbed(ability, agent.displayName);

                    return i.reply({
                        embeds: [abilityEmbed],
                        ephemeral: true
                    })
                }
            });

        } catch (error) {
            console.error('Error fetching agents:', error);
            await interaction.editReply('Sorry, the agents must be sleeping... Please try again later.');
        }
    }
};
