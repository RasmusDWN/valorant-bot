import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

export default {
    data: new SlashCommandBuilder()
        .setName('skin')
        .setDescription('Look up a skin')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The skin name (e.g. "Reaver Vandal")')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const skinName = interaction.options.getString('name').toLowerCase();

        try {
            const response = await fetch('https://valorant-api.com/v1/weapons/skins');

            const data = await response.json();

            const skin = data.data.find(skin =>
                skin.displayName.toLowerCase() === skinName
            );

            if (!skin) {
                await interaction.editReply(`Skin "${skinName}" not found. Please check the name and try again.`);
                return;
            }

            const weaponName = skin.weaponSkinType || 'Unknown';
            const levels = skin.levels?.length || 0;
            const chromas = skin.chromas?.length || 0;

            const tier = skin.contentTierUuid
                ? getTierName(skin.contentTierUuid)
                : 'Unknown';

            const embed = new EmbedBuilder()
                .setTitle(skin.displayName)
                .setColor('#ff4655')
                .addFields(
                    { name: 'Weapon', value: weaponName, inline: true },
                    { name: 'Tier', value: tier, inline: true },
                    { name: 'Levels', value: levels.toString(), inline: true },
                    { name: 'Chromas', value: chromas.toString(), inline: true }
                )
                .setImage(skin.fullRender || skin.displayIcon || null);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while fetching the skin data. Please try again later.');
        }
    }
};

function getTierName(uuid) {
    const tiers = {
        "0cebb560-4835-8428-35a1-e0c70a5c8d01": "Select",
        "60bca009-4182-7998-dee7-b8a2558dc369": "Deluxe",
        "e046854e-406c-37f4-6607-19a9ba8426fc": "Premium",
        "f7bcabf7-41d5-06ad-5904-8cde42372a1f": "Exclusive",
        "3f296c07-64c3-494c-923b-fe692a4fa1bd": "Ultra"
    };

    return tiers[uuid] || "Unknown";
}