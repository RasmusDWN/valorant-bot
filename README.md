# Valorant Discord Bot

> A Discord bot for Valorant that provides information about agents, weapons, skins, and more — all via the Valorant API.

---

## Features

- **/agents** – List all Valorant agents
- **/agent [name]** – Get detailed info about a single agent (abilities, portrait)
- **/battlepass** - Show the latest live battlepass (contract) in Valorant
- **/bundle [name]** – Show details about a specific skin bundle (skins, price)
- **/bundles** – List all available skin bundles (with pagination)
- **/currentevent** – Show details about the current Valorant event
- **/currentseason** – Show details about the current Valorant season
- **/map [name]** – Look up a Valorant map
- **/newestagent** - Show detailed info about the newest Valorant agent released
- **/randomskin** – Get a random skin from the entire Valorant collection
- **/skin [name]** – Show details about a single skin (tier, images)
- **/skins [weapon]** – List all skins for a specific weapon (with pagination)
- **/weapon [name]** – Look up weapon stats, cost, category, wall penetration

---

## Getting Started

### Prerequisites

- Node.js >= 18
- Discord bot token ([create a bot here](https://discord.com/developers/applications))
- A server where you can add your bot

1. Create your bot on Discord's [developer page](https://discord.com/developers/applications).
2. Save your Token securely (you'll need to reset it if lost).
3. Go to the **OAuth2** tab to generate your invite URL.
   - **Scopes:**
     - `bot`
     - `application.commands`
   - **Permissions:**
     - Send Messages
     - Embed Links
     - Attach Files
     - Read Message History
     - Manage Expressions
     - View Channels
4. Invite the bot to your server using the generated URL.

---

## Installation

Install dependencies:

```bash
npm install
```

Create a .env file in the root directory with the following:
```bash
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_app_client_id
GUILD_ID=your_discord_server_id
```

If you want to run a separate development bot, you can also add:
```bash
DEV_DISCORD_TOKEN=your_dev_discord_bot_token
DEV_CLIENT_ID=your_dev_discord_app_client_id
NODE_ENV=development
```

### Running the Bot

`npm start`
The bot should log in and register slash commands with your server.

### Project Structure
```bash
/src
  /commands   # All Discord slash commands
  /embeds     # Embed templates for certain commands
  /utils      # Helper functions (e.g., tier mapping)
[index.js](http://_vscodecontentref_/2)      # Bot entry point
.env          # Environment variables
```

### Notes
* Uses Valorant API [https://valorant-api.com/v1] for agents, weapons, and skins.
* Requires Discord slash command permissions.
