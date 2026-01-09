import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Global colors
import './src/utils/colors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -----------------------------------------------------
    Client Setup
----------------------------------------------------- */

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

/* -----------------------------------------------------
    Load commands dynamically and register them
----------------------------------------------------- */

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Import each command file and set it in the client's command collection
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = await import(`file://${filePath}`);
    const command = commandModule.default || commandModule;

    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

/* -----------------------------------------------------
    Environment Setup & token handling
----------------------------------------------------- */

// Register environment and REST client
const isDev = process.env.NODE_ENV === 'development';

// Determine the correct token based on environment
const token = isDev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN;
if (!token) {
    const exptectedVar = isDev ? 'DEV_DISCORD_TOKEN' : 'DISCORD_TOKEN';
    console.log(`Discord bot token is not set. Please set the ${exptectedVar} environment variable.`);
    process.exit(1);
}

/* -----------------------------------------------------
    REST Client
----------------------------------------------------- */

const rest = new REST({ version: '10' }).setToken(token);

let clientId;
let route;

if (isDev) {
    clientId = process.env.DEV_CLIENT_ID;
    const guildId = process.env.GUILD_ID;
    if (!clientId) {
        console.error('Missing required environment variable: DEV_CLIENT_ID');
        process.exit(1);
    }
    if (!guildId) {
        console.error('Missing required environment variable: GUILD_ID');
        process.exit(1);
    }
    route = Routes.applicationGuildCommands(clientId, guildId);
} else {
    clientId = process.env.CLIENT_ID;
    if (!clientId) {
        console.error('Missing required environment variable: CLIENT_ID');
        process.exit(1);
    }
    route = Routes.applicationCommands(clientId);
}

// Deploy commands to a specific guild
(async () => {
    try {
        if (!isDev && process.env.GUILD_ID) {
            console.log('Clearing old guild commands...');
            await rest.put(
                Routes.applicationGuildCommands(clientId, process.env.GUILD_ID),
                { body: [] }
            );
        }

        console.log('Registering slash commands...');
        await rest.put(
            route,
            { body: commands }
        );
        console.log('Slash commands registered successfully.');
    } catch (error) {
        console.error(error);
    }
})();

/* -----------------------------------------------------
    Interaction Handling
----------------------------------------------------- */

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command.', ephemeral: true });
    }
});

/* -----------------------------------------------------
    Ready & login
----------------------------------------------------- */

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(token);
