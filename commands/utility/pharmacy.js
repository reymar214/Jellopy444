const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Hardcoded database of items and their rates
const itemDatabase = [
    { name: "Thorn Plant Seed", itemRate: 30 },
    { name: "Blood Sucker Plant Seed", itemRate: 30 },
    { name: "Bomb Mushroom Spore", itemRate: 15 },
    { name: "Enriched White PotionZ", itemRate: 10 },
    { name: "Vitata500", itemRate: 20 },
    { name: "Enrich Celermine Juice", itemRate: 30 },
    { name: "Cure Free", itemRate: 40 },
    { name: "Concentrated Red Syrup Potion", itemRate: 100 },
    { name: "Concentrated Blue Syrup Potion", itemRate: 130 },
    { name: "Concentrated Golden Syrup Potion", itemRate: 150 },
    { name: "Red Herb Activator", itemRate: 100 },
    { name: "Blue Herb Activator", itemRate: 100 },
    { name: "Golden X Potion", itemRate: 145 },
    { name: "Increase HP Potion (Small)", itemRate: 10 },
    { name: "Increase HP Potion (Medium)", itemRate: 20 },
    { name: "Increase HP Potion (Large)", itemRate: 40 },
    { name: "Increase SP Potion (Small)", itemRate: 10 },
    { name: "Increase SP Potion (Medium)", itemRate: 15 },
    { name: "Increase SP Potion (Large)", itemRate: 20 },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pharmacy")
        .setDescription("Calculate Special Pharmacy results based on INT, DEX, and LUK")
        .addIntegerOption(option =>
            option.setName("int")
                .setDescription("Total INT value")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("dex")
                .setDescription("Total DEX value")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("luk")
                .setDescription("Total LUK value")
                .setRequired(true)),

    async execute(interaction) {
        // Get user inputs
        const int = interaction.options.getInteger("int");
        const dex = interaction.options.getInteger("dex");
        const luk = interaction.options.getInteger("luk");

        // Hardcoded values (maxed skills and levels)
        const potionResearchLv = 10; // Maxed Potion Research
        const fcpLv = 5; // Maxed Full Chemical Protection
        const jobLevel = 60; // Job Level
        const baseLevel = 175; // Base Level
        const specificValue = 420; // Specific Value for Level 10

        // Random values for Special Pharma and Prepare Potion
        const randomSpecialPharma = Math.floor(Math.random() * (150 - 30 + 1)) + 30; // Random between 30 and 150
        const randomPreparePotion = Math.floor(Math.random() * (10 - 4 + 1)) + 4; // Random between 4 and 10

        // Calculate Creation value
        const creation = int + (dex / 2) + luk + jobLevel + randomSpecialPharma + (baseLevel - 100) + (potionResearchLv * 5) + (fcpLv * randomPreparePotion);

        // Calculate results for each item
        const results = itemDatabase.map(item => {
            const difficulty = specificValue + item.itemRate; // Difficulty = Specific_Value + Item_Rate
            const difference = creation - difficulty;
            let potionsBrewed;

            if (difference >= 400) {
                potionsBrewed = 12; // Max potions
            } else if (difference >= 300) {
                potionsBrewed = 9; // 3 below max
            } else if (difference >= 100) {
                potionsBrewed = 8; // 4 below max
            } else if (difference >= 1) {
                potionsBrewed = 7; // 5 below max
            } else {
                potionsBrewed = 6; // 6 below max
            }

            return {
                name: item.name,
                creation: creation.toFixed(2),
                difficulty: difficulty.toFixed(2),
                difference: difference.toFixed(2),
                potionsBrewed,
            };
        });

        // Prepare the embed
        const embed = new EmbedBuilder()
            .setTitle("Special Pharmacy Calculation Results")
            .setDescription(`**Creation Value:** ${creation.toFixed(2)}\n**Random Special Pharma Value:** ${randomSpecialPharma}\n**Random Prepare Potion Value:** ${randomPreparePotion}`)
            .setColor(0x2D72D9);

        // Format the results into a table-like structure
        let resultText = "```\n";
        resultText += "| Item Name                        | Creation | Difficulty | Potions Brewed |\n";
        resultText += "|----------------------------------|----------|------------|----------------|\n";
        results.forEach(item => {
            resultText += `| ${item.name.padEnd(32)} | ${item.creation.padStart(8)} | ${item.difficulty.padStart(10)} | ${item.potionsBrewed.toString().padStart(14)} |\n`;
        });
        resultText += "```";

        // Split the resultText into chunks of less than 1024 characters
        let chunkedResults = [];
        let currentChunk = "";
        const lines = resultText.split("\n");
        lines.forEach(line => {
            if (currentChunk.length + line.length + 1 > 1024) { // +1 for the newline character
                chunkedResults.push(currentChunk);
                currentChunk = line + "\n";
            } else {
                currentChunk += line + "\n";
            }
        });
        if (currentChunk) chunkedResults.push(currentChunk);

        // Add fields for each chunk
        chunkedResults.forEach((chunk, index) => {
            embed.addFields({
                name: `Results (Part ${index + 1})`,
                value: chunk,
            });
        });

        // Send the embed response
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};