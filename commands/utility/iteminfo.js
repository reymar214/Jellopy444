// ii.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const { cleanDescriptionLine, splitDescription, fetchAndCacheImage, formatDescriptionChunks } = require('./utils');
const { MessageAttachment } = require('discord.js');
const path = require('path');

// In-memory cache for text (maintaining original structure but improving safety)
const textCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ii')
        .setDescription('Searches for an item from DP and textfile')
        .addStringOption(option =>
            option.setName('searchpara')
                .setDescription('Search parameter of item info, either by ID or name')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            // Defer reply immediately to prevent interaction timeout (3 seconds)
            await interaction.deferReply();

            const searchParameter = interaction.options.getString('searchpara').trim().toLowerCase();

            // Check if the search parameter is cached
            const cachedText = textCache.get(searchParameter);
            if (cachedText) {
                await sendItemEmbed(interaction, cachedText, 0);
                return;
            }

            // Read and parse item data from file
            const data = await fs.readFile('iteminfo.txt', 'utf8');
            const lines = data.split('\n').filter(line => line.trim()); // Remove empty lines for efficiency

            let currentItem = null;
            const matchedItems = [];

            for (const line of lines) {
                const itemIDMatch = line.match(/^\s*\[(\d+)\]\s*=\s*{/);
                if (itemIDMatch) {
                    if (currentItem && currentItem.identifiedDisplayName.toLowerCase().includes(searchParameter)) {
                        matchedItems.push(currentItem);
                    }
                    currentItem = {
                        id: itemIDMatch[1],
                        identifiedDisplayName: null,
                        identifiedDescriptionName: [],
                        slotCount: null,
                        ClassNum: null,
                        costume: null,
                    };
                } else if (currentItem) {
                    const propertyMatch = line.match(/^\s*([a-zA-Z]+)\s*=\s*(.*)/);
                    if (propertyMatch) {
                        const [_, propertyName, propertyValue] = propertyMatch;
                        if (currentItem.hasOwnProperty(propertyName)) {
                            currentItem[propertyName] = Array.isArray(currentItem[propertyName])
                                ? [...currentItem[propertyName], propertyValue]
                                : propertyValue;
                        }
                    } else if (line.trim() !== "},") {
                        currentItem.identifiedDescriptionName.push(line.trim());
                    }
                }
            }

            if (currentItem && currentItem.identifiedDisplayName.toLowerCase().includes(searchParameter)) {
                matchedItems.push(currentItem);
            }

            if (matchedItems.length === 0) {
                await interaction.editReply({ content: 'No matching item found.', flags: 64 });
                return;
            }

            // Cache the result (maintaining original behavior)
            textCache.set(searchParameter, matchedItems);

            await sendItemEmbed(interaction, matchedItems, 0);
        } catch (error) {
            console.error('Error processing item data:', error);
            await interaction.editReply({ content: 'An error occurred while processing the data.', flags: 64 });
        }
    },
};

async function sendItemEmbed(interaction, items, currentIndex) {
    const item = items[currentIndex];
    if (!item || !item.id) return;

    const displayName = item.identifiedDisplayName.replace(/"(\s*,\s*)?/g, '');
    const slotCount = item.slotCount.endsWith(',') ? item.slotCount.slice(0, -1) : item.slotCount;

    // Process description using utility functions (maintaining original behavior)
    const descriptionLines = item.identifiedDescriptionName.map(line => cleanDescriptionLine(line.trim()));
    const descriptionChunks = splitDescription(descriptionLines);
    const formattedChunks = formatDescriptionChunks(descriptionChunks);

    const embeds = [];
    let currentEmbed = {
        color: 0x0099ff,
        author: {
            name: `${displayName}` + (slotCount !== '0' ? ` [${slotCount}]` : ''),
            icon_url: `https://www.divine-pride.net/img/items/item/GGH/${item.id}`,
        },
        description: `**ID:** ${item.id.replace(/\[|\]/g, '')}`,
        fields: [],
    };

    for (const chunk of formattedChunks) {
        currentEmbed.fields.push({ name: 'Description', value: chunk });

        if (currentEmbed.fields.length >= 25) {
            embeds.push(currentEmbed);
            currentEmbed = {
                ...currentEmbed,
                fields: [],
            };
        }
    }

    if (currentEmbed.fields.length > 0) {
        embeds.push(currentEmbed);
    }

    const imageUrl = `https://www.divine-pride.net/img/items/collection/GGH/${item.id}`;
    const imageData = await fetchAndCacheImage(imageUrl);

    if (imageData) {
        embeds.forEach(embed => {
            embed.thumbnail = { url: imageData.url };
        });
    }

    const currentPage = currentIndex + 1;
    const totalPages = items.length;

    if (embeds.length > 0) {
        embeds[embeds.length - 1].fields.push({
            name: 'Page',
            value: `${currentPage}/${totalPages}`,
        });
    }

    try {
        const messages = await Promise.all(embeds.map(embed => interaction.editReply({ embeds: [embed] })));

        if (items.length > 1) {
            const reactionEmojis = ['⏪', '⏩', '⏮️', '⏭️'];
            await Promise.all(reactionEmojis.map(emoji => messages[0].react(emoji)));

            const filter = (reaction, user) => reactionEmojis.includes(reaction.emoji.name) && user.id === interaction.user.id;
            const collector = messages[0].createReactionCollector({ filter, time: 70000 });

            collector.on('collect', async (reaction) => {
                switch (reaction.emoji.name) {
                    case '⏪':
                        currentIndex = (currentIndex - 1 + items.length) % items.length;
                        break;
                    case '⏩':
                        currentIndex = (currentIndex + 1) % items.length;
                        break;
                    case '⏮️':
                        currentIndex = 0;
                        break;
                    case '⏭️':
                        currentIndex = items.length - 1;
                        break;
                }
                await sendItemEmbed(interaction, items, currentIndex);
            });
        }
    } catch (error) {
        console.error('Error sending item embed:', error);
    }
}