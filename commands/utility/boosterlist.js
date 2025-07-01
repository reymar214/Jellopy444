const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boosterlist')
    .setDescription('List all current server boosters and how long they’ve been boosting'),

  async execute(interaction) {
    await interaction.deferReply();

    const members = await interaction.guild.members.fetch();
    const boosters = members.filter(m => m.premiumSince);

    if (boosters.size === 0) {
      return interaction.editReply('There are currently no active boosters.');
    }

    let message = `💎 **Current Server Boosters:**\n\n`;

    boosters.forEach(member => {
      const start = new Date(member.premiumSince);
      const now = new Date();

      // Calculate total duration in ms
      const durationMs = now - start;

      // Months and days (approximate)
      const daysTotal = Math.floor(durationMs / (1000 * 60 * 60 * 24));
      const months = Math.floor(daysTotal / 30.44); // Average month length
      const days = Math.floor(daysTotal % 30.44);

      message += `• ${member.user.tag} – Boosting since **<t:${Math.floor(start.getTime() / 1000)}:D>** (${months} month${months !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''})\n`;
    });

    await interaction.editReply({ content: message });
  }
};
