import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { getCache, setCache } from '../../utils/cache.js';

// /transfers
//
// Show the 5 latest Valorant player transfers from Liquipedia
export default {
  data: new SlashCommandBuilder()
    .setName('transfers')
    .setDescription('Show the 5 latest Valorant player transfers'),

  async execute(interaction) {
    await interaction.deferReply();

    // Check cache first
    const cacheKey = 'latest-transfers';
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      await interaction.editReply(cachedData);
      return;
    }

    try {
      const response = await fetch('https://api.liquipedia.net/api/v3/transfer?wiki=valorant&limit=5&order=date%20DESC', {
        headers: {
          'accept': 'application/json',
          'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
        }
      });

      const data = await response.json();

      if (!data || !data.result || data.result.length === 0) {
        await interaction.editReply('No recent transfers found.');
        return;
      }

      const transfers = data.result;

      const embed = new EmbedBuilder()
        .setTitle('Latest Valorant Transfers')
        .setColor(globalThis.VALORANT_RED)
        .setFooter({ text: 'Data source: Liquipedia', iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png' });

      for (const transfer of transfers) {
        const playerName = transfer.player || 'Unknown';
        const fromTeam = transfer.fromteam || 'N/A';
        const toTeam = transfer.toteam || 'N/A';
        const date = transfer.date ? new Date(transfer.date).toLocaleDateString('en-GB') : 'Unknown';
        const role = transfer.role || '';

        let transferDirection;
        if (fromTeam === 'N/A' || fromTeam === '') {
          transferDirection = `➡️ Joined **${toTeam}**`;
        } else if (toTeam === 'N/A' || toTeam === '') {
          transferDirection = `⬅️ Left **${fromTeam}**`;
        } else {
          transferDirection = `**${fromTeam}** ➡️ **${toTeam}**`;
        }

        embed.addFields({
          name: playerName,
          value: [
            transferDirection,
            role ? `**Role:** ${role}` : null,
            `**Date:** ${date}`
          ].filter(Boolean).join('\n'),
        });
      }

      const replyPayload = { embeds: [embed] };

      // Cache the response for 30 minutes (transfers update frequently)
      setCache(cacheKey, replyPayload, 1000 * 60 * 30);

      await interaction.editReply(replyPayload);
    } catch (error) {
      console.error(error);
      await interaction.editReply('There was an error while fetching transfer data. Please try again later.');
    }
  }
}
