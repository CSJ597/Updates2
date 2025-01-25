# Finlight S&P 500 News Bot

Automatically fetches and posts S&P 500 and ES futures news updates to Discord using the Finlight API.

## Features

- Sends updates three times daily (9:30 AM, 12:00 PM, and 5:00 PM EST)
- Avoids duplicate sources in each update
- Limits to 5 most recent articles per update
- Runs automatically via GitHub Actions

## Setup Instructions

1. Create a new GitHub repository
2. Push this code to your repository
3. Set up GitHub Secrets:
   - Go to your repository's Settings > Secrets and Variables > Actions
   - Add the following secrets:
     - `FINLIGHT_API_KEY`: Your Finlight API key
     - `DISCORD_WEBHOOK_URL`: Your Discord webhook URL

## GitHub Actions Schedule

The bot runs automatically at:
- 9:30 AM EST (Market Open)
- 12:00 PM EST (Mid-Day)
- 5:00 PM EST (Market Close)

You can also trigger the workflow manually from the Actions tab in your repository.

## Development

To run locally:
```bash
# Install dependencies
npm install

# Set environment variables
export FINLIGHT_API_KEY='your_api_key'
export DISCORD_WEBHOOK_URL='your_webhook_url'

# Run the bot
node index.js
```

## Documentation

For more information about the Finlight API, visit:
- [Finlight API Documentation](https://docs.finlight.me/)
- [REST API Endpoints](https://docs.finlight.me/rest-endpoints)
- [WebSocket Documentation](https://docs.finlight.me/websocket-quickstart)
