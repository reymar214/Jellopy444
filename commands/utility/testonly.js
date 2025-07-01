const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

// Load the item mapping from JSON file
let itemMapping = {};
try {
    // Make sure this path is correct relative to where your bot is running
    const itemData = fs.readFileSync('./json/iteminfo.json', 'utf8');
    itemMapping = JSON.parse(itemData);
    console.log(`[ItemInfo] Loaded ${Object.keys(itemMapping).length} items`);
} catch (err) {
    console.error('[ItemInfo] Error loading item data:', err);
}

// API configuration
const API_KEY = '675742e9e844718af5027948890d2581';
const BASE_URL = 'https://www.divine-pride.net/api/database/Item';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ii2')
        .setDescription('Search for a Ragnarok Online item')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('Item name to search for')
                .setRequired(true)),
    
    async execute(interaction) {
        console.log('[ItemInfo] Command executed by', interaction.user.tag);
        
        try {
            // Defer reply to get more time for API calls
            await interaction.deferReply();
            console.log('[ItemInfo] Reply deferred');
            
            // Check if we have item data loaded
            if (Object.keys(itemMapping).length === 0) {
                console.error('[ItemInfo] Item mapping is empty');
                return await interaction.editReply('Item database not loaded. Please contact the bot administrator.');
            }
            
            // Get search query
            const query = interaction.options.getString('query').toLowerCase();
            console.log('[ItemInfo] Query:', query);
            
            // Basic search
            let matchingItems = [];
            
            // Debug output to make sure our item mapping is working
            console.log('[ItemInfo] First few items in mapping:', 
                Object.entries(itemMapping).slice(0, 5).map(([id, info]) => `${id}: ${info.name}`));
            
            // Search through items
            for (const [itemId, itemInfo] of Object.entries(itemMapping)) {
                if (itemInfo.name && itemInfo.name.toLowerCase().includes(query)) {
                    matchingItems.push({
                        id: itemId,
                        name: itemInfo.name
                    });
                }
            }
            
            console.log(`[ItemInfo] Found ${matchingItems.length} matching items`);
            
            // No items found
            if (matchingItems.length === 0) {
                return await interaction.editReply(`No items found matching: "${query}"`);
            }
            
            // Just show the first item (no pagination for simplicity)
            const firstItem = matchingItems[0];
            console.log('[ItemInfo] First match:', firstItem);
            
            try {
                // Try to get item data from API
                console.log(`[ItemInfo] Fetching data for item ID: ${firstItem.id}`);
                const response = await axios.get(`${BASE_URL}/${firstItem.id}?apiKey=${API_KEY}`);
                const itemData = response.data;
                console.log('[ItemInfo] API response received');
                
                // Create simple embed using EmbedBuilder (v14) instead of MessageEmbed (v13)
                const embed = new EmbedBuilder()
                    .setTitle(itemData.name || firstItem.name)
                    .setColor(0x0099ff)
                    .setDescription(itemData.description || 'No description available');
                
                // Try to add image
                embed.setThumbnail(`https://static.divine-pride.net/images/items/item/${firstItem.id}.png`);
                
                // Add basic info - addFields is used in v14 instead of addField
                const fields = [];
                
                if (itemData.type) {
                    fields.push({ name: 'Type', value: itemData.type, inline: true });
                }
                
                if (itemData.weight) {
                    fields.push({ name: 'Weight', value: `${itemData.weight / 10}`, inline: true });
                }
                
                // Add other matches
                if (matchingItems.length > 1) {
                    let otherMatches = matchingItems
                        .slice(0, 5)
                        .map(item => `• ${item.name} [ID: ${item.id}]`)
                        .join('\n');
                        
                    fields.push({ name: 'Other Matches', value: otherMatches, inline: false });
                    
                    if (matchingItems.length > 5) {
                        embed.setFooter({ text: `...and ${matchingItems.length - 5} more items` });
                    }
                }
                
                if (fields.length > 0) {
                    embed.addFields(fields);
                }
                
                // Send reply
                console.log('[ItemInfo] Sending embed response');
                await interaction.editReply({ embeds: [embed] });
                console.log('[ItemInfo] Response sent successfully');
                
            } catch (apiError) {
                console.error('[ItemInfo] API error:', apiError.message);
                
                // Fallback basic response if API fails
                const basicEmbed = new EmbedBuilder()
                    .setTitle(firstItem.name)
                    .setColor(0xff0000)
                    .setDescription(`Could not fetch details from Divine Pride API. Error: ${apiError.message}`);
                    
                await interaction.editReply({ embeds: [basicEmbed] });
            }
            
        } catch (err) {
            console.error('[ItemInfo] Command error:', err);
            
            // Try to respond with error
            try {
                if (interaction.deferred) {
                    await interaction.editReply(`An error occurred: ${err.message}`);
                } else {
                    await interaction.reply(`An error occurred: ${err.message}`);
                }
            } catch (replyErr) {
                console.error('[ItemInfo] Failed to send error message:', replyErr);
            }
        }
    }
};