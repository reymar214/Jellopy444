const { SlashCommandBuilder } = require('discord.js');
const { generateBoosterReport } = require('../../utils/boostereportlist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testboosterreport')
    .setDescription('Run a test of the booster report system'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      await generateBoosterReport(interaction.client); // pass your bot client
      await interaction.editReply('✅ Booster report sent to the report channel.');
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ Failed to send booster report.');
    }
  }
};
