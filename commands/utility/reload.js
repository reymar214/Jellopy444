const { SlashCommandBuilder } = require('discord.js');

// Define the allowed user ID
const allowedUserId = '112576229403611136'; // Replace with the actual user ID

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads a command.')
		.addStringOption(option =>
			option.setName('command')
				.setDescription('The command to reload.')
				.setRequired(true)),

	async execute(interaction) {
		// Check if the user's ID matches the allowed user ID
		if (interaction.user.id !== allowedUserId) {
			return interaction.reply('You do not have permission to use this command.');
		}
		
		const commandName = interaction.options.getString('command', true).toLowerCase();

		// Check if the command exists in the commands collection
		if (!interaction.client.commands.has(commandName)) {
			return interaction.reply(`There is no command with name \`${commandName}\`!`);
		}

		// Delete the cached module of the command
		delete require.cache[require.resolve(`./${commandName}.js`)];

		try {
			// Load the new version of the command
			const newCommand = require(`./${commandName}.js`);
			interaction.client.commands.set(newCommand.data.name, newCommand);

			// Reply with a success message
			await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
		} catch (error) {
			console.error(error);
			await interaction.reply(`There was an error while reloading a command \`${commandName}\`:\n\`${error.message}\``);
		}
	},
};
