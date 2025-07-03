const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { generateBoosterReport } = require('../../utils/boosterreportlist');

const ALLOWED_ROLE_ID = '934006547137318922';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testboosterreport')
    .setDescription('Run a test of the booster report system'),

  async execute(interaction) {
    const member = interaction.member;

    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const hasRole = member.roles.cache.has(ALLOWED_ROLE_ID);

    if (!isAdmin && !hasRole) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await generateBoosterReport(interaction.client); // pass the bot client
      await interaction.editReply('✅ Booster report sent to the report channel.');
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ Failed to send booster report.');
    }
  }
};
