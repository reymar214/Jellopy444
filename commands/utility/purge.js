const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Purges a specified number of messages')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        // Check if the user has the specific role
        if (!interaction.member.roles.cache.has('1277443531954458634')) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        // Get the amount of messages to purge
        const amount = interaction.options.getInteger('amount');

        // Ensure the amount is a number between 1 and 100
        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: 'Please provide a number between 1 and 100.', ephemeral: true });
        }

        // Purge the messages
        try {
            await interaction.channel.bulkDelete(amount, true);
            return interaction.reply({ content: `${amount} messages have been purged.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'There was an error while trying to purge messages.', ephemeral: true });
        }
    },
};
