// utils.js
const axios = require('axios');

// In-memory LRU cache for images (limits size and expiration)
const imageCache = new Map();
const CACHE_SIZE = 50; // Limits cache to 50 images
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Clean up expired or excess cache entries
function trimImageCache() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [url, { timestamp }] of imageCache) {
        if (now - timestamp > CACHE_TTL) {
            keysToDelete.push(url);
        }
    }

    keysToDelete.forEach(url => imageCache.delete(url));

    if (imageCache.size > CACHE_SIZE) {
        const oldestKey = [...imageCache.entries()]
            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
        imageCache.delete(oldestKey);
    }
}

// Precompiled regex for efficiency
const cleanupRegex = /["{}]|\^\w+|,$/g;
const fieldFormattingRegex = /\b(Class|Defense|Attack|Weight|Required Level|Jobs)\b\s*:/g;

// Function to clean up description lines
function cleanDescriptionLine(line) {
    return line.trim().replace(cleanupRegex, '');
}

// Function to split descriptions into Discord-friendly chunks (max 1024 chars per chunk)
function splitDescription(descriptionLines, maxLength = 1024) {
    const chunks = [];
    let currentChunk = '';

    for (const line of descriptionLines) {
        const cleanedLine = cleanDescriptionLine(line);
        if (currentChunk.length + cleanedLine.length + 1 > maxLength) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = cleanedLine + '\n';
        } else {
            currentChunk += cleanedLine + '\n';
        }
    }

    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
}

// Function to fetch and cache images with retries
async function fetchAndCacheImage(imageUrl, maxRetries = 3, delay = 1000) {
    trimImageCache();

    if (imageCache.has(imageUrl)) {
        return imageCache.get(imageUrl);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(imageUrl, { 
                responseType: 'arraybuffer',
                timeout: 5000,
            });

            if (response.status === 200) {
                const imageData = {
                    url: imageUrl,
                    data: response.data,
                    timestamp: Date.now(),
                };
                imageCache.set(imageUrl, imageData);
                return imageData;
            }

            console.warn(`Retry ${attempt}/${maxRetries} for image ${imageUrl} (status: ${response.status})`);
            await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
        } catch (error) {
            console.warn(`Retry ${attempt}/${maxRetries} for image ${imageUrl}:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }

    console.error(`Failed to fetch image ${imageUrl} after ${maxRetries} attempts`);
    return null;
}

// Function to format description chunks for embeds
function formatDescriptionChunks(descriptionChunks) {
    return descriptionChunks.map(chunk => chunk.replace(fieldFormattingRegex, '**$&**'));
}

module.exports = {
    cleanDescriptionLine,
    splitDescription,
    fetchAndCacheImage,
    formatDescriptionChunks,
};
