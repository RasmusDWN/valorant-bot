import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

import fetch from 'node-fetch';

import { filterPastMatchesByTournament } from '../../utils/tournament_search.js';
import { buildTournamentResults } from '../../utils/team_standings.js';
import { getCache, setCache } from '../../utils/cache.js';

// /tournament-results {tournament-name}
// Look up recent results for a given tournament
export default {
    data: new SlashCommandBuilder()
        .setName('tournament-results')
        .setDescription('Look up recent results for a tournament')
        .addStringOption(option =>
        option.setName('tournament')
            .setDescription('The name of the tournament')
            .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const tournamentName = interaction.options.getString('tournament');

        // Cache results
        const cacheKey = `tournament-results-${tournamentName.toLowerCase()}`;
        const cachedData = getCache(cacheKey);
        if (cachedData) {
        await interaction.editReply(cachedData);
        return;
        }

        try {
        // Fetch recent finished matches (last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const dateStr = threeMonthsAgo.toISOString().split('T')[0];
        const conditions = encodeURIComponent(`[[date::>${dateStr}]] AND [[finished::1]]`);
        const response = await fetch(`https://api.liquipedia.net/api/v3/match?wiki=valorant&conditions=${conditions}&limit=200&order=date%20DESC`, {
            headers: {
            'accept': 'application/json',
            'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
            }
        });
        if (!response.ok) {
            await interaction.editReply('Liquipedia API is currently experiencing issues. Please try again later.');
            return;
        }
        const data = await response.json();
        if (!data || !data.result || data.result.length === 0) {
            await interaction.editReply(`No recent matches found for tournament "${tournamentName}".`);
            return;
        }

        // Use tournament_search utils to filter and rank
        const filtered = filterPastMatchesByTournament(data.result, tournamentName);
        if (!filtered || filtered.length === 0) {
            await interaction.editReply(`No recent matches found for tournament "${tournamentName}".`);
            return;
        }

        const tournamentMatch = filtered[0];
        const tournamentObj = {
            name: tournamentMatch.tournament,
            logo: tournamentMatch.icondarkurl || tournamentMatch.iconurl
        };

        // Build embed with formatted results
        const embed = new EmbedBuilder()
            .setTitle(`Recent Results - ${tournamentName}`)
            .setColor(globalThis.VALORANT_RED)
            .setFooter({ text: 'Data source: Liquipedia', iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png' });

        if (tournamentObj.logo) {
            embed.setThumbnail(tournamentObj.logo)
        };

        const resultsString = buildTournamentResults(filtered);
        embed.setDescription(
            `[View on Liquipedia](https://liquipedia.net/valorant/S-Tier_Tournaments)\n\n` +
            (resultsString || 'No results found.')
        );

        const replyPayload = { embeds: [embed] };

        // Set cache for 15 minutes
        setCache(cacheKey, replyPayload, 1000 * 60 * 15);

        await interaction.editReply(replyPayload);
        } catch (error) {
        console.error(error);
        await interaction.editReply('There was an error while fetching tournament results. Please try again later.');
        }
    }
};
