import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fetch from 'node-fetch';

const BUNDLES_PER_PAGE = 5;

export default {
    data: new SlashCommandBuilder()
        .setName('bundles')
        .setDescription('Browse Valorant bundles'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const response = await fetch('https://valorant-api.com/v1/bundles');
            const data = await response.json();
            const bundles = data.data;

            let page = 0;
            const totalPages = Math.ceil(bundles.length / BUNDLES_PER_PAGE);

            const generateEmbed = (pageIndex) => {
                const start = pageIndex * BUNDLES_PER_PAGE;
                const pageItems = bundles.slice(start, start + BUNDLES_PER_PAGE);

                const embed = new EmbedBuilder()
                    .setTitle(`Valorant Bundles (Page ${pageIndex + 1}/${totalPages})`)
                    .setColor('#ff4656');

                pageItems.forEach(bundle => {
                    embed.addFields({
                        name: bundle.displayName,
                        value: '',
                    });
                });

                embed.addFields({
                    name: '',
                    value: 'Click the buttons below to view a specific bundle.',
                })

                return embed;
            };

            const generateButtons = (pageIndex) => {
                const start = pageIndex * BUNDLES_PER_PAGE;
                const pageItems = bundles.slice(start, start + BUNDLES_PER_PAGE);

                const row = new ActionRowBuilder();

                pageItems.forEach((bundle) => {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`bundle_${bundle.uuid}`)
                            .setLabel(bundle.displayName.substring(0, 20))
                            .setStyle(ButtonStyle.Secondary)
                    );
                });

                return row;
            }

            const navButtons = (pageIndex) => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prevBundles')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === 0),
                new ButtonBuilder()
                    .setCustomId('nextBundles')
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === totalPages - 1)
            );


            const message = await interaction.editReply({
                embeds: [generateEmbed(page)],
                components: [generateButtons(page), navButtons(page)],
            });

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) { return i.reply({ content: 'These buttons aren\'t for you!', ephemeral: true }); }

                if (i.customId === 'prevBundles') page--;
                if (i.customId === 'nextBundles') page++;

                if (i.customId.startsWith('bundle_')) {
                    const uuid = i.customId.replace('bundle_', '');
                    const bundle = bundles.find(b => b.uuid === uuid);

                    const embed = new EmbedBuilder()
                        .setTitle(bundle.displayName)
                        .setColor('#ff4656')
                        .setImage(bundle.displayIcon)

                    return i.update({ embeds: [embed], components: [] });
                }

                await i.update({
                    embeds: [generateEmbed(page)],
                    components: [generateButtons(page), navButtons(page)],
                });
            });

        } catch (error) {
            console.error('Error fetching bundles:', error);
            await interaction.editReply('There was an error fetching the bundles. Please try again later.');
        }
    }
};
