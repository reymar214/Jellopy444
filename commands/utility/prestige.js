const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prestige')
        .setDescription('Calculate the Prestige dodge chance based on INT, LUK, skill level, and base level.')
        .addIntegerOption(option =>
            option.setName('baseint')
                .setDescription('Base INT')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('bonusint')
                .setDescription('Bonus INT')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('baseluk')
                .setDescription('Base LUK')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('bonusluk')
                .setDescription('Bonus LUK')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('skilllevel')
                .setDescription('Skill Level (1-5)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5))
        .addIntegerOption(option =>
            option.setName('baselevel')
                .setDescription('Base Level (1-200)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(200)),

    async execute(interaction) {
        // Get the values from the interaction options
        const baseInt = interaction.options.getInteger('baseint');
        const bonusInt = interaction.options.getInteger('bonusint');
        const baseLuk = interaction.options.getInteger('baseluk');
        const bonusLuk = interaction.options.getInteger('bonusluk');
        const skillLevel = interaction.options.getInteger('skilllevel');
        const baseLevel = interaction.options.getInteger('baselevel');

        // Calculate the total INT and LUK
        const totalInt = baseInt + bonusInt;
        const totalLuk = baseLuk + bonusLuk;

        // Calculate the base dodge chance (1% per skill level)
        const baseDodgeChance = skillLevel;

        // Calculate the final dodge chance
        const dodgeChance = baseDodgeChance + ((totalInt + totalLuk) * (skillLevel / 20) * (baseLevel / 200));

        // Reply with the result
        await interaction.reply({ content: `Dodge Chance: ${dodgeChance.toFixed(2)}%`, ephemeral: false });
    },
};