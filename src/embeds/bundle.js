import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export function createBundleButtons(skinsInBundle) {
    const rows = [];
    for (let i = 0; i < skinsInBundle.length; i += 5) {
        rows.push(
            new ActionRowBuilder().addComponents(
                ...skinsInBundle.slice(i, i + 5).map(skin =>
                    new ButtonBuilder()
                        .setCustomId(`skin_${skin.displayName.replaceAll(" ", "_")}`)
                        .setLabel(skin.displayName.substring(0, 80))
                        .setStyle(ButtonStyle.Primary)
                )
            )
        );
    }
    return rows;
}

export function createBundleEmbed(bundle, skinsInBundle) {
    const embed = new EmbedBuilder()
        .setTitle(bundle.displayName)
        .setColor(this.VALORANT_RED)
        .setImage(bundle.displayIcon)
        .setDescription(
            skinsInBundle.length > 0
                ? 'Skins in this bundle:\n' + skinsInBundle.map(skin => `- ${skin.displayName}`).join('\n')
                : 'No skins found for this bundle.'
        );
    return embed;
}
