const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Provides information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get information about')
                .setRequired(true)),
    
    async execute(interaction) {
        // Get the user from the interaction options
        const user = interaction.options.getUser('user');
        member = interaction.guild.members.cache.get(user.id);
        roles = member.roles.cache.map(r => `${r}`).join(' , ');
        // Create a new MessageEmbed
        const userInfoEmbed = new EmbedBuilder()
            .setColor('#0099ff') // Set the embed color
            .setTitle(`${user.displayName}`) // Set the title
            .setThumbnail(user.displayAvatarURL()) // Set the user's avatar as the thumbnail
            .addFields(
                {name:'Discord User', value: `${user.username}`},
                {name:'User ID', value: `${user.id}`}, // Add member count to the embed
                {name: 'Roles', value: `${roles}`},
                {name:'Joined Server', value: `${interaction.guild.members.cache.get(user.id).joinedAt.toLocaleDateString()}`},
                {name:'Account Created', value: `${user.createdAt.toLocaleDateString()}`},
            )
            .setTimestamp(); // Add a timestamp to the embed
        
        // Reply with the embed
        await interaction.reply({ embeds: [userInfoEmbed] });
    },
};
