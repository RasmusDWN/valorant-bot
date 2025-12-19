import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

export default {
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Look up a Valorant map')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The map name (e.g. "Ascent")')
        .setRequired(true)
    ),

    async execute(interaction) {
      await interaction.deferReply();

      const mapName = interaction.options.getString('name').toLowerCase();

      try {
        const response = await fetch('https://valorant-api.com/v1/maps');
        const data = await response.json();
        const maps = data.data;

        const map = maps.find(map =>
          map.displayName.toLowerCase() === mapName
        );

        if (!map) {
          await interaction.editReply(`Map "${mapName}" not found. Please check the name and try again.`);
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle(map.displayName)
          .setColor(globalThis.VALORANT_RED)
          .setThumbnail(map.splash || map.listViewIconTall || null)
          .setImage(map.displayIcon || null)
          .addFields(
            { name: 'Coordinates', value: map.coordinates || 'Unknown', inline: true },
            { name: 'Sites', value: map.tacticalDescription || '', inline: false },
          )

          await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        await interaction.editReply('There was an error while fetching the map data. Please try again later.');
      }
    }
};
