# Valorant Discord Bot

> A Discord bot for Valorant that provides information about agents, weapons, skins, and more — all via the Valorant API.

---

## Features

- **/agents** – List all Valorant agents
- **/agent [name]** – Get detailed info about a single agent (abilities, portrait)
- **/weapon [name]** – Look up weapon stats, cost, category, wall penetration
- **/skin [name]** – Show details about a single skin (tier, images)
- **/skins [weapon]** – List all skins for a specific weapon (with pagination)

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

### Running the Bot

node [index.js](http://_vscodecontentref_/1)
The bot should log in and register slash commands with your server.

### Project Structure
```bash
/src
  /commands   # All Discord slash commands
  /utils      # Helper functions (e.g., tier mapping)
[index.js](http://_vscodecontentref_/2)      # Bot entry point
.env          # Environment variables
```

### Notes
* Uses Valorant API [https://valorant-api.com/v1] for agents, weapons, and skins.
* Requires Discord slash command permissions.
