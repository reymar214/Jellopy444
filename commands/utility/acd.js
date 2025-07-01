const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('acd')
        .setDescription('Calculate ASPD, ACD, and Hits per Second.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('find-aspd')
                .setDescription('Calculate ASPD and Hits per Second given Skill ACD and Skill CD.')
                .addNumberOption(option =>
                    option.setName('skill-acd')
                        .setDescription('Skill\'s ACD')
                        .setRequired(true))
                .addNumberOption(option =>
                    option.setName('skill-cd')
                        .setDescription('Skill\'s CD')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('find-acd')
                .setDescription('Calculate ACD and Hits per Second given Skill ACD and Your ASPD.')
                .addNumberOption(option =>
                    option.setName('skill-acd')
                        .setDescription('Skill\'s ACD')
                        .setRequired(true))
                .addNumberOption(option =>
                    option.setName('your-aspd')
                        .setDescription('Your ASPD (max 193)')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'find-aspd') {
            // Get inputs for "find-aspd"
            const skillACD = interaction.options.getNumber('skill-acd');
            const skillCD = interaction.options.getNumber('skill-cd');

            // Calculate ASPD and limit it to 193
            let aspd = Math.floor(200 - (50 * skillCD));
            aspd = Math.max(0, Math.min(aspd, 193)); // Ensures ASPD is within 0-193

            // Calculate ACD Required
            const acdRequired = 100 * (1 - (skillCD / skillACD));

            // Calculate Hits per Second
            const hitsPerSec = Math.floor(50 / (200 - aspd));

            // Reply with the results
            await interaction.reply({
                content: `**Results for Skill ACD: ${skillACD}, Skill CD: ${skillCD}**\n` +
                    `- **ASPD**: ${aspd}\n` +
                    `- **ACD Required**: ${acdRequired.toFixed(2)}%\n` +
                    `- **Hits per Second**: ${hitsPerSec}`,
                ephemeral: false,
            });
        } else if (subcommand === 'find-acd') {
            // Get inputs for "find-acd"
            const skillACD = interaction.options.getNumber('skill-acd');
            let yourASPD = interaction.options.getNumber('your-aspd');

            // Limit ASPD to 193
            yourASPD = Math.max(0, Math.min(yourASPD, 193));

            // Calculate Delay per Hit
            const delayPerHit = (200 - yourASPD) / 50;

            // Calculate ACD Required
            const acdRequired = 100 * (1 - (delayPerHit / skillACD));

            // Calculate Hits per Second
            const hitsPerSec = Math.floor(50 / (200 - yourASPD));

            // Reply with the results
            await interaction.reply({
                content: `**Results for Skill ACD: ${skillACD}, Your ASPD: ${yourASPD}**\n` +
                    `- **Delay per Hit**: ${delayPerHit.toFixed(2)}\n` +
                    `- **ACD Required**: ${acdRequired.toFixed(2)}%\n` +
                    `- **Hits per Second**: ${hitsPerSec}`,
                ephemeral: false,
            });
        }
    },
};
