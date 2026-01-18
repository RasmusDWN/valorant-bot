import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { getCache, setCache } from '../../utils/cache.js';

// /upcomingtournaments
//
// Show upcoming Valorant tournaments from Liquipedia
export default {
  data: new SlashCommandBuilder()
    .setName('upcomingtournaments')
    .setDescription('Show upcoming Valorant tournaments'),

  async execute(interaction) {
    await interaction.deferReply();

    // Check cache first
    const cacheKey = `upcoming-tournaments`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      await interaction.editReply(cachedData);
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
      const apiUrl = `https://api.liquipedia.net/api/v3/tournament?wiki=valorant&conditions=%5B%5Bstartdate%3A%3A%3E${today}%5D%5D&groupby=startdate%20ASC`;
      console.log('apiUrl:', apiUrl);
      const response = await fetch(apiUrl, {
        headers: {
          'accept': 'application/json',
          'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
        }
      });

      const data = await response.json();
      const upcomingTournaments = data.result.slice(0, 5); // Get next 5 upcoming tournaments

      if (!upcomingTournaments || upcomingTournaments.length === 0) {
        await interaction.editReply('No upcoming tournaments found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Upcoming Valorant Tournaments')
        .setColor(globalThis.VALORANT_RED)
        .setFooter({ text: 'Data source: Liquipedia', iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png' });

      upcomingTournaments.forEach(tournament => {
        const startDate = new Date(tournament.startdate).toLocaleString('en-GB');
        embed.addFields({
          name: tournament.name,
          value: `Start: ${startDate} UTC\n[View on Liquipedia](https://liquipedia.net/valorant/${encodeURIComponent(tournament.pagename)})`,
        });
      });

      // Cache the response for 1 hour
      setCache(cacheKey, { embeds: [embed] }, 1000 * 60 * 60);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching upcoming tournaments:', error);
      await interaction.editReply('An error occurred while fetching upcoming tournaments. Please try again later.');
    }
  }
}
