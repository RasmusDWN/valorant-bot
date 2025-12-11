import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

export default {
    data: new SlashCommandBuilder()
        .setName('weapon')
        .setDescription('Look up a weapon')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The weapon name')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const weaponName = interaction.options.getString('name').toLowerCase();

        try {
            const response = await fetch('https://valorant-api.com/v1/weapons');
            const data = await response.json();

            const weapon = data.data.find(weapon =>
                weapon.displayName.toLowerCase() === weaponName
            );

            if (!weapon) {
                await interaction.editReply(`Weapon "${weaponName}" not found. Please check the name and try again.`);
                return;
            }

            const stats = weapon.weaponStats;

            const embed = new EmbedBuilder()
                .setTitle(weapon.displayName)
                .setColor('#ff4655')
                .setImage(weapon.displayIcon)
                .addFields(
                    { name: 'Category', value: weapon.shopData?.categoryText || 'Unknown', inline: true },
                    { name: 'Cost', value: weapon.shopData ? `${weapon.shopData.cost} Credits` : 'Unknown', inline: true },
                    { name: 'Fire Rate', value: stats ? stats.fireRate.toString() : 'Unknown', inline: true },
                    { name: 'Magazine Size', value: stats ? stats.magazineSize.toString() : 'Unknown', inline: true },
                    { name: 'Reload Time', value: stats ? `${stats.reloadTimeSeconds} seconds` : 'Unknown', inline: true },
                    { name: 'Wall Penetration', value: cutWallPenetration(stats?.wallPenetration), inline: true }
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('There was an error while fetching the weapon data. Please try again later.');
        }
    }
};


function cutWallPenetration(value) {
    if (!value) return 'Unknown';
    return value.replace('EWallPenetrationDisplayType::', '');
}
