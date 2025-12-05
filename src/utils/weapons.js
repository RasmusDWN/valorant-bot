import fetch from 'node-fetch';

export async function fetchWeaponFromSkin(skin) {
  try {
    const response = await fetch('https://valorant-api.com/v1/weapons');
    const data = await response.json();

    for (const weapon of data.data) {
      if (weapon.skins.some(s => s.uuid === skin.uuid)) {
        return weapon;
      }
    }

    return null; // Weapon not found
  } catch (error) {
    console.error('Error fetching weapon data:', error);
    throw error;
  }
}
