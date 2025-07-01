const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timestamp')
        .setDescription('Generate Discord timestamps from a date and time'),

    async execute(interaction) {
        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId('timestampModal')
            .setTitle('Create Timestamp');

        // Create text input components
        const dateInput = new TextInputBuilder()
            .setCustomId('dateInput')
            .setLabel('Date (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const timeInput = new TextInputBuilder()
            .setCustomId('timeInput')
            .setLabel('Time (HH:MM)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // Add inputs to modal
        modal.addComponents(
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(timeInput),
        );

        // Show the modal
        await interaction.showModal(modal);

        try {
            // Wait for modal submission
            const submitted = await interaction.awaitModalSubmit({
                filter: (inter) => inter.customId === 'timestampModal',
                time: 60_000,
            });

            // Get input values
            const date = submitted.fields.getTextInputValue('dateInput');
            const time = submitted.fields.getTextInputValue('timeInput');

            // Parse date and time as local time
            const [year, month, day] = date.split('-').map(Number);
            const [hours, minutes] = time.split(':').map(Number);
            const parsedDate = new Date(year, month - 1, day, hours, minutes);

            // Check valid date
            if (isNaN(parsedDate)) {
                await submitted.reply({
                    content: '❌ Invalid date/time format.',
                    ephemeral: true
                });
                return;
            }

            // Convert to Unix timestamp (seconds)
            const unixTimestamp = Math.floor(parsedDate.getTime() / 1000);

            // Create formatted timestamps
            const formats = {
                'Short Time': 't',
                'Long Time': 'T',
                'Short Date': 'd',
                'Long Date': 'D',
                'Short Date/Time': 'f',
                'Long Date/Time': 'F',
                'Relative': 'R',
            };

            const timestampList = Object.entries(formats)
                .map(([name, style]) => `• **${name}**: \`<t:${unixTimestamp}:${style}>\``)
                .join('\n');

            // Send results
            await submitted.reply({
                content: `⏰ **Timestamps for <t:${unixTimestamp}:F>**:\n${timestampList}\n\n` +
                         `**Preview**: <t:${unixTimestamp}:F>`,
                ephemeral: true,
            });

        } catch (error) {
            console.error('Timestamp command error:', error);
            await interaction.followUp({
                content: '❌ Timed out or error occurred.',
                ephemeral: true
            });
        }
    },
};
