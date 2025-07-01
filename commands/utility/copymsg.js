const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something!')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message you want the bot to send')
        .setRequired(true)
    ),

  async execute(interaction) {
    const message = interaction.options.getString('message');

    // Send an ephemeral confirmation (it'll auto-delete itself)
    await interaction.reply({ content: 'Sending message...', ephemeral: true });

    // Send the copied message to the channel
    await interaction.channel.send(message);
  },
};
