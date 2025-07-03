const { ChannelType } = require('discord.js');

const REPORT_CHANNEL_ID = '933970737277046854';
const TAG_USER_ID = '112576229403611136';

async function generateBoosterReport(client) {
  const guild = client.guilds.cache.first(); // Or use client.guilds.fetch('GUILD_ID') if needed
  if (!guild) return;

  const members = await guild.members.fetch();
  const boosters = members.filter(m => m.premiumSince);

  let message = `📅 **Monthly Booster Report – ${new Date().toLocaleDateString()}**\n`;
  message += `🔔 <@${TAG_USER_ID}>, here are the users currently boosting:\n\n`;

  if (boosters.size === 0) {
    message += '❌ No active boosters this month.';
  } else {
    boosters.forEach(member => {
      const boostStart = new Date(member.premiumSince);
      const durationDays = Math.floor((Date.now() - boostStart.getTime()) / (1000 * 60 * 60 * 24));
      const months = Math.floor(durationDays / 30.44);
      const days = Math.floor(durationDays % 30.44);

      message += `• <@${member.id}> – Boosting since <t:${Math.floor(boostStart.getTime() / 1000)}:D> (${months}mo ${days}d)\n`;
    });
  }

  const channel = await client.channels.fetch(REPORT_CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error('Report channel not found or invalid.');
    return;
  }

  await channel.send({ content: message, allowedMentions: { users: [TAG_USER_ID] } });
  console.log(`[Booster Report] Sent successfully on ${new Date().toISOString()}`);
}

module.exports = { generateBoosterReport };