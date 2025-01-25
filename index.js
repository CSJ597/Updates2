import { FinlightApi } from "finlight-client";
import fetch from 'node-fetch';
import cron from 'node-cron';

// Configuration
const FINLIGHT_API_KEY = process.env.FINLIGHT_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SEARCH_QUERIES = ['S&P 500', 'ES futures', 'SPX', 'SPY ETF'];
const MAX_ARTICLES_PER_UPDATE = 5;

// Initialize the Finlight client
const client = new FinlightApi({ apiKey: FINLIGHT_API_KEY });

// Keep track of sent articles and sources
const sentArticles = new Set();
const sourcesThisUpdate = new Set();

async function sendToDiscord(article, timeSlot) {
    try {
        const embed = {
            title: `${timeSlot} Update: ${article.title || 'No Title'}`,
            description: article.description || article.summary || 'No description available',
            url: article.url || article.link,
            color: 3447003,
            timestamp: new Date().toISOString(),
            fields: [
                {
                    name: 'Source',
                    value: article.source || article.publisher || 'Unknown',
                    inline: true
                },
                {
                    name: 'Update Time',
                    value: timeSlot,
                    inline: true
                }
            ]
        };

        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed]
            })
        });

        if (!response.ok) {
            console.error('Discord API Error:', response.status);
        }
    } catch (error) {
        console.error('Error sending to Discord:', error);
    }
}

async function searchAndSendArticles(timeSlot) {
    console.log(`Running ${timeSlot} update...`);
    try {
        // Clear sources for this update
        sourcesThisUpdate.clear();
        
        // Send a header message
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: `🔔 **${timeSlot} Market Update** 🔔`
            })
        });

        let articlesSent = 0;
        let allArticles = [];

        // Collect all articles first
        for (const query of SEARCH_QUERIES) {
            try {
                const response = await client.articles.getBasicArticles({
                    query: query,
                    language: "en"
                });

                const articles = Array.isArray(response) ? response : 
                               response?.articles || 
                               response?.data || 
                               response?.results || 
                               [];

                allArticles = allArticles.concat(articles);
            } catch (error) {
                console.error(`Error searching for query "${query}":`, error);
            }
        }

        // Remove duplicates and sort by date
        allArticles = allArticles
            .filter((article, index, self) => 
                index === self.findIndex((a) => 
                    (a.url || a.link) === (article.url || article.link)
                )
            )
            .sort((a, b) => new Date(b.publishedAt || b.date) - new Date(a.publishedAt || a.date));

        // Process articles
        for (const article of allArticles) {
            if (articlesSent >= MAX_ARTICLES_PER_UPDATE) break;

            const articleId = article.url || article.link;
            const source = article.source || article.publisher || 'Unknown';

            // Skip if we've already sent this article or used this source
            if (sentArticles.has(articleId) || sourcesThisUpdate.has(source)) {
                continue;
            }

            await sendToDiscord(article, timeSlot);
            sentArticles.add(articleId);
            sourcesThisUpdate.add(source);
            articlesSent++;
            
            // Wait a bit between sending articles
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (articlesSent === 0) {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: `No new articles from unique sources for this update.`
                })
            });
        }

        console.log(`Completed ${timeSlot} update - Sent ${articlesSent} articles`);
    } catch (error) {
        console.error('Error in searchAndSendArticles:', error);
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: `⚠️ Error during ${timeSlot} update: ${error.message}`
            })
        });
    }
}

// Run immediately when started
console.log('Running initial update...');
searchAndSendArticles('Initial Update');

// Schedule updates
// 9:30 AM EST
cron.schedule('30 9 * * 1-5', () => {
    searchAndSendArticles('Market Open (9:30 AM EST)');
}, {
    timezone: "America/New_York"
});

// 12:00 PM EST
cron.schedule('0 12 * * 1-5', () => {
    searchAndSendArticles('Mid-Day (12:00 PM EST)');
}, {
    timezone: "America/New_York"
});

// 5:00 PM EST
cron.schedule('0 17 * * 1-5', () => {
    searchAndSendArticles('Market Close (5:00 PM EST)');
}, {
    timezone: "America/New_York"
});

// Clear article history at midnight
cron.schedule('0 0 * * *', () => {
    sentArticles.clear();
    console.log('Cleared article history');
}, {
    timezone: "America/New_York"
});

console.log('S&P 500/ES news monitoring started...');
console.log('Scheduled updates:');
console.log('- Market Open: 9:30 AM EST');
console.log('- Mid-Day: 12:00 PM EST');
console.log('- Market Close: 5:00 PM EST');
