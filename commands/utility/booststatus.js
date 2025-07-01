const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('booststatus')
    .setDescription('Check how long someone has been boosting the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check')
        .setRequired(true)
    ),

  async execute(interaction) {
    const member = interaction.options.getMember('user');

    if (!member) {
      return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    }

    const boostDate = member.premiumSince;
    if (!boostDate) {
      return interaction.reply({ content: `${member.user.tag} is not currently boosting the server.`, ephemeral: true });
    }

    const now = new Date();
    const boostedAt = new Date(boostDate);
    const durationMs = now - boostedAt;
    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    const durationWeeks = Math.floor(durationDays / 7);
    const durationMonths = Math.floor(durationDays / 30.44); // average month length

    await interaction.reply({
      content: `${member.user.tag} has been boosting since **<t:${Math.floor(boostedAt.getTime() / 1000)}:D>**.\nThat's about **${durationDays} day(s)**, **${durationWeeks} week(s)**, or **${durationMonths} month(s)**.`,
      ephemeral: false
    });
  }
};
