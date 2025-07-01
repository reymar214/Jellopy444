const fs = require('fs');

// Read the iteminfo.txt file
fs.readFile('iteminfo.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Create an object to store our item mapping
  const itemMapping = {};
  
  // Regular expression to match item entries
  // This looks for patterns like [501] = { ... identifiedDisplayName = "Red Potion", ...
  const itemRegex = /\[(\d+)\]\s*=\s*{[^}]*identifiedDisplayName\s*=\s*"([^"]+)"/g;
  
  // Find all matches
  let match;
  while ((match = itemRegex.exec(data)) !== null) {
    const itemId = match[1];
    const itemName = match[2];
    
    // Add to our mapping
    itemMapping[itemId] = {
      name: itemName
    };
  }
  
  // Write the mapping to a JSON file
  fs.writeFile('iteminfo.json', JSON.stringify(itemMapping, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully created iteminfo.json with', Object.keys(itemMapping).length, 'items');
  });
});