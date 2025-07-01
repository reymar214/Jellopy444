const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { splitDescription, formatDescriptionChunks, fetchAndCacheImage } = require('./utils');

// Sample fetchItemDetails function
async function fetchItemDetails(query, textCache) {
    // Check the cache first
    if (textCache.has(query)) {
        return textCache.get(query);
    }

    const fs = require('fs').promises;
    const data = await fs.readFile('iteminfo.txt', 'utf8');
    const lines = data.split('\n');

    let currentItem = null;
    let matchedItems = [];

    // Loop through the file lines to find matching items
    for (const line of lines) {
        const itemIDMatch = line.match(/^\s*\[(\d+)\]\s*=\s*{/);
        if (itemIDMatch) {
            if (currentItem && currentItem.identifiedDisplayName.toLowerCase().includes(query)) {
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
                const propertyName = propertyMatch[1];
                const propertyValue = propertyMatch[2];

                if (currentItem.hasOwnProperty(propertyName)) {
                    if (Array.isArray(currentItem[propertyName])) {
                        currentItem[propertyName].push(propertyValue);
                    } else {
                        currentItem[propertyName] = propertyValue;
                    }
                }
            } else if (line.trim() !== "},") {
                currentItem.identifiedDescriptionName.push(line.trim());
            }
        }
    }

    if (currentItem && currentItem.identifiedDisplayName.toLowerCase().includes(query)) {
        matchedItems.push(currentItem);
    }

    // Cache the result
    textCache.set(query, matchedItems);

    return matchedItems;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('compare')
        .setDescription('Compare two items')
        .addStringOption(option =>
            option.setName('item1')
                .setDescription('First item to compare')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('item2')
                .setDescription('Second item to compare')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        
        const textCache = new Map();
        const item1Query = interaction.options.getString('item1').trim().toLowerCase();
        const item2Query = interaction.options.getString('item2').trim().toLowerCase();

        try {
            // Fetch both items
            const item1Results = await fetchItemDetails(item1Query, textCache);
            const item2Results = await fetchItemDetails(item2Query, textCache);

            if (!item1Results.length || !item2Results.length) {
                return interaction.editReply("One or both items not found!");
            }

            const item1 = item1Results[0];
            const item2 = item2Results[0];

            // Create description embeds
            const descriptionEmbeds = [];
            
            // Split and format descriptions
            const item1DescChunks = formatDescriptionChunks(splitDescription(item1.identifiedDescriptionName));
            const item2DescChunks = formatDescriptionChunks(splitDescription(item2.identifiedDescriptionName));

            // Get maximum number of chunks
            const maxChunks = Math.max(item1DescChunks.length, item2DescChunks.length);

            // Create comparison fields for each chunk
            for (let i = 0; i < maxChunks; i++) {
                const embedChunk = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .addFields(
                        {
                            name: `📝 ${item1.identifiedDisplayName} Description (Part ${i + 1})`,
                            value: item1DescChunks[i] || '*No description available*',
                            inline: true
                        },
                        {
                            name: `📝 ${item2.identifiedDisplayName} Description (Part ${i + 1})`,
                            value: item2DescChunks[i] || '*No description available*',
                            inline: true
                        }
                    );
                
                descriptionEmbeds.push(embedChunk);
            }

            // Send only the description embeds
            await interaction.editReply({ 
                embeds: descriptionEmbeds 
            });

        } catch (error) {
            console.error('Comparison error:', error);
            await interaction.editReply('Failed to compare items!');
        }
    }
};
