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
 * Expand user input into a list of search tokens
 */
export function buildSearchTokens(input) {
    const query = input.toLowerCase().trim();
    const tokens = new Set([query]);

    for (const aliases of Object.values(TOURNAMENT_ALIASES)) {
        if (aliases.some(alias => query.includes(alias))) {
            aliases.forEach(alias => tokens.add(alias));
        }
    }

    return [...tokens];
}

/**
 * Score how well a match fits the query
 */
export function scoreTournamentMatch(match, tokens) {
    let score = 0;

    const fields = [
        match.tickername,
        match.shortname,
        match.tournament,
        match.series,
        match.parent,
    ].filter(Boolean).map(field => field.toLowerCase());

    for (const token of tokens) {
        if (fields.some(field => field.includes(token))) {
            score += 1;
        }
    }

    console.log(`Match "${match.tournament}" scored ${score} for tokens [${tokens.join(', ')}]`);

    return score;
}

/**
 * Filter + rank upcoming matches based on tournament query
 */
export function filterMatchesByTournament(matches, userInput) {
    const tokens = buildSearchTokens(userInput);

    return matches
        .filter(match => new Date(match.date).getTime() > Date.now())
        .map(match => ({
            match,
            score: scoreTournamentMatch(match, tokens),
        }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(result => result.match);
}

/**
 * Filter + rank past matches based on tournament query
 */
export function filterPastMatchesByTournament(matches, userInput) {
    const tokens = buildSearchTokens(userInput);

    return matches
        .filter(match => new Date(match.date).getTime() <= Date.now())
        .map(match => ({
            match,
            score: scoreTournamentMatch(match, tokens),
        }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(result => result.match);
}