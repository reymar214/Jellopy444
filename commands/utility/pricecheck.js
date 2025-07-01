const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { chromium } = require('playwright');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('questlog-pw')
        .setDescription('Fetch item prices from QuestLog.gg using Playwright')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item identifier (e.g., staff_aa_t5_boss_003)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('server')
                .setDescription('Server region')
                .addChoices(
                    { name: 'Global', value: 'en' },
                    { name: 'Korea', value: 'ko' },
                    { name: 'Japan', value: 'jp' }
                )
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const itemId = interaction.options.getString('item');
        const server = interaction.options.getString('server') || 'en';
        const url = `https://questlog.gg/throne-and-liberty/${server}/db/item/${itemId}`;
        
        let browser;
        let context;
        let page;
        
        try {
            // Launch browser with Playwright
            browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
            
            // Create context with realistic settings
            context = await browser.newContext({
                viewport: { width: 1366, height: 768 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                extraHTTPHeaders: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            });
            
            page = await context.newPage();
            
            console.log(`Navigating to: ${url}`);
            
            // Navigate with timeout handling
            try {
                await page.goto(url, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 30000 
                });
                
                // Wait for page to be interactive
                await page.waitForLoadState('domcontentloaded');
                await page.waitForTimeout(3000);
                
            } catch (navError) {
                console.log('Navigation error, trying simpler approach:', navError.message);
                
                // Fallback navigation
                await page.goto(url, { timeout: 20000 });
                await page.waitForTimeout(2000);
            }
            
            // Check if we got a valid page
            const title = await page.title();
            console.log(`Page title: ${title}`);
            
            // Extract data
            const itemData = await page.evaluate(() => {
                const data = {
                    name: 'Unknown Item',
                    minPrice: 'N/A',
                    avgPrice: 'N/A',
                    inStock: 'N/A',
                    priceChange: 'N/A',
                    debug: {
                        pageTitle: document.title,
                        bodyExists: !!document.body,
                        textLength: document.body ? document.body.innerText.length : 0
                    }
                };
                
                if (!document.body) {
                    return data;
                }
                
                // Get item name from various sources
                const titleSelectors = [
                    'h1', 'h2', 'h3',
                    '[class*="item-name"]', '[class*="title"]', '[class*="name"]',
                    '[data-testid*="name"]', '[data-testid*="title"]'
                ];
                
                for (const selector of titleSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        const text = element.textContent.trim();
                        if (text.length > 2 && !text.match(/^\d+$/)) {
                            data.name = text;
                            break;
                        }
                    }
                }
                
                // Get all text for parsing
                const fullText = document.body.innerText || document.body.textContent || '';
                data.debug.textSample = fullText.substring(0, 300);
                
                // Enhanced price extraction
                const priceRegexes = [
                    // Look for labeled prices
                    /(?:Min|Minimum)\s*Price[:\s]*([0-9,]+)/gi,
                    /(?:Avg|Average)\s*Price[:\s]*([0-9,]+)/gi,
                    /Price[:\s]*([0-9,]+)/gi,
                    // Look for currency-like numbers
                    /\$?\s*([0-9]{1,3}(?:,[0-9]{3})+)/g,
                    // Look for large numbers that could be prices
                    /\b([0-9]{4,})\b/g
                ];
                
                const foundNumbers = new Set();
                
                priceRegexes.forEach(regex => {
                    let match;
                    while ((match = regex.exec(fullText)) !== null) {
                        if (match[1]) {
                            const cleanNumber = match[1].replace(/,/g, '');
                            const num = parseInt(cleanNumber);
                            // Filter reasonable price ranges (100 to 1 billion)
                            if (num >= 100 && num <= 1000000000) {
                                foundNumbers.add(match[1]);
                            }
                        }
                    }
                });
                
                const priceArray = Array.from(foundNumbers);
                if (priceArray.length > 0) {
                    data.minPrice = priceArray[0];
                    if (priceArray.length > 1) {
                        data.avgPrice = priceArray[1];
                    }
                }
                
                // Look for percentage changes
                const percentRegex = /-?\d+\.?\d*%/g;
                const percentMatches = fullText.match(percentRegex);
                if (percentMatches && percentMatches.length > 0) {
                    data.priceChange = percentMatches[0];
                }
                
                // Look for stock numbers
                const stockRegexes = [
                    /(\d+)\s*(?:In Stock|Available|Stock)/gi,
                    /Stock[:\s]*(\d+)/gi,
                    /Available[:\s]*(\d+)/gi
                ];
                
                for (const regex of stockRegexes) {
                    const match = fullText.match(regex);
                    if (match && match[1]) {
                        data.inStock = match[1];
                        break;
                    }
                }
                
                data.debug.foundPrices = priceArray;
                
                return data;
            });
            
            console.log('Extracted data:', itemData);
            
            await browser.close();
            
            // Create Discord embed
            const embed = new EmbedBuilder()
                .setTitle(`🗡️ ${itemData.name}`)
                .setURL(url)
                .setColor(itemData.minPrice !== 'N/A' ? 0x2ecc71 : 0xf39c12)
                .setDescription(`Item ID: \`${itemId}\``)
                .addFields(
                    { name: '💰 Min Price', value: itemData.minPrice, inline: true },
                    { name: '📈 Avg Price', value: itemData.avgPrice, inline: true },
                    { name: '📦 In Stock', value: itemData.inStock, inline: true },
                    { name: '📊 Price Change', value: itemData.priceChange, inline: true }
                )
                .setFooter({ text: `QuestLog.gg • Server: ${server.toUpperCase()} • Playwright` })
                .setTimestamp();
            
            // Add debug info if scraping failed
            if (itemData.minPrice === 'N/A' && itemData.avgPrice === 'N/A') {
                embed.addFields({
                    name: '🔍 Debug Info',
                    value: `Page Title: ${itemData.debug.pageTitle}\nText Length: ${itemData.debug.textLength}\nSample: ${itemData.debug.textSample}`.substring(0, 1000),
                    inline: false
                });
            }
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Playwright scraping error:', error);
            
            // Clean up
            try {
                if (browser) await browser.close();
            } catch (e) {
                console.error('Browser cleanup error:', e);
            }
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Playwright Scraping Failed')
                .setDescription(`Could not fetch data for: \`${itemId}\`\n\n**Troubleshooting:**\n• Verify the item ID is correct\n• Check if the site is accessible\n• Try the Puppeteer version instead`)
                .addFields(
                    { name: 'URL', value: url },
                    { name: 'Error', value: error.message.substring(0, 900) }
                )
                .setColor(0xe74c3c);
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};