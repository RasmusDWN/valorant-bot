const TOURNAMENT_ALIASES = {
    'vct': ['vct'],
    'vct americas': ['vct americas', 'vct am', 'na', 'vct na'],
    'vct cn': ['vct cn', 'china', 'vct china'],
    'vct pacific': ['vct pacific', 'vct apac', 'apac', 'australia', 'aussie', 'vct australia'],
    'vct emea': ['vct emea', 'emea', 'europe', 'vct europe'],
    'valorant challengers leagues': ['valorant challengers leagues', 'challengers leagues', 'challengers'],
    'valorant masters': ['valorant masters', 'masters'],
    'valorant champions': ['valorant champions', 'champions', 'worlds'],
}

/** 
 * Normalize user input for tournament search
 */
export function normalizeTournamentQuery(input) {
    return input.toLowerCase().trim();  
}

/**
 * Score how well a match fits the query    
 */
export function scoreTournamentMatch(match, query) {
    const q = query.toLowerCase();
    let score = 0;

    if (match.tickername?.toLowerCase().includes(q)) score += 5;
    if (match.shortname?.toLowerCase().includes(q)) score += 4;
    if (match.tournament?.toLowerCase().includes(q)) score += 3;
    if (match.series?.toLowerCase().includes(q)) score += 2;
    if (match.parent?.toLowerCase().includes(q)) score += 1;

    console.log(`Match: ${match.tournament}, Score for "${query}": ${score}`);
    return score;
}

/**
 * Filter + rank upcoming matches based on tournament query
 */
export function filterMatchesByTournament(matches, query) {
    const normalizedQuery = normalizeTournamentQuery(query);

    return matches
        .filter(match => new Date(match.date).getTime() > Date.now())
        .map(match => ({
            match,
            score: scoreTournamentMatch(match, normalizedQuery),
        }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(result => result.match);
}