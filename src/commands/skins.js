import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fetch from 'node-fetch';

import { fetchSkinByName } from '../utils/fetch_skin.js';
import { fetchWeaponFromSkin } from '../utils/weapons.js';
import { getTierName, getTierPrice } from '../utils/tiers.js';

const SKINS_PER_PAGE = 5;

export default {
    data: new SlashCommandBuilder()
        .setName('skins')
        .setDescription('List skins for a specific weapon')
        .addStringOption(option =>
            option.setName('weapon')
                .setDescription('The weapon name (e.g. "Vandal")')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const weaponName = interaction.options.getString('weapon').toLowerCase();

        try {
            const response = await fetch('https://valorant-api.com/v1/weapons');
            const data = await response.json();

            const weapon = data.data.find(weapon =>
                weapon.displayName.toLowerCase() === weaponName
            );

            if (!weapon || !weapon.skins || weapon.skins.length === 0) {
                await interaction.editReply(`No skins found for weapon "${weaponName}". Please check the name and try again.`);
                return;
            }

            // Sort skins so they appear alphabetically in list
            weapon.skins.sort((a, b) => a.displayName.localeCompare(b.displayName));

            // Paginate skins
            let currentPage = 0;
            const totalPages = Math.ceil(weapon.skins.length / SKINS_PER_PAGE);

            const generateEmbed = (page) => {
                const start = page * SKINS_PER_PAGE;
                const end = start + SKINS_PER_PAGE;
                const skinsSlice = weapon.skins.slice(start, end);

                const embed = new EmbedBuilder()
                    .setTitle(`${weapon.displayName} Skins (Page ${page + 1}/${totalPages})`)
                    .setColor('#ff4655');

                skinsSlice.forEach(skin => {
                    embed.addFields({
                        name: skin.displayName,
                        value: `Tier: ${skin.contentTierUuid ? getTierName(skin.contentTierUuid) : 'Unknown'}`
                    })
                });

                return embed;
            };

            const generateButtons = (page) => {
                const start = page * SKINS_PER_PAGE;
                const end = start + SKINS_PER_PAGE;
                const skinsSlice = weapon.skins.slice(start, end);

                // First row -> Pagination buttons
                const first_row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('⬅️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),

                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1),
                );

                // Second row -> Skin selection buttons
                const second_row = new ActionRowBuilder().addComponents(
                    ...skinsSlice.map(skin =>
                        new ButtonBuilder()
                            .setCustomId(`skin_${skin.displayName.replaceAll(" ", "_")}`)
                            .setLabel(skin.displayName)
                            .setStyle(ButtonStyle.Secondary)
                    )
                );

                return [first_row, second_row];
            };

            const message = await interaction.editReply({
                embeds: [generateEmbed(currentPage)],
                components: generateButtons(currentPage)
            });

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return;

                if (i.customId === 'prev') currentPage--;
                if (i.customId === 'next') currentPage++;

                if (i.customId.startsWith('skin_')) {
                    const skinName = i.customId.replace('skin_', '').replaceAll("_", " ");
                    const skin = await fetchSkinByName(skinName);
                    const weapon = await fetchWeaponFromSkin(skin);

                    return i.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(skin.displayName)
                                .setColor('#ff4655')
                                .setThumbnail(weapon?.displayIcon || null)
                                .addFields(
                                    { name: 'Price', value: getTierPrice(skin.contentTierUuid), inline: true },
                                    { name: 'Tier', value: getTierName(skin.contentTierUuid), inline: true },
                                    { name: 'Chromas', value: (skin.chromas?.length || 0).toString(), inline: true }
                                )
                                .setImage(skin.fullRender || skin.displayIcon || null)
                        ]
                    });
                }

                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: generateButtons(currentPage)
                });
            });
    } catch (error) {
        console.error(error);
        await interaction.editReply('There was an error while fetching the skins data. Please try again later.');
    }
  }
};
