import fetch from 'node-fetch';

// Simple in-memory cache for weapon skins
let cachedSkins = null;
let lastFetchTime = 0;

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

export async function fetchSkinByName(skinName) {
  const now = Date.now();
  if (!cachedSkins || (now - lastFetchTime) > CACHE_DURATION) {
    const response = await fetch('https://valorant-api.com/v1/weapons/skins');
    const data = await response.json();
    cachedSkins = data.data;
    lastFetchTime = now;
  }
  return cachedSkins.find(skin =>
    skin.displayName.toLowerCase() === skinName.toLowerCase()
  );
}
