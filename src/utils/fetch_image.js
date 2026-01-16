import fetch from 'node-fetch';

/**
 * Fetch a Liquipedia player page thumbnail using the MediaWiki API
 * @param {string} pageName - Liquipedia page name (e.g. "Chronicle")
 * @param {string} wiki - Liquipedia wiki (default: "valorant")
 * @returns {Promise<string|null>} - URL of the thumbnail image or null if not found
*/

export async function fetchLiquipediaImage(pageName, wiki = 'valorant') {
  if (!pageName) return null;

  try {
    const url =
      `https://liquipedia.net/${wiki}/api.php` +
      `?action=parse` +
      `&page=${encodeURIComponent(pageName)}` +
      `&prop=wikitext` +
      `&redirects=1` +
      `&format=json`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const wikitext = data?.parse?.wikitext?.['*'];
    if (!wikitext) return null;

    // Fetch Infobox image
    const imageMatch = wikitext.match(/\|\s*image\s*=\s*(.+)/i);
    if (!imageMatch) return null;

    const fileName = imageMatch[1].trim();
    if (!fileName) return null;

    const imageUrl = `https://liquipedia.net/${wiki}/Special:FilePath/${encodeURIComponent(fileName)}`;
    return imageUrl;
  } catch (error) {
    console.error('Error fetching Liquipedia thumbnail:', error);
    return null;
  }
}
