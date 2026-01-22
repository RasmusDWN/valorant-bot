import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { getCache, setCache } from '../../utils/cache.js';

// /team #{team-name}
//
// Look up a Valorant team via Liquipedia API

// TODO:
// - Better display roster (only include actual player roster, add links, better format as table, etc.)
// - Somehow include recent results and perhpas overall results
// - team tier list?
export default {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Look up a Valorant team')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the team')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const teamName = interaction.options.getString('name');

    // Check cache first
    const cacheKey = `team-${teamName.toLowerCase()}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      await interaction.editReply(cachedData);
      return;
    }

    try {
      const response = await fetch(`https://api.liquipedia.net/api/v3/team?wiki=valorant&conditions=%5B%5Bname%3A%3A${encodeURIComponent(teamName)}%5D%5D`, {
        headers: {
          'accept': 'application/json',
          'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
        }
      });
      const data = await response.json();

      if (!data || !data.result || data.result.length === 0) {
        await interaction.editReply(`Team "${teamName}" not found. Please check the name and try again.`);
        return;
      }

      const team = data.result[0];
      const teamLogo = team.logourl || team.logodarkurl || team.textlesslogourl || '';
      const roster = await fetchActiveRoster(team);

      const embed = new EmbedBuilder()
        .setTitle(team.name)
        .setColor(globalThis.VALORANT_RED)
        .setDescription(`[View on Liquipedia](https://liquipedia.net/valorant/${encodeURIComponent(team.name)})`)
        .setFooter({ text: 'Data source: Liquipedia', iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png' });

      embed.addFields(
        { name: 'Status', value: team.status || 'Unknown', inline: true },
        { name: 'Region', value: team.region || 'Unknown', inline: true },
        { name: 'Active Roster', value: roster, inline: true }
      );

      if (teamLogo) {
        embed.setImage(teamLogo);
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

// Fetches every player's names in the Team's active roster
async function fetchActiveRoster(team) {
    const teamPagename = team.pagename;

    try {
      const response = await fetch(`https://api.liquipedia.net/api/v3/player?wiki=valorant&conditions=%5B%5Bteampagename%3A%3A${encodeURIComponent(teamPagename)}%5D%5D`, {
        headers: {
          'accept': 'application/json',
          'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
        }
      });
      const data = await response.json();

      if (!data || !data.result || data.result.length === 0) {
        return 'None';
      }

      const names = data.result.map(player => player.pagename).filter(Boolean);
      return names.length > 0 ? names.join(', ') : 'None';
    } catch (error) {
      console.error(`Error fetching roster for team ${teamPagename}:`, error);
      return 'None';
    }
}