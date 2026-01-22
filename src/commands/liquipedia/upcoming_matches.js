import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { getCache, setCache } from '../../utils/cache.js';
import { filterMatchesByTournament } from '../../utils/tournament_search.js';


// TODOS:
// - Paginate if more than 5 matches
// - Allow filtering by team
// - Link to Liquipedia match page
// - Show Tournament Logo
// - Show Team Logos
// - Better date formatting
// - Fix Stream URL extraction

// /upcomingmatches
//
// Show upcoming Valorant matches from Liquipedia
export default {
  data: new SlashCommandBuilder()
    .setName('upcomingmatches')
    .setDescription('Show upcoming Valorant matches for a tournament')
    .addStringOption(option =>
      option.setName('tournament')
        .setDescription('The name of the tournament (e.g. VCT Americas)')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const tournamentQuery = interaction.options.getString('tournament');

    // Check cache first
    const cacheKey = `upcoming-matches-${tournamentQuery.toLowerCase()}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      await interaction.editReply(cachedData);
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

      const response = await fetch(`https://api.liquipedia.net/api/v3/match?wiki=valorant&conditions=%5B%5Bdate%3A%3A%3E${today}%5D%5D&groupby=date%20ASC&rawstreams=false&streamurls=true`, {
        headers: {
          'accept': 'application/json',
          'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
        }
      });

      const data = await response.json();

      const matches = filterMatchesByTournament(data.result, tournamentQuery).slice(0, 5); // Get next 5 matches for the tournament

      if (!matches || matches.length === 0) {
        await interaction.editReply(`No upcoming matches found for **${tournamentQuery}**.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Upcoming Valorant Matches')
        .setDescription(`Upcoming matches for tournaments matching "**${tournamentQuery}**"`)
        .setColor(globalThis.VALORANT_RED)
        .setFooter({ text: 'Data source: Liquipedia', iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png' });


      for (const match of matches) {
        const startTime = new Date(match.date).toLocaleString('en-GB', {
          timeZone: 'CET'
        });

        const team1 = match.match2opponents[0]?.name || 'TBD';
        const team2 = match.match2opponents[1]?.name || 'TBD';
        const streamUrl = match.streams?.[0]?.url;

        embed.addFields({
          name: `${team1} vs ${team2}`,
          value: [
            `**Tournament:** ${match.shortname || match.tournament}`,
            `**Start:** ${startTime} CET`,
            streamUrl ? `[Watch here](${streamUrl})` : 'Stream: N/A',
          ].join('\n'),
        })
      };      

      // Cache the response for 1 hour
      setCache(cacheKey, { embeds: [embed] }, 1000 * 60 * 60);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('There was an error while fetching upcoming matches. Please try again later.');
    }
  }
}

function buildTournamentSearchIndex(match) {
  return [
    match.tournament,
    match.shortname,
    match.parent,
    match.series
  ].filter(Boolean).join(' ').toLowerCase();
}