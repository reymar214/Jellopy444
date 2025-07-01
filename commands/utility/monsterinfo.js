// commands/utility/monsterinfo.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio'); // Already in your dependencies for ii.js
const { cleanDescriptionLine, splitDescription, fetchAndCacheImage, formatDescriptionChunks } = require('./utils');

// In-memory cache for monsters (extend textCache or create new)
const monsterCache = new Map();
const API_KEY = 'YOUR_DIVINE_PRIDE_API_KEY'; // Replace with your actual API key
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache TTL for rate limits

async function fetchMonsterList() {
    if (monsterCache.has('monsterList')) {
        const cached = monsterCache.get('monsterList');
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        const response = await axios.get(`https://www.divine-pride.net/database/search?q=*#monster`);
        const $ = cheerio.load(response.data);
        const monsterList = {};

        $('a[href^="/database/Monster/"]').each((i, element) => {
            const href = $(element).attr('href');
            const id = href.split('/').pop();
            const name = $(element).text().trim();
            monsterList[name.toLowerCase()] = id;
        });

        monsterCache.set('monsterList', { data: monsterList, timestamp: Date.now() });
        return monsterList;
    } catch (error) {
        console.error('Error scraping monster list:', error);
        return null;
    }
}

async function getMonsterIdByName(monsterName) {
    const monsterList = await fetchMonsterList();
    if (!monsterList) return null;

    // Normalize monster name for comparison
    monsterName = monsterName.toLowerCase().trim();
    return monsterList[monsterName] || null; // Return ID or null if not found
}

async function fetchMonsterDetails(monsterId) {
    try {
        const response = await axios.get(`https://divine-pride.net/api/database/MonsterID/${monsterId}?apiKey=${API_KEY}&server=GGH`);
        return response.data;
    } catch (error) {
        console.error('Error fetching monster details:', error);
        return null;
    }
}

async function sendMonsterEmbed(interaction, monsters, currentIndex) {
    const monster = monsters[currentIndex];
    if (!monster || !monster.id) return;

    const displayName = monster.name || 'Unknown Monster';
    const stats = monster.stats || {};
    const drops = monster.drops || [];
    const spawn = monster.spawn || [];
    const skills = monster.skill || [];

    // Format description from stats, drops, spawn, and skills
    const descriptionLines = [
        `**Level:** ${stats.level || 'N/A'}`,
        `**HP:** ${stats.health || 'N/A'}`,
        `**ATK:** ${stats.attack?.minimum || 'N/A'} - ${stats.attack?.maximum || 'N/A'}`,
        `**DEF:** ${stats.defense || 'N/A'}`,
        `**MDEF:** ${stats.magicDefense || 'N/A'}`,
        `**Element:** ${stats.element || 'N/A'}`,
        `**Race:** ${stats.race || 'N/A'}`,
        `**Drops:** ${drops.map(drop => `${drop.itemId} (${drop.chance / 100}%${drop.stealProtected ? ', Steal-Protected' : ''})`).join(', ') || 'None'}`,
        `**Spawn Locations:** ${spawn.map(s => `${s.mapname} (${s.amount} at ${s.respawnTime / 1000}s)`).join(', ') || 'None'}`,
        `**Skills:** ${skills.map(s => `${s.skillId} - ${s.status} (Lv ${s.level}, ${s.chance}% chance)`).join(', ') || 'None'}`,
    ].filter(line => line !== 'None'); // Remove "None" if all fields are missing

    const descriptionChunks = splitDescription(descriptionLines);
    const formattedChunks = formatDescriptionChunks(descriptionChunks);

    const embeds = [];
    let currentEmbed = new EmbedBuilder()
        .setColor(0x00FF00) // Green for monsters
        .setTitle(displayName)
        .setDescription(`**ID:** ${monster.id}`)
        .setThumbnail(`https://www.divine-pride.net/img/monsters/${monster.id}`); // Adjust URL if needed

    for (const chunk of formattedChunks) {
        currentEmbed.addFields({ name: 'Details', value: chunk });
        if (currentEmbed.data.fields.length >= 25) { // Discord embed field limit
            embeds.push(currentEmbed);
            currentEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(displayName)
                .setDescription(`**ID:** ${monster.id}`)
                .setThumbnail(`https://www.divine-pride.net/img/monsters/${monster.id}`);
        }
    }

    if (currentEmbed.data.fields.length > 0) {
        embeds.push(currentEmbed);
    }

    const currentPage = currentIndex + 1;
    const totalPages = monsters.length;
    if (embeds.length > 0) {
        embeds[embeds.length - 1].addFields({
            name: 'Page',
            value: `${currentPage}/${totalPages}`,
            inline: true,
        });
    }

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds });
        } else {
            await interaction.reply({ embeds }); // Non-ephemeral, visible to everyone (matching your ii.js change)
        }
    } catch (sendError) {
        console.error('Error sending monster embed:', sendError);
        await interaction.editReply({ content: 'Failed to send monster information.', ephemeral: true });
        return;
    }

    if (monsters.length > 1) {
        const reactionEmojis = ['⏪', '⏩', '⏮️', '⏭️'];
        let message;

        try {
            message = await interaction.fetchReply();
            if (!message) {
                console.warn('Message not found for reactions.');
                return;
            }

            const channel = await interaction.channel;
            if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.AddReactions)) {
                console.warn('Bot lacks Add Reactions permission in this channel.');
                return;
            }

            await Promise.all(reactionEmojis.map(async (emoji) => {
                try {
                    await message.react(emoji);
                } catch (reactionError) {
                    console.error(`Failed to add reaction ${emoji}:`, reactionError);
                }
            }));

            const filter = (reaction, user) => reactionEmojis.includes(reaction.emoji.name) && user.id === interaction.user.id;
            const collector = message.createReactionCollector({ filter, time: 70000 }); // Match ii.js timeout

            collector.on('collect', async (reaction) => {
                try {
                    await reaction.users.remove(interaction.user.id);
                    let newIndex = currentIndex;
                    switch (reaction.emoji.name) {
                        case '⏪': newIndex = (currentIndex - 1 + monsters.length) % monsters.length; break;
                        case '⏩': newIndex = (currentIndex + 1) % monsters.length; break;
                        case '⏮️': newIndex = 0; break;
                        case '⏭️': newIndex = monsters.length - 1; break;
                    }
                    await sendMonsterEmbed(interaction, monsters, newIndex);
                } catch (collectError) {
                    console.error('Error handling reaction:', collectError);
                }
            });

            collector.on('end', async () => {
                try {
                    await message.reactions.removeAll().catch(console.warn);
                } catch (cleanupError) {
                    console.warn('Failed to clean up reactions:', cleanupError);
                }
            });
        } catch (fetchError) {
            console.error('Error fetching reply for reactions:', fetchError);
            await interaction.followUp({ content: 'Unable to add navigation reactions due to an error.', ephemeral: true }).catch(console.warn);
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monsterinfo')
        .setDescription('Get information about a Ragnarok Online monster')
        .addStringOption(option =>
            option.setName('search')
                .setDescription('The name of the monster')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const monsterName = interaction.options.getString('search').trim();
            const monsterId = await getMonsterIdByName(monsterName);

            if (!monsterId) {
                await interaction.editReply({ content: 'No matching monster found.', ephemeral: true });
                return;
            }

            const monsterData = await fetchMonsterDetails(monsterId);
            if (!monsterData) {
                await interaction.editReply({ content: 'Failed to fetch monster data.', ephemeral: true });
                return;
            }

            await sendMonsterEmbed(interaction, [monsterData], 0);
        } catch (error) {
            console.error('Error processing monster data:', error);
            await interaction.editReply({ content: 'An error occurred while processing the data.', ephemeral: true });
        }
    },
};