import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { getCache, setCache } from '../../utils/cache.js';
import { findTournamentByName } from '../../utils/tournaments.js';

// /tournamentresults
//
// View recent results from Valorant tournaments via Liquipedia API
export default {
  data: new SlashCommandBuilder()
    .setName('tournamentresults')
    .setDescription('View recent tournament results')
    .addStringOption(option =>
      option.setName('tournament')
        .setDescription('The name of the tournament to view results for')
        .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('stage')
        .setDescription('The stage of the tournament to view results for')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userInput = interaction.options.getString('tournament');
    const stageInput = interaction.options.getString('stage').toLowerCase();

    // Check cache first
    const cacheKey = `tournament-results-${userInput.toLowerCase()}-${stageInput}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      await interaction.editReply(cachedData);
      return;
    }

    try {
        const tournament = await findTournamentByName(userInput);
        console.log('User input:', userInput);
        console.log('Matched tournament:', tournament ? tournament.name : null);
        if (!tournament) {
            await interaction.editReply(`Tournament "${userInput}" not found. Please check the name and try again.`);
            return;
        }

        const response = await fetch(`https://api.liquipedia.net/api/v3/match?wiki=valorant&conditions=%5B%5Btournament%3A%3A${encodeURIComponent(tournament.name)}%5D%5D&limit=50&order=date DESC`, {
            headers: {
            'accept': 'application/json',
            'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
            }
        });
        console.log('response:', response);
        const data = await response.json();
        console.log('data:', data);
        if (!data || !data.result || data.result.length === 0) {
            console.log('No matches found for tournament:', tournament.name);
            await interaction.editReply(`Tournament "${tournament.name}" not found. Please check the name and try again.`);
            return;
        }

        // Log all tournament names in the match results for debugging
        console.log('Tournament names in match results:', data.result.map(m => m.tournament));

        const matches = data.result
            .filter(isCompletedMatch)
            .filter(match => {
                const inSection = matchInSection(match, stageInput);
                if (inSection) {
                    console.log('Match in section:', match.tournament, match.extradata?.matchsection, match.match2bracketdata?.bracketsection, match.section);
                }
                return inSection;
            });

        if (matches.length === 0) {
            console.log('No completed matches found for tournament', tournament.name, 'in stage', stageInput);
            await interaction.editReply(`No completed matches found for tournament "${tournament.name}" in stage "${stageInput}".`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Recent Tournament Results')
            .setDescription(`**${tournament.name}**\nSection: ${stageInput}\n ([View on Liquipedia](https://liquipedia.net/valorant/${encodeURIComponent(tournament.name)}))`)
            .setColor(globalThis.VALORANT_RED)
            .setFooter({
                text: 'Data source: Liquipedia',
                iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png'
            })

        for (const match of matches) {
            const [team1, team2] = match.match2opponents;

            const date = new Date(match.date).toLocaleDateString('en-GB');

            embed.addFields({
                name: `${team1.name} ${team1.score} vs ${team2.score} ${team2.name}`,
                value: `${date} • ${match.extradata?.matchsection ?? 'Unknown stage'}`,
            });
        }

        const payload = { embeds: [embed] };
        setCache(cacheKey, { embeds: [embed] }, 1000 * 60 * 60); // Cache for 1 hour

        await interaction.editReply(payload);
    } catch (error) {
        console.error(error);
        await interaction.editReply('There was an error while fetching the tournament results. Please try again later.');
    }
  }
};

function isCompletedMatch(match) {
    if (!match.finished) return false;

    const opponents = match.match2opponents;

    if (!opponents || opponents.length < 2) return false;

    const team1Score = opponents[0]?.score;
    const team2Score = opponents[1]?.score;

    // Scores must exist and not both be 0
    if (team1Score !== undefined && team2Score !== undefined) {
        if (team1Score > 0 || team2Score > 0) {
            return true;
        }
    }

    return false;
}

function matchInSection(match, sectionInput) {
    const fields = [
        match.extradata?.matchsection,
        match.match2bracketdata?.bracketsection,
        match.section,
    ]
    .filter(Boolean)
    .map(field => field.toLowerCase());

    return fields.some(field => field.includes(sectionInput));
}
