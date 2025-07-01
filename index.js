require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio');
const sharp = require('sharp');
const crypto = require('crypto');
const FormData = require('form-data');
const net = require('node:net');

const { scheduleModal, resumeEvents } = require('./commands/utility/event_schedule_modal.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// Load Commands
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Modal handling
client.on('interactionCreate', async interaction => {
  if (interaction.isModalSubmit() && interaction.customId === 'scheduleModal') {
    await scheduleModal.modalSubmit(interaction);
  }
});

client.once('ready', () => {
  client.user.setPresence({
    activities: [{ name: 'with your heart', type: 0 }],
    status: 'online',
  });

  console.log('Bot is ready!');
  resumeEvents(client);
});

// Message filter
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const bannedWords = ['ymar', 'reymar', 'milante'];
  const content = message.content.toLowerCase();

  for (const word of bannedWords) {
    if (content.includes(word)) {
      try {
        await message.delete();
      } catch (err) {
        console.error('Error deleting message:', err);
      }
      break;
    }
  }
});

client.login(process.env.DISCORD_TOKEN);