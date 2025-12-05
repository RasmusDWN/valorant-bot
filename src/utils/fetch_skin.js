import fetch from 'node-fetch';

export async function fetchSkinByName(skinName) {
  const response = await fetch('https://valorant-api.com/v1/weapons/skins');
  const data = await response.json();

  return data.data.find(skin =>
    skin.displayName.toLowerCase() === skinName.toLowerCase()
  )
}
