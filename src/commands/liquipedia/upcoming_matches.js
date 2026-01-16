import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

import { getCache, setCache } from '../../utils/cache.js';

// /upcomingmatches
//
// Show upcoming Valorant matches from Liquipedia
export default {
  data: new SlashCommandBuilder()
    .setName('upcomingmatches')
    .setDescription('Show upcoming Valorant matches'),

  async execute(interaction) {
    await interaction.deferReply();

    // Check cache first
    const cacheKey = `upcoming-matches`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      await interaction.editReply(cachedData);
      return;
    }

    try {
      const response = await fetch(`https://api.liquipedia.net/api/v3/match?wiki=valorant&rawstreams=false&streamurls=true`, {
        headers: {
          'accept': 'application/json',
          'authorization': `Apikey ${process.env.LIQUIPEDIA_API_KEY}`
        }
      });

      const data = await response.json();
      const now = Date.now();
      const upcomingMatches = data.result.filter(match => new Date(match.date).getTime() > now);
      const matches = upcomingMatches.slice(0, 5); // Get next 5 upcoming matches

      if (!matches || matches.length === 0) {
        await interaction.editReply('No upcoming matches found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Upcoming Valorant Matches')
        .setColor(globalThis.VALORANT_RED)
        .setFooter({ text: 'Data source: Liquipedia', iconURL: 'https://liquipedia.net/commons/images/2/2c/Liquipedia_logo.png' });


      matches.forEach(match => {
        const startTime = new Date(match.date).toLocaleString('en-GB', { timeZone: 'UTC', hour12: true });
        const team1 = match.match2opponents[0]?.name;
        const team2 = match.match2opponents[1]?.name;
        const streamUrl = match.streams?.[0]?.url || 'N/A';

        embed.addFields({
          name: `${team1} vs ${team2}`,
          value: `Tournament: ${match.tournament}\nStart: ${startTime} UTC\n[Stream](${streamUrl})`,
        })
      })

      // Cache the response for 10 minutes
      setCache(cacheKey, embed, 600);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('There was an error while fetching upcoming matches. Please try again later.');
    }
  }
}
