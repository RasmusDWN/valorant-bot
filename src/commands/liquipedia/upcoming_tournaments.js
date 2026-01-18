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
      const response = await fetch(`https://api.liquipedia.net/api/v3/tournament?wiki=valorant&groupby=startdate%20ASC`, {
        headers: {
          'accept': 'application/json',
          'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
        }
      });

      const data = await response.json();
      const now = Date.now();
      const upcomingTournaments = data.result.filter(tournament => tournament.enddate && Date.parse(tournament.enddate) >= now);
      console.log('upcomingTournaments:', upcomingTournaments);
      const tournaments = upcomingTournaments.slice(0, 5); // Get next 5 upcoming tournaments

      if (!tournaments || tournaments.length === 0) {
        await interaction.editReply('No upcoming tournaments found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Upcoming Valorant Tournaments')
        .setColor(globalThis.VALORANT_RED)
        .setFooter({ text: 'Data source: Liquipedia', iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png' });

      tournaments.forEach(tournament => {
        const startDate = new Date(tournament.startdate).toLocaleString('en-GB');
        console.log('embed startDate:', startDate);
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
