import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';

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

            const embed = new EmbedBuilder()
                .setTitle(agent.displayName)
                .setImage(agent.fullPortrait || agent.displayIcon)
                .setColor('#ff4655')
                .setDescription(agent.description);

            // Add abilities
            agent.abilities.forEach(ability => {
                if (ability.displayName) {
                    embed.addFields({
                        name: ability.displayName,
                        value: ability.description,
                        inline: true
                    });
                }
            });

            // Add allvalorant.gg link
            embed.addFields({
                name: 'More Info',
                value: `View on allvalorant.gg => https://allvalorant.gg/`
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Sorry, the agents must be sleeping... Please try again later.');
        }
    }
};
