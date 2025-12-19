import { EmbedBuilder } from 'discord.js';

import { fetchWeaponFromSkin } from '../utils/weapons.js';
import { getTierName, getTierPrice } from '../utils/tiers.js';

export async function createSkinEmbed(skin) {
    const chromas = skin.chromas?.length || 0;
    const price = getTierPrice(skin.contentTierUuid);
    const tier = skin.contentTierUuid
        ? getTierName(skin.contentTierUuid)
        : 'Unknown';
    const weapon = await fetchWeaponFromSkin(skin);
    const skinName = skin.displayName;

    const embed = new EmbedBuilder()
        .setTitle(skinName)
        .setColor(globalThis.VALORANT_RED)
        .setThumbnail(weapon?.displayIcon || null)
        .addFields(
            { name: 'Price', value: price, inline: true },
            { name: 'Tier', value: tier, inline: true },
            { name: 'Chromas', value: chromas.toString(), inline: true }
        )
        .setImage(skin.fullRender || skin.displayIcon || null);

    return embed;
}
