import fetch from 'node-fetch';
import { buildSearchTokens } from './tournament_search.js';

const LIQUIPEDIA_API = 'https://api.liquipedia.net/api/v3/tournament';

/**
 * Score how well a tournament fits the user query
 */
function scoreTournament(tournament, tokens) {
    let score = 0;

    const fields = [
        tournament.name,
        tournament.shortname,
        tournament.tickername,
        tournament.series,
        tournament.parent,
    ].filter(Boolean).map(field => field.toLowerCase());

    for (const token of tokens) {
        if (fields.some(field => field.includes(token))) {
            score += 1;
        }
    }

    return score;
}

/**
 * Find the best matching tournament for the user input
 */
export async function findTournamentByName(query) {
    const tokens = buildSearchTokens(query);

    // Fetch recent Valorant tournaments
    const response = await fetch(
        `${LIQUIPEDIA_API}?wiki=valorant&limit=50&order=startdate DESC`,
        {
            headers: {
                accept: 'application/json',
                authorization: `Apikey ${process.env.LIQUIPEDIA_API_KEY}`,
            },
        }
    );

    const data = await response.json();
    if (!data?.result?.length) return null;

    const scored = data.result
        .map(tournament => ({
            tournament,
            score: scoreTournament(tournament, tokens),
        }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].tournament : null;
}