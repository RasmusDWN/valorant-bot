import { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle  } from 'discord.js';
import fetch from 'node-fetch';

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

            const embed = new EmbedBuilder()
                .setTitle(`Newest Agent: ${newestAgent.displayName} | ${newestAgent.role.displayName}`)
                .setFooter({ text: `Released on: ${new Date(newestAgent.releaseDate).toLocaleDateString()}` })
                .setImage(newestAgent.fullPortrait || newestAgent.displayIcon)
                .setColor('#ff4655')
                .setDescription(newestAgent.description);

            // Add abilities
            const buttons = new ActionRowBuilder().addComponents(
                ...newestAgent.abilities
                    .filter(ability => ability.displayName)
                    .map((ability, index) =>
                        new ButtonBuilder()
                            .setCustomId(`ability_${index}`)
                            .setLabel(`${ability.slot}: ${ability.displayName}`)
                            .setStyle(ButtonStyle.Secondary)
                    )
            );

            const message = await interaction.editReply({ embeds: [embed], components: [buttons] });

            // Collector to handle button interactions
            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId.startsWith('ability_')) {
                    const index = parseInt(i.customId.replace('ability_', ''));
                    const ability = newestAgent.abilities[index];

                    const abilityEmbed = new EmbedBuilder()
                        .setTitle(`${ability.displayName} - ${newestAgent.displayName}`)
                        .setColor('#ff4655')
                        .setImage(ability.displayIcon)
                        .setDescription(ability.description);

                    await i.reply({ embeds: [abilityEmbed], ephemeral: true });
                }
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while fetching the agent data. Please try again later.');
        }
    }
}
