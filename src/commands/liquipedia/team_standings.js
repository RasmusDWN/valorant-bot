import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { getCache, setCache } from '../../utils/cache.js';

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

// Fetch team by name
async function fetchTeam(teamName) {
  const response = await fetch(`https://api.liquipedia.net/api/v3/team?wiki=valorant&conditions=%5B%5Bname%3A%3A${encodeURIComponent(teamName)}%5D%5D`, {
    headers: {
      'accept': 'application/json',
      'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
    }
  });
  const data = await response.json();

  if (!data || !data.result || data.result.length === 0) {
    return null;
  }

  return data.result[0];
}

// Fetch recent matches for a team (last 3 months)
async function fetchTeamMatches(teamName) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const dateStr = threeMonthsAgo.toISOString().split('T')[0];

  // Add team-specific condition to API query
  // Try opponent first, fallback to name if needed
  const teamCondition = `[[opponent::${teamName}]]`;
  const conditions = encodeURIComponent(`[[date::>${dateStr}]] AND [[finished::1]] AND ${teamCondition}`);

  let data;
  let response;
  try {
    response = await fetch(`https://api.liquipedia.net/api/v3/match?wiki=valorant&conditions=${conditions}&limit=50&order=date%20DESC`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
      }
    });
    if (!response.ok) {
      console.error(`Liquipedia API error: ${response.status} ${response.statusText}`);
      if (response.status === 500) {
        return { apiError: true };
      }
      return null;
    }
    data = await response.json();
  } catch (err) {
    console.error('Error fetching or parsing Liquipedia match data:', err);
    return null;
  }

  if (!data || !data.result) {
    return null;
  }

  // No need to filter locally, API should return only relevant matches
  return data.result;
}

// Group matches by tournament and determine wins/losses
function groupMatchesByTournament(matches, teamName) {
  if (!matches || matches.length === 0) return null;

  // Helper to check if a team name matches
  const isTeamMatch = (name) => {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    return lowerName === teamName.toLowerCase();
  };

  // Group matches by tournament
  const tournaments = {};

  for (const match of matches) {
    // Skip matches without valid opponents
    if (!match.match2opponents || match.match2opponents.length < 2) continue;

    // Only include matches where the team participated
    const team1Name = match.match2opponents[0]?.name || '';
    const team2Name = match.match2opponents[1]?.name || '';
    if (!isTeamMatch(team1Name) && !isTeamMatch(team2Name)) continue;

    const tournamentName = match.tournament || match.pagename || 'Unknown Tournament';

    if (!tournaments[tournamentName]) {
      tournaments[tournamentName] = {
        name: tournamentName,
        matches: [],
        latestDate: null
      };
    }

    const matchDate = match.date ? new Date(match.date) : null;

    // Track the latest match date for this tournament
    if (matchDate && (!tournaments[tournamentName].latestDate || matchDate > tournaments[tournamentName].latestDate)) {
      tournaments[tournamentName].latestDate = matchDate;
    }

    tournaments[tournamentName].matches.push(match);
  }

  // Find the most recent tournament
  let selectedTournament = null;

  for (const data of Object.values(tournaments)) {
    if (data.matches.length > 0) {
      if (!selectedTournament || data.latestDate > selectedTournament.latestDate) {
        selectedTournament = data;
      }
    }
  }

  if (!selectedTournament) return null;

  // Determine if tournament is "ongoing" - if last match was within the past 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const isOngoing = selectedTournament.latestDate && selectedTournament.latestDate > twoWeeksAgo;

  // Calculate wins and losses
  let wins = 0;
  let losses = 0;

  for (const match of selectedTournament.matches) {
    const team1 = match.match2opponents[0];
    const team2 = match.match2opponents[1];

    const isTeam1 = isTeamMatch(team1?.name);
    const isTeam2 = isTeamMatch(team2?.name);

    if (!isTeam1 && !isTeam2) continue;

    // Check if match is finished
    const isFinished = match.finished === '1' || match.finished === 1 || match.winner;

    if (!isFinished) continue;

    // Determine winner based on match2opponents scores or status
    let teamWon = false;

    if (match.winner !== undefined && match.winner !== null) {
      if ((isTeam1 && (match.winner === 1 || match.winner === '1')) ||
          (!isTeam1 && (match.winner === 2 || match.winner === '2'))) {
        teamWon = true;
      } else {
        teamWon = false;
      }
    } else {
      // Fallback to score comparison
      const score1 = parseInt(team1?.score) || 0;
      const score2 = parseInt(team2?.score) || 0;
      if (score1 > score2) teamWon = true;
      else if (score2 > score1) teamWon = true;
    }

    if (teamWon) {
      wins++;
    } else {
      losses++;
    }
  }

  return {
    tournament: selectedTournament.name,
    wins,
    losses,
    isOngoing,
    matches: selectedTournament.matches
  };
}

// Build description with tournament info
function buildDescription(tournamentName, isOngoing) {
  const cleanName = formatTournamentName(tournamentName);
  const tournamentLink = `[${cleanName}](https://liquipedia.net/valorant/${encodeURIComponent(tournamentName)})`;

  if (isOngoing) {
    return `**Current Tournament:** ${tournamentLink}`;
  } else {
    return `**No ongoing tournament**\nShowing results from: ${tournamentLink}`;
  }
}

// Format tournament name for display
function formatTournamentName(pagename) {
  if (!pagename) return 'Unknown Tournament';

  // Replace underscores with spaces and clean up
  return pagename
    .replace(/_/g, ' ')
    .replace(/\//g, ' - ');
}

// Build recent results string
function buildRecentResults(matches, teamName) {
  if (!matches || matches.length === 0) return null;

  // Helper to check if a team name matches
  const isTeamMatch = (name) => {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    return lowerName === teamName.toLowerCase();
  };

  // Sort by date descending and take up to 5
  const sortedMatches = [...matches]
    .filter(m => {
      if (!m.match2opponents || m.match2opponents.length < 2) return false;
      return m.finished === '1' || m.finished === 1 || m.winner;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (sortedMatches.length === 0) return null;

  const results = sortedMatches.map(match => {
    const team1 = match.match2opponents[0];
    const team2 = match.match2opponents[1];

    const isTeam1 = isTeamMatch(team1?.name);

    const opponentName = isTeam1 ? (team2?.name || 'Unknown') : (team1?.name || 'Unknown');
    const teamScore = isTeam1 ? (team1?.score ?? '?') : (team2?.score ?? '?');
    const opponentScore = isTeam1 ? (team2?.score ?? '?') : (team1?.score ?? '?');

    // Determine result emoji
    let resultEmoji = '🔸'; // Draw/unknown
    if (match.winner !== undefined && match.winner !== null) {
      if ((isTeam1 && (match.winner === 1 || match.winner === '1')) ||
          (!isTeam1 && (match.winner === 2 || match.winner === '2'))) {
        resultEmoji = '✅';
      } else {
        resultEmoji = '❌';
      }
    } else {
      // Fallback to score comparison
      const score1 = parseInt(teamScore) || 0;
      const score2 = parseInt(opponentScore) || 0;
      if (score1 > score2) resultEmoji = '✅';
      else if (score2 > score1) resultEmoji = '❌';
    }

    return `${resultEmoji} vs ${opponentName}: **${teamScore}** - ${opponentScore}`;
  });

  return results.join('\n');
}
