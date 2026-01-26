# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install     # Install dependencies
npm start       # Run the bot (node index.js)
```

Set `NODE_ENV=development` to use dev bot token and register commands to a single guild (faster for testing).

## Environment Variables

- `DISCORD_TOKEN` / `DEV_DISCORD_TOKEN` - Bot tokens for production/development
- `CLIENT_ID` / `DEV_CLIENT_ID` - Discord application client IDs
- `GUILD_ID` - Required for dev mode; also used to clear guild commands in production
- `LIQUIPEDIA_API_KEY` - Required for `/player`, `/team`, `/upcoming_matches`, `/upcoming_tournaments` commands

## Architecture

**Discord.js v14 bot using ES modules** (`"type": "module"` in package.json).

### Entry Point
`index.js` - Dynamically loads all commands from `src/commands/` (including subdirectories), registers slash commands with Discord, and handles interactions.

### Project Structure
- `src/commands/` - Slash command handlers. Each file exports `{ data: SlashCommandBuilder, execute: function }`.
- `src/commands/liquipedia/` - Commands that use the Liquipedia API (player, team, matches, tournaments).
- `src/embeds/` - Reusable embed builders (e.g., `createAgentEmbed`, `createSkinEmbed`).
- `src/utils/` - Helpers for API fetching, caching, and data mapping.

### Data Sources
- **Valorant API** (`https://valorant-api.com/v1/`) - Agents, weapons, skins, bundles, maps, events, seasons.
- **Liquipedia API** - Esports data (players, teams, tournaments).

### Global State
`src/utils/colors.js` sets `globalThis.VALORANT_RED` which is used throughout embeds.

### Caching
`src/utils/cache.js` provides a simple in-memory cache with TTL for Liquipedia responses.

### Skin Tier System
`src/utils/tiers.js` maps skin tier UUIDs to names (Select, Deluxe, Premium, Exclusive, Ultra) and prices.
