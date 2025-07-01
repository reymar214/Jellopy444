const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'webhooks.json');

function readWebhooks() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(filePath));
}

function writeWebhooks(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
    readWebhooks,
    writeWebhooks
};