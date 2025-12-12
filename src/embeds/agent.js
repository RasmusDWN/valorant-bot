import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export function createAgentEmbed(agent) {
    const embed = new EmbedBuilder()
        .setTitle(agent.displayName)
        .setImage(agent.fullPortrait || agent.displayIcon)
        .setColor('#ff4655')
        .setDescription(agent.description)
        .setFooter({ text: `Released on: ${new Date(agent.releaseDate).toLocaleDateString()}` });

    // Add abilities
    const buttons = new ActionRowBuilder().addComponents(
      ...agent.abilities
          .filter(ability => ability.displayName)
          .map((ability, index) =>
              new ButtonBuilder()
                  .setCustomId(`ability_${index}`)
                  .setLabel(`${ability.slot}: ${ability.displayName}`)
                  .setStyle(ButtonStyle.Secondary)
          )
    );

    return { embed, buttons };
}

export function createAbilityEmbed(ability, agentName) {
     return new EmbedBuilder()
        .setTitle(`${ability.displayName} - ${agentName}`)
        .setColor('#ff4655')
        .setImage(ability.displayIcon)
        .setDescription(ability.description);
}
