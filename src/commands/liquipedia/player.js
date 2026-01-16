import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { fetchLiquipediaImage } from '../../utils/fetch_image.js';
import { getCache, setCache } from '../../utils/cache.js';

export default {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Look up a Valorant player')
    .addStringOption(option =>
      option.setName('ign')
        .setDescription('The in-game name of the player')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const playerName = interaction.options.getString('ign');

    // Check cache first
    const cacheKey = `player-${playerName.toLowerCase()}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      await interaction.editReply(cachedData);
      return;
    }

    try {
      const response = await fetch(`https://api.liquipedia.net/api/v3/player?wiki=valorant&conditions=%5B%5Bpagename%3A%3A${encodeURIComponent(playerName)}%5D%5D`, {
        headers: {
          'accept': 'application/json',
          'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
        }
      });
      const data = await response.json();

      if (!data || !data.result || data.result.length === 0) {
        await interaction.editReply(`Player "${playerName}" not found. Please check the name and try again.`);
        return;
      }

      const player = data.result[0];

      const imageUrl = await fetchLiquipediaImage(player.pagename);

      const embed = new EmbedBuilder()
        .setTitle(player.pagename)
        .setColor(globalThis.VALORANT_RED)
        .setDescription(`[View on Liquipedia](https://liquipedia.net/valorant/${encodeURIComponent(player.pagename)})`)
        .setFooter({ text: 'Data source: Liquipedia', iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png' })
        .addFields(
          { name: 'Team', value: player.teampagename, inline: true },
          { name: 'Status', value: player.status, inline: true },
          { name: 'Nationality', value: player.nationality, inline: true },
          { name: 'Est. Earnings', value: String(player.earnings), inline: true }
        );

      if (imageUrl) {
        embed.setImage(imageUrl);
      }

      const replyPayload = { embeds: [embed] };

      // Cache the embed for future requests (cache for 1 hour)
      setCache(cacheKey, replyPayload, 1000 * 60 * 60);

      await interaction.editReply(replyPayload);
    } catch (error) {
      console.error(error);
      await interaction.editReply('There was an error while fetching the player data. Please try again later.');
    }
  }
}
