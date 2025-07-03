const { ChannelType } = require('discord.js');
const { loadData } = require('./boosterTracker'); // Make sure this path is correct

const REPORT_CHANNEL_ID = '933970737277046854';
const TAG_USER_ID = '112576229403611136';


async function generateBoosterReport(client) {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  const data = loadData();

  let message = `📅 **Monthly Booster Report – ${new Date().toLocaleDateString()}**\n`;
  message += `🔔 <@${TAG_USER_ID}>, here are the users currently boosting:\n\n`;

  const eligible = Object.entries(data).filter(([_, info]) => info.boostedDays >= 15);

  if (eligible.length === 0) {
    message += '❌ No eligible boosters this month.';
  } else {
    for (const [id, info] of eligible) {
      message += `• <@${id}> – **${info.boostedDays} day${info.boostedDays !== 1 ? 's' : ''}** (${info.username})\n`;
    }
  }

  const channel = await client.channels.fetch(REPORT_CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error('Report channel not found or invalid.');
    return;
  }

  await channel.send({
    content: message,
    allowedMentions: {
      parse: [] // disables all pings, even if message includes <@id>
    }
  });

  console.log(`[Booster Report] Sent successfully on ${new Date().toISOString()}`);
}

module.exports = { generateBoosterReport };
