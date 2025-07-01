const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

const EVENTS_FILE = path.join(__dirname, 'events.json');

// Helper function to save events to a JSON file
const saveEvent = (eventData) => {
    let events = [];
    if (fs.existsSync(EVENTS_FILE)) {
        events = JSON.parse(fs.readFileSync(EVENTS_FILE));
    }
    events.push(eventData);
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
};

// Helper function to load events from a JSON file
const loadEvents = () => {
    if (fs.existsSync(EVENTS_FILE)) {
        return JSON.parse(fs.readFileSync(EVENTS_FILE));
    }
    return [];
};

// Helper function to remove an event from the JSON file
const removeEvent = (messageId) => {
    let events = [];
    if (fs.existsSync(EVENTS_FILE)) {
        events = JSON.parse(fs.readFileSync(EVENTS_FILE));
    }
    events = events.filter(event => event.messageId !== messageId);
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
};

// Helper to create a well-formatted participants list
const formatParticipantsList = (yesUsers, noUsers, maybeUsers) => {
    const maxLength = Math.max(yesUsers.length, noUsers.length, maybeUsers.length);
    
    if (maxLength === 0) {
        return "No participants yet.";
    }
    
    // Calculate max username length for better spacing
    const allUsers = [...yesUsers, ...noUsers, ...maybeUsers];
    const maxNameLength = allUsers.length > 0 
        ? Math.min(Math.max(...allUsers.map(name => name.length)), 15) 
        : 10;
    
    // Create header
    let result = `\`\`\`md
# PARTICIPANTS LIST
${"━".repeat(50)}
✅ ATTENDING [${yesUsers.length}] | ❌ DECLINED [${noUsers.length}] | 🤔 MAYBE [${maybeUsers.length}]
${"━".repeat(50)}\n\n`;

    // Create separated sections for better readability
    if (yesUsers.length > 0) {
        result += "✅ ATTENDING:\n";
        yesUsers.forEach((name, index) => {
            // Truncate long names and add index number
            const displayName = name.length > 15 ? name.substring(0, 12) + "..." : name;
            result += `${(index + 1).toString().padStart(2, ' ')}. ${displayName}\n`;
        });
        result += "\n";
    }
    
    if (noUsers.length > 0) {
        result += "❌ DECLINED:\n";
        noUsers.forEach((name, index) => {
            const displayName = name.length > 15 ? name.substring(0, 12) + "..." : name;
            result += `${(index + 1).toString().padStart(2, ' ')}. ${displayName}\n`;
        });
        result += "\n";
    }
    
    if (maybeUsers.length > 0) {
        result += "🤔 MAYBE:\n";
        maybeUsers.forEach((name, index) => {
            const displayName = name.length > 15 ? name.substring(0, 12) + "..." : name;
            result += `${(index + 1).toString().padStart(2, ' ')}. ${displayName}\n`;
        });
    }
    
    result += "```";
    return result;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('Create a new event schedule'),

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('scheduleModal')
            .setTitle('Create an Event');

        const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Event Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Event Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const dateInput = new TextInputBuilder()
            .setCustomId('date')
            .setLabel('Event Date (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const timeInput = new TextInputBuilder()
            .setCustomId('time')
            .setLabel('Event Time (HH:MM, 24-hour format)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(timeInput)
        );

        await interaction.showModal(modal);
    },

    async modalSubmit(interaction) {
        if (interaction.customId !== 'scheduleModal') return;

        // Acknowledge the interaction promptly
        await interaction.deferReply({ ephemeral: true });

        try {
            const title = interaction.fields.getTextInputValue('title');
            const description = interaction.fields.getTextInputValue('description');
            const date = interaction.fields.getTextInputValue('date');
            const time = interaction.fields.getTextInputValue('time');

            const eventDateTime = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
            if (!eventDateTime.isValid()) {
                return await interaction.editReply({ content: '❌ Invalid date or time format. Please ensure the format is correct.' });
            }

            if (eventDateTime.isBefore(moment())) {
                return await interaction.editReply({ content: '❌ Event date must be in the future. Please choose a valid date.' });
            }

            const originalEventTime = eventDateTime.clone();
            const creatorId = interaction.user.id;
            const creatorName = interaction.user.username;
            
            // Create initial embed with nice formatting
            const embed = new EmbedBuilder()
                .setColor(0x2D72D9)
                .setTitle(`📢 ${title}`)
                .addFields(
                    { name: 'Description', value: description },
                    { name: 'Scheduled for', value: originalEventTime.format('dddd, MMMM D, YYYY - HH:mm') },
                    { name: 'Created by', value: `<@${creatorId}>` },
                    { name: 'Status', value: 'Waiting for start...' }
                )
                .setTimestamp();

            if (title.toLowerCase().includes('woe') || title.toLowerCase().includes('war of emperium')) {
                embed.setImage('https://static.wikia.nocookie.net/ragnarok_gamepedia_en/images/6/66/RO_WarOfEmperium.png/revision/latest?cb=20161103202110');
            }

            // Send the embed confirming the creation of the event
            const eventMessage = await interaction.channel.send({
                content: '📅 **New Event Scheduled!** React to indicate your attendance:',
                embeds: [embed]
            });

            await Promise.all([
                eventMessage.react('✅'), // Attending
                eventMessage.react('❌'), // Not attending
                eventMessage.react('🤔'), // Maybe
                eventMessage.react('🚫')  // Cancel event (creator only)
            ]);

            await interaction.editReply({ content: '✅ Event created successfully!' });

            const eventData = {
                title,
                description,
                date,
                time,
                creatorId,
                creatorName,
                channelId: interaction.channel.id,
                messageId: eventMessage.id,
                createdAt: new Date().toISOString()
            };

            saveEvent(eventData);

            // Reminder and reaction handling
            const reminderTime = originalEventTime.clone().subtract(5, 'minutes');
            const timeUntilReminder = reminderTime.diff(moment(), 'milliseconds');

            let reminderTimeout;
            if (timeUntilReminder > 0) {
                reminderTimeout = setTimeout(async () => {
                    // Get current participant lists for more detailed reminder
                    const reactions = await eventMessage.reactions.cache;
                    const yesReaction = reactions.get('✅');
                    let participantsCount = 0;
                    
                    if (yesReaction) {
                        const users = await yesReaction.users.fetch();
                        participantsCount = users.filter(user => !user.bot).size;
                    }
                    
                    const reminderEmbed = new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle(`⏰ Reminder: ${title}`)
                        .setDescription(`Event is starting in 5 minutes!\n${participantsCount} participant(s) have confirmed attendance.`)
                        .addFields(
                            { name: 'Description', value: description },
                            { name: 'Starts at', value: originalEventTime.format('HH:mm') }
                        );
                    
                    await interaction.channel.send({
                        content: `<@${creatorId}> Your event is starting soon!`,
                        embeds: [reminderEmbed]
                    });
                }, timeUntilReminder);
            }

            const filter = (reaction, user) => ['✅', '❌', '🤔', '🚫'].includes(reaction.emoji.name);
            const reactedUsers = {
                '✅': new Set(),
                '❌': new Set(),
                '🤔': new Set()
            };

            const collector = eventMessage.createReactionCollector({ filter, time: 86400000 });
            let countdownInterval;

            collector.on('collect', async (reaction, user) => {
                if (user.bot) return;

                // Handle cancellation
                if (reaction.emoji.name === '🚫') {
                    if (user.id !== creatorId) {
                        await reaction.users.remove(user.id);
                        return;
                    }

                    clearTimeout(reminderTimeout);
                    clearInterval(countdownInterval);
                    collector.stop();
                    
                    const cancelEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle(`❌ Event Cancelled: ${title}`)
                        .setDescription(`This event has been cancelled by the creator.`)
                        .setTimestamp();
                    
                    await eventMessage.edit({
                        content: '**EVENT CANCELLED**',
                        embeds: [cancelEmbed]
                    });
                    
                    await interaction.channel.send({
                        content: `❌ Event **${title}** has been cancelled by <@${creatorId}>.`
                    });
                    
                    removeEvent(eventMessage.id);
                    return;
                }

                // Handle other reactions - ensure users are only in one category
                for (const emoji of ['✅', '❌', '🤔']) {
                    if (emoji !== reaction.emoji.name && reactedUsers[emoji].has(user.id)) {
                        reactedUsers[emoji].delete(user.id);
                        const previousReaction = eventMessage.reactions.cache.get(emoji);
                        if (previousReaction) await previousReaction.users.remove(user.id);
                    }
                }

                reactedUsers[reaction.emoji.name].add(user.id);
                updateEmbed();
            });

            collector.on('remove', async (reaction, user) => {
                if (user.bot || reaction.emoji.name === '🚫') return;
                reactedUsers[reaction.emoji.name].delete(user.id);
                updateEmbed();
            });

            // Function to update the embed with current information
            const updateEmbed = async () => {
                try {
                    const now = moment();
                    const timeDifference = originalEventTime.diff(now, 'seconds');

                    // Format countdown display
                    let timeRemainingMessage = '**Event is LIVE now!**';
                    let statusColor = 0x00FF00; // Green for live events
                    
                    if (timeDifference > 0) {
                        const duration = moment.duration(timeDifference, 'seconds');
                        const parts = [];
                        if (duration.days() > 0) parts.push(`${duration.days()}d`);
                        if (duration.hours() > 0) parts.push(`${duration.hours()}h`);
                        if (duration.minutes() > 0) parts.push(`${duration.minutes()}m`);
                        if (duration.seconds() > 0 && parts.length === 0) parts.push(`${duration.seconds()}s`);
                        
                        timeRemainingMessage = `**Starts in: ${parts.join(' ')}**`;
                        
                        // Color coding based on time remaining
                        if (timeDifference < 300) { // Less than 5 minutes
                            statusColor = 0xFFA500; // Orange
                        } else {
                            statusColor = 0x2D72D9; // Blue (default)
                        }
                    }

                    // Fetch display names for all users who reacted
                    const yesUsers = [];
                    const noUsers = [];
                    const maybeUsers = [];

                    // Get member objects and extract their display names
                    const fetchUserName = async (id) => {
                        try {
                            const member = await interaction.channel.guild.members.fetch(id);
                            return member.displayName;
                        } catch (error) {
                            return `User-${id.slice(0, 4)}`;
                        }
                    };

                    // Process all reactions in parallel for better performance
                    const yesPromises = Array.from(reactedUsers['✅']).map(fetchUserName);
                    const noPromises = Array.from(reactedUsers['❌']).map(fetchUserName);
                    const maybePromises = Array.from(reactedUsers['🤔']).map(fetchUserName);
                    
                    const [yesNames, noNames, maybeNames] = await Promise.all([
                        Promise.all(yesPromises),
                        Promise.all(noPromises),
                        Promise.all(maybePromises)
                    ]);
                    
                    // Sort names alphabetically for better readability
                    yesUsers.push(...yesNames.sort());
                    noUsers.push(...noNames.sort());
                    maybeUsers.push(...maybeNames.sort());

                    // Create participant display with the nice formatting function
                    const participantsList = formatParticipantsList(yesUsers, noUsers, maybeUsers);
                    
                    // Update the embed with current information
                    const updatedEmbed = new EmbedBuilder()
                        .setColor(statusColor)
                        .setTitle(`📢 ${title}`)
                        .setDescription(description)
                        .addFields(
                            { name: 'Scheduled for', value: originalEventTime.format('dddd, MMMM D, YYYY - HH:mm') },
                            { name: 'Status', value: timeRemainingMessage },
                            { name: 'Created by', value: `<@${creatorId}>` },
                            { name: 'Participants', value: participantsList }
                        )
                        .setTimestamp();

                    if (title.toLowerCase().includes('woe') || title.toLowerCase().includes('war of emperium')) {
                        updatedEmbed.setImage('https://static.wikia.nocookie.net/ragnarok_gamepedia_en/images/6/66/RO_WarOfEmperium.png/revision/latest?cb=20161103202110');
                    }

                    await eventMessage.edit({ embeds: [updatedEmbed] });

                    // Check if the event time has passed and remove the event
                    if (timeDifference <= 0) {
                        clearInterval(countdownInterval);
                        
                        // After 30 minutes, mark the event as completed
                        setTimeout(async () => {
                            const completedEmbed = new EmbedBuilder()
                                .setColor(0x808080) // Gray for completed events
                                .setTitle(`✓ Completed: ${title}`)
                                .setDescription(`This event has ended.\nFinal participants: ${yesUsers.length}`)
                                .setTimestamp();
                            
                            await eventMessage.edit({ 
                                content: '**EVENT COMPLETED**',
                                embeds: [completedEmbed] 
                            });
                            
                            removeEvent(eventMessage.id);
                        }, 1800000); // 30 minutes after event start
                    }
                } catch (error) {
                    console.error('Error updating embed:', error);
                }
            };

            // Countdown management with dynamic intervals
            const updateCountdown = () => {
                const now = moment();
                const timeDifference = originalEventTime.diff(now, 'seconds');

                if (timeDifference <= 0) {
                    clearInterval(countdownInterval);
                    updateEmbed();
                    return;
                }

                // Dynamic update intervals based on time remaining
                let newInterval;
                if (timeDifference > 86400) { // More than 1 day
                    newInterval = 3600000; // Update hourly
                } else if (timeDifference > 3600) { // More than 1 hour
                    newInterval = 300000; // Update every 5 minutes
                } else if (timeDifference > 300) { // More than 5 minutes
                    newInterval = 60000; // Update every minute
                } else {
                    newInterval = 1000; // Update every second for the final countdown
                }

                if (!countdownInterval || countdownInterval._idleTimeout !== newInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = setInterval(() => {
                        updateEmbed();
                        updateCountdown();
                    }, newInterval);
                }
            };

            // Initialize by running update once
            await updateEmbed();
            updateCountdown();

        } catch (error) {
            console.error('Error handling event creation:', error);
            await interaction.editReply({ content: '❌ An error occurred while creating the event.' });
        }
    }
};

// Function to load and resume events on bot startup
const resumeEvents = async (client) => {
    const events = loadEvents();
    for (const eventData of events) {
        try {
            const channel = await client.channels.fetch(eventData.channelId);
            const eventMessage = await channel.messages.fetch(eventData.messageId);
            const originalEventTime = moment(`${eventData.date} ${eventData.time}`, 'YYYY-MM-DD HH:mm');

            // Skip events that are more than 1 hour past already
            if (originalEventTime.isBefore(moment().subtract(1, 'hour'))) {
                removeEvent(eventData.messageId);
                console.log(`Removing expired event: ${eventData.title}`);
                continue;
            }

            // Create initial embed with placeholder data
            const embed = new EmbedBuilder()
                .setColor(0x2D72D9)
                .setTitle(`📢 ${eventData.title}`)
                .setDescription(eventData.description)
                .addFields(
                    { name: 'Scheduled for', value: originalEventTime.format('dddd, MMMM D, YYYY - HH:mm') },
                    { name: 'Status', value: 'Reconnecting...' },
                    { name: 'Created by', value: `<@${eventData.creatorId}>` }
                )
                .setTimestamp();

            if (eventData.title.toLowerCase().includes('woe') || eventData.title.toLowerCase().includes('war of emperium')) {
                embed.setImage('https://static.wikia.nocookie.net/ragnarok_gamepedia_en/images/6/66/RO_WarOfEmperium.png/revision/latest?cb=20161103202110');
            }

            // Setup reminder if applicable
            const reminderTime = originalEventTime.clone().subtract(5, 'minutes');
            const timeUntilReminder = reminderTime.diff(moment(), 'milliseconds');

            let reminderTimeout;
            if (timeUntilReminder > 0) {
                reminderTimeout = setTimeout(async () => {
                    const reminderEmbed = new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle(`⏰ Reminder: ${eventData.title}`)
                        .setDescription(`Event is starting in 5 minutes!`)
                        .addFields(
                            { name: 'Description', value: eventData.description },
                            { name: 'Starts at', value: originalEventTime.format('HH:mm') }
                        );
                    
                    await channel.send({
                        content: `<@${eventData.creatorId}> Your event is starting soon!`,
                        embeds: [reminderEmbed]
                    });
                }, timeUntilReminder);
            }

            const filter = (reaction, user) => ['✅', '❌', '🤔', '🚫'].includes(reaction.emoji.name);
            const reactedUsers = {
                '✅': new Set(),
                '❌': new Set(),
                '🤔': new Set()
            };

            // Recheck reactions on the message after restart
            for (const reaction of eventMessage.reactions.cache.values()) {
                const users = await reaction.users.fetch();
                users.filter(user => !user.bot).forEach(user => {
                    if (reaction.emoji.name === '✅') reactedUsers['✅'].add(user.id);
                    if (reaction.emoji.name === '❌') reactedUsers['❌'].add(user.id);
                    if (reaction.emoji.name === '🤔') reactedUsers['🤔'].add(user.id);
                });
            }

            const collector = eventMessage.createReactionCollector({ filter, time: 86400000 });
            let countdownInterval;

            collector.on('collect', async (reaction, user) => {
                if (user.bot) return;

                // Handle cancellation
                if (reaction.emoji.name === '🚫') {
                    if (user.id !== eventData.creatorId) {
                        await reaction.users.remove(user.id);
                        return;
                    }

                    clearTimeout(reminderTimeout);
                    clearInterval(countdownInterval);
                    collector.stop();
                    
                    const cancelEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle(`❌ Event Cancelled: ${eventData.title}`)
                        .setDescription(`This event has been cancelled by the creator.`)
                        .setTimestamp();
                    
                    await eventMessage.edit({
                        content: '**EVENT CANCELLED**',
                        embeds: [cancelEmbed]
                    });
                    
                    await channel.send({
                        content: `❌ Event **${eventData.title}** has been cancelled by <@${eventData.creatorId}>.`
                    });
                    
                    removeEvent(eventMessage.id);
                    return;
                }

                // Handle other reactions
                for (const emoji of ['✅', '❌', '🤔']) {
                    if (emoji !== reaction.emoji.name && reactedUsers[emoji].has(user.id)) {
                        reactedUsers[emoji].delete(user.id);
                        const previousReaction = eventMessage.reactions.cache.get(emoji);
                        if (previousReaction) await previousReaction.users.remove(user.id);
                    }
                }

                reactedUsers[reaction.emoji.name].add(user.id);
                updateEmbed();
            });

            collector.on('remove', async (reaction, user) => {
                if (user.bot || reaction.emoji.name === '🚫') return;
                reactedUsers[reaction.emoji.name].delete(user.id);
                updateEmbed();
            });

            // Function to update the embed with current information
            const updateEmbed = async () => {
                try {
                    const now = moment();
                    const timeDifference = originalEventTime.diff(now, 'seconds');

                    // Format countdown display
                    let timeRemainingMessage = '**Event is LIVE now!**';
                    let statusColor = 0x00FF00; // Green for live events
                    
                    if (timeDifference > 0) {
                        const duration = moment.duration(timeDifference, 'seconds');
                        const parts = [];
                        if (duration.days() > 0) parts.push(`${duration.days()}d`);
                        if (duration.hours() > 0) parts.push(`${duration.hours()}h`);
                        if (duration.minutes() > 0) parts.push(`${duration.minutes()}m`);
                        if (duration.seconds() > 0 && parts.length === 0) parts.push(`${duration.seconds()}s`);
                        
                        timeRemainingMessage = `**Starts in: ${parts.join(' ')}**`;
                        
                        // Color coding based on time remaining
                        if (timeDifference < 300) { // Less than 5 minutes
                            statusColor = 0xFFA500; // Orange
                        } else {
                            statusColor = 0x2D72D9; // Blue (default)
                        }
                    }

                    // Fetch display names for all users who reacted
                    const yesUsers = [];
                    const noUsers = [];
                    const maybeUsers = [];

                    // Get member objects and extract their display names
                    const fetchUserName = async (id) => {
                        try {
                            const member = await channel.guild.members.fetch(id);
                            return member.displayName;
                        } catch (error) {
                            return `User-${id.slice(0, 4)}`;
                        }
                    };

                    // Process all reactions in parallel for better performance
                    const yesPromises = Array.from(reactedUsers['✅']).map(fetchUserName);
                    const noPromises = Array.from(reactedUsers['❌']).map(fetchUserName);
                    const maybePromises = Array.from(reactedUsers['🤔']).map(fetchUserName);
                    
                    const [yesNames, noNames, maybeNames] = await Promise.all([
                        Promise.all(yesPromises),
                        Promise.all(noPromises),
                        Promise.all(maybePromises)
                    ]);
                    
                    // Sort names alphabetically for better readability
                    yesUsers.push(...yesNames.sort());
                    noUsers.push(...noNames.sort());
                    maybeUsers.push(...maybeNames.sort());

                    // Create participant display with the nice formatting function
                    const participantsList = formatParticipantsList(yesUsers, noUsers, maybeUsers);
                    
                    // Update the embed with current information
                    const updatedEmbed = new EmbedBuilder()
                        .setColor(statusColor)
                        .setTitle(`📢 ${eventData.title}`)
                        .setDescription(eventData.description)
                        .addFields(
                            { name: 'Scheduled for', value: originalEventTime.format('dddd, MMMM D, YYYY - HH:mm') },
                            { name: 'Status', value: timeRemainingMessage },
                            { name: 'Created by', value: `<@${eventData.creatorId}>` },
                            { name: 'Participants', value: participantsList }
                        )
                        .setTimestamp();

                    if (eventData.title.toLowerCase().includes('woe') || eventData.title.toLowerCase().includes('war of emperium')) {
                        updatedEmbed.setImage('https://static.wikia.nocookie.net/ragnarok_gamepedia_en/images/6/66/RO_WarOfEmperium.png/revision/latest?cb=20161103202110');
                    }

                    await eventMessage.edit({ embeds: [updatedEmbed] });

                    // Check if the event time has passed and remove the event
                    if (timeDifference <= 0) {
                        clearInterval(countdownInterval);
                        
                        // After 30 minutes, mark the event as completed
                        setTimeout(async () => {
                            const completedEmbed = new EmbedBuilder()
                                .setColor(0x808080) // Gray for completed events
                                .setTitle(`✓ Completed: ${eventData.title}`)
                                .setDescription(`This event has ended.\nFinal participants: ${yesUsers.length}`)
                                .setTimestamp();
                            
                            await eventMessage.edit({ 
                                content: '**EVENT COMPLETED**',
                                embeds: [completedEmbed] 
                            });
                            
                            removeEvent(eventMessage.id);
                        }, 1800000); // 30 minutes after event start
                    }
                } catch (error) {
                    console.error('Error updating embed:', error);
                }
            };

            // Countdown management with dynamic intervals
            const updateCountdown = () => {
                const now = moment();
                const timeDifference = originalEventTime.diff(now, 'seconds');

                if (timeDifference <= 0) {
                    clearInterval(countdownInterval);
                    updateEmbed();
                    return;
                }

                // Dynamic update intervals based on time remaining
                let newInterval;
                if (timeDifference > 86400) { // More than 1 day
                    newInterval = 3600000; // Update hourly
                } else if (timeDifference > 3600) { // More than 1 hour
                    newInterval = 300000; // Update every 5 minutes
                } else if (timeDifference > 300) { // More than 5 minutes
                    newInterval = 60000; // Update every minute
                } else {
                    newInterval = 1000; // Update every second for the final countdown
                }

                if (!countdownInterval || countdownInterval._idleTimeout !== newInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = setInterval(() => {
                        updateEmbed();
                        updateCountdown();
                    }, newInterval);
                }
            };

            // Initialize by running update once
            await updateEmbed();
            updateCountdown();
        } catch (error) {
            console.error('Error resuming event:', error);
            if (error.code === 10008) { // Unknown Message
                removeEvent(eventData.messageId);
                console.log(`Event with messageId ${eventData.messageId} removed due to missing message.`);
            }
        }
    }
};

module.exports.resumeEvents = resumeEvents;