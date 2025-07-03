const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/boosterHistory.json');

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getToday() {
  return new Date().toISOString().split('T')[0]; // e.g. "2025-07-03"
}

async function trackBoosters(client) {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  const members = await guild.members.fetch();
  const boosters = members.filter(m => m.premiumSince);
  const data = loadData();
  const today = getToday();

  boosters.forEach(member => {
    const id = member.id;
    const username = member.user.tag;

    if (!data[id]) {
      data[id] = {
        boostedDays: 0,
        lastCounted: '',
        username
      };
    }

    // Only add +1 if not already counted today
    if (data[id].lastCounted !== today) {
      data[id].boostedDays += 1;
      data[id].lastCounted = today;
    }

    data[id].username = username; // Keep username updated
  });

  saveData(data);
  console.log('[Tracker] Booster data updated and saved.');
}

module.exports = { trackBoosters, loadData };
