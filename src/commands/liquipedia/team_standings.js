import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

import { getCache, setCache } from '../../utils/cache.js';

import { fetchTeam, fetchTeamMatches, groupMatchesByTournament, buildDescription, buildRecentResults } from '../../utils/team_standings.js'

// /team-standings #{team-name}
//
// Look up a Valorant team's wins and losses in their current or most recent tournament
export default {
  data: new SlashCommandBuilder()
    .setName('team-standings')
    .setDescription('Look up a team\'s wins and losses in their current or most recent tournament')
    .addStringOption(option =>
      option.setName('team')
        .setDescription('The name of the team')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const teamName = interaction.options.getString('team');

    // Check cache first
    const cacheKey = `team-standings-${teamName.toLowerCase()}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      await interaction.editReply(cachedData);
      return;
    }

    try {
      // First, find the team to get the correct pagename
      const team = await fetchTeam(teamName);
      if (!team) {
        await interaction.editReply(`Team "${teamName}" not found. Please check the name and try again.`);
        return;
      }

      // Fetch recent matches for this team
      const matches = await fetchTeamMatches(team.name);
      if (!matches || matches.length === 0) {
        await interaction.editReply(`No recent tournament matches found for "${team.name}".`);
        return;
      }

      if (matches && matches.apiError) {
        await interaction.editReply('Liquipedia API is currently experiencing issues (500 Internal Server Error). Please try again later.');
        return;
      }

      // Group matches by tournament and find the most recent one
      const tournamentData = groupMatchesByTournament(matches, team.name);

      if (!tournamentData) {
        await interaction.editReply(`No tournament data found for "${team.name}".`);
        return;
      }

      const { tournament, wins, losses, isOngoing, matches: tournamentMatches } = tournamentData;
      const teamLogo = team.logourl || team.logodarkurl || team.textlesslogourl || '';

      // Build the embed
      const embed = new EmbedBuilder()
        .setTitle(`${team.name} - Tournament Standings`)
        .setColor(globalThis.VALORANT_RED)
        .setDescription(buildDescription(tournament, isOngoing))
        .setFooter({ text: 'Data source: Liquipedia', iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png' });

      // Add record field
      const record = `**${wins}** - **${losses}**`;
      const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';

      embed.addFields(
        { name: 'Record (W-L)', value: record, inline: true },
        { name: 'Win Rate', value: `${winRate}%`, inline: true },
        { name: 'Matches Played', value: `${wins + losses}`, inline: true }
      );

      // Add recent match results (up to 5)
      const recentResults = buildRecentResults(tournamentMatches, team.name);
      if (recentResults) {
        embed.addFields({ name: 'Recent Results', value: recentResults, inline: false });
      }

      if (teamLogo) {
        embed.setThumbnail(teamLogo);
      }

      const replyPayload = { embeds: [embed] };

      // Cache for 15 minutes (standings change more frequently)
      setCache(cacheKey, replyPayload, 1000 * 60 * 15);

      await interaction.editReply(replyPayload);
    } catch (error) {
      console.error(error);
      await interaction.editReply('There was an error while fetching team standings. Please try again later.');
    }
  }
}