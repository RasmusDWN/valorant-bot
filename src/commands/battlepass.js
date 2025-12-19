import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fetchReward } from '../utils/fetch_reward.js';

const LEVELS_PER_PAGE = 1;

// /battlepass
//
// Fetches and displays information about the current Valorant battle pass.
export default {
    data: new SlashCommandBuilder()
        .setName('battlepass')
        .setDescription('See the current Valorant battle pass'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const [contractsResponse, eventsResponse] = await Promise.all([
                fetch('https://valorant-api.com/v1/contracts'),
                fetch('https://valorant-api.com/v1/events')
            ]);

            const contracts = (await contractsResponse.json()).data;
            const events = (await eventsResponse.json()).data;

            const now = new Date();

            const contract = contracts.find(c => {
                const event = events.find(ev => ev.uuid === c.content?.relationUuid);
                if (!event) return false;
                return now >= new Date(event.startTime) && now <= new Date(event.endTime);
            });

            if (!contract) {
                return interaction.editReply('No active battlepass found.');
            }

            let chapterIndex = 0;
            let levelIndex = 0;

            const embed = await buildBattlepassEmbed(contract, chapterIndex, levelIndex);
            const components = await buildBattlepassButtons(contract, chapterIndex, levelIndex);

            const message = await interaction.editReply({ embeds: [embed], components });

            const collector = message.createMessageComponentCollector({ time: 120_000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: 'These buttons aren\'t for you!', ephemeral: true });
                }

                const [, direction, scope, chap, lvl] = i.customId.split('_');
                chapterIndex = parseInt(chap);
                levelIndex = parseInt(lvl);

                if (scope === 'level') {
                    if (direction === 'next') levelIndex++;
                    if (direction === 'prev') levelIndex--;
                } else if (scope === 'chapter') {
                    if (direction === 'next') chapterIndex++;
                    if (direction === 'prev') chapterIndex--;
                    levelIndex = 0; // Reset level index when changing chapters
                }

                const newEmbed = await buildBattlepassEmbed(contract, chapterIndex, levelIndex);
                const newComponents = await buildBattlepassButtons(contract, chapterIndex, levelIndex);

                await i.update({ embeds: [newEmbed], components: newComponents });
            });
        } catch (error) {
            console.error(`Error in /battlepass command: ${error}`);
            await interaction.editReply('An error occurred while fetching the battlepass data.');
        }
    }
};

async function buildBattlepassButtons(contract, chapterIndex, levelIndex) {
    const chapters = contract.content?.chapters?.length
        ? contract.content.chapters
        : [{ levels: contract.levels }];

    const chapter = chapters[chapterIndex];
    const maxLevelPage = Math.ceil(chapter.levels.length / LEVELS_PER_PAGE) - 1;

    const levelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`bp_prev_level_${chapterIndex}_${levelIndex}`)
            .setLabel('Previous Level')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(levelIndex === 0),

        new ButtonBuilder()
            .setCustomId(`bp_next_level_${chapterIndex}_${levelIndex}`)
            .setLabel('Next Level')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(levelIndex >= maxLevelPage)
    );

    const chapterRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`bp_prev_chapter_${chapterIndex}_${levelIndex}`)
            .setLabel('Previous Chapter')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(chapterIndex === 0),

        new ButtonBuilder()
            .setCustomId(`bp_next_chapter_${chapterIndex}_${levelIndex}`)
            .setLabel('Next Chapter')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(chapterIndex >= chapters.length - 1)
    );

    return [levelRow, chapterRow];
}

async function buildBattlepassEmbed(contract, chapterIndex, levelIndex) {
    const chapters = contract.content?.chapters?.length
        ? contract.content.chapters
        : [{ levels: contract.levels }];

    const chapter = chapters[chapterIndex];
    const totalChapters = chapters.length;

    const start = levelIndex * LEVELS_PER_PAGE;
    const end = start + LEVELS_PER_PAGE;
    const levels = chapter.levels.slice(start, end);

    const embed = new EmbedBuilder()
        .setTitle(`Contract: ${contract.displayName}`)
        .setColor(globalThis.VALORANT_RED)
        .setThumbnail(contract.displayIcon ?? null)
        .setFooter({
            text: `Chapter ${chapterIndex + 1}/${totalChapters} • Page ${levelIndex + 1}/${Math.ceil(chapter.levels.length / LEVELS_PER_PAGE)}`,
        });

    for (const lvl of levels) {
        const reward = await fetchReward(lvl.reward?.type, lvl.reward?.uuid);

        embed.addFields({
            name: `Level ${start + levels.indexOf(lvl) + 1} - ${reward.name}`,
            value: `XP Required: ${lvl.xp ?? 0}`
        });

        if (reward.image) {
            embed.setImage(reward.image);
        }
    }

    return embed;
}
