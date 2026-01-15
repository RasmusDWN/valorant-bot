import fetch from 'node-fetch';
import 'dotenv/config';

const API_KEY = process.env.LIQUIPEDIA_API_KEY;
const BASE_URL = 'https://api.liquipedia.net/documentation/api/v3';

if (!API_KEY) {
    console.warn('⚠️ LIQUIPEDIA_API_KEY is not set in your .env file.');
}

/**
 * Generic Liquipedia API fetcher
 * @param {string} endpoint - e.g. /pages or /matches
 * @param {object} params - query parameters as an object
 */
export async function fetchLiquipedia(endpoint, params = {}) {
    const url = new URL(BASE_URL + endpoint);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const res = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json'
        }
    });

    if (!res.ok) {
        throw new Error(`Liquipedia API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
}
