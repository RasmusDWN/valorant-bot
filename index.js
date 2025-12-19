import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands dynamically
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

// Register commands with Discord API
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const isDev = process.env.NODE_ENV === 'development';
const route = isDev
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);

// Deploy commands to a specific guild
(async () => {
    try {
        console.log('Started refreshin application (/) commands.');
        await rest.put(
            route,
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Handle interactions
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

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
