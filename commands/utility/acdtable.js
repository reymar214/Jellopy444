const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('acdtable')
        .setDescription('Shows ACD and ASPD correlation'),
    
        async execute(interaction) {
            // Create a new MessageEmbed
            const acdTable = new EmbedBuilder()
                .setColor('#0099ff') // Set the embed color
                .setImage('https://i.ibb.co/Z2cC0js/image.png')
                .setTimestamp(); // Add a timestamp to the embed
            
            // Reply with the embed
            await interaction.reply({ embeds: [acdTable] });
        },
    };