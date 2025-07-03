const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadData } = require('../../utils/boosterTracker');

const ALLOWED_ROLE_ID = '934006547137318922';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boosterhistory')
    .setDescription('Show the current booster tracking history'),

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

    await interaction.deferReply({ ephemeral: false });

    const data = loadData();
    const entries = Object.entries(data);

    if (entries.length === 0) {
      return interaction.editReply('No booster history data found.');
    }

    const history = entries
      .map(([id, info]) => `• <@${id}> (**${info.username}**) – ${info.boostedDays} day${info.boostedDays !== 1 ? 's' : ''}`)
      .join('\n');

    const message = `📖 **Booster History**\n\n${history}`;

    await interaction.editReply({
      content: message,
      allowedMentions: { parse: [] },
    });
  }
};
