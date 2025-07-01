const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server'),
    
    async execute(interaction) {
        // Create a new MessageEmbed
        const serverInfoEmbed = new EmbedBuilder()
            .setColor('#0099ff') // Set the embed color
            .setTitle('Server Information') // Set the title
            .setThumbnail(interaction.guild.iconURL()) // Set the server's icon as the thumbnail
            .addFields(
                {name:'Server Name', value: `${interaction.guild.name}`}, // Add server name to the embed
                {name:'Member Count', value: `${interaction.guild.memberCount}`},
                {name:'Date Established', value: `${interaction.guild.createdAt}`}, // Add member count to the embed
            )
            .setTimestamp(); // Add a timestamp to the embed
        
        // Reply with the embed
        await interaction.reply({ embeds: [serverInfoEmbed] });
    },
};
