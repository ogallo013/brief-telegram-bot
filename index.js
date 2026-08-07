/**
 * BRIEF 10.0 — TELEGRAM BOT & MINI APP SERVER
 * Headline: Brief connects everything that matters nearby.
 * Public Experience: Everything happening around you.
 *
 * This version supports two modes:
 * - Polling (default): runs continuously and polls Telegram for updates.
 * - Webhook (recommended for many hosting platforms): set WEBHOOK_URL to your public URL
 *   and the server will expose an Express endpoint to receive updates from Telegram.
 */

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// Read environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://brief-town-centre.netlify.app';
const WEBHOOK_URL = process.env.WEBHOOK_URL; // e.g. https://your-domain.com
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('❌ ERROR: TELEGRAM_BOT_TOKEN environment variable is missing!');
  process.exit(1);
}

let bot;

function registerHandlers(botInstance) {
  // Command: /start
  botInstance.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'Friend';

    const welcomeMessage = `
📍 *Brief — Everything happening around you.*

Hello ${userName}! Brief connects everything that matters nearby in Nairobi CBD.

Discover places, opportunities, services and communities, then act immediately:
• Explore local places & markets
• Apply for grants, jobs, and vendor slots
• Check verified business permits & health guides
• Track business setup workflows
`;

    botInstance.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Open Brief (Everything Nearby)',
              web_app: { url: MINI_APP_URL }
            }
          ],
          [
            { text: '📋 Workflows & Setup', callback_data: 'cmd_journeys' },
            { text: '📊 Local Intelligence', callback_data: 'cmd_health' }
          ],
          [
            { text: '🔍 Search Nearby', callback_data: 'cmd_search' }
          ]
        ]
      }
    });
  });

  // Command: /town or /app or /brief
  botInstance.onText(/\/town|\/app|\/brief/, (msg) => {
    const chatId = msg.chat.id;

    botInstance.sendMessage(chatId, '📍 Click below to open Brief and explore everything around you:', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📍 Launch Brief',
              web_app: { url: MINI_APP_URL }
            }
          ]
        ]
      }
    });
  });

  // Handle Callback Queries
  botInstance.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data || query.callback_data;

    if (data === 'cmd_journeys') {
      botInstance.sendMessage(chatId, '📋 *Active Local Workflows:\n1. Register & Open a Licensed Food Enterprise\n2. Transition Market Stall to Solar Battery Power\n\nLaunch Brief to track your progress step-by-step.', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🚀 Launch Brief', web_app: { url: MINI_APP_URL } }]]
        }
      });
    } else if (data === 'cmd_health') {
      botInstance.sendMessage(chatId, '📊 *Local Intelligence Index (Nairobi CBD):*\n• Opportunities Acted On: 184\n• Businesses Helped: 412\n• Events Attended: 620\n• Info Freshness: 97.4%\n\nBrief connects people, places, services, and opportunities so local life is easier to navigate.', {
        parse_mode: 'Markdown'
      });
    }
  });
}

async function start() {
  if (WEBHOOK_URL) {
    // Webhook mode
    bot = new TelegramBot(BOT_TOKEN);
    const webhookPath = `/bot${BOT_TOKEN}`; // secret-ish path
    const fullWebhookUrl = `${WEBHOOK_URL.replace(/\/$/, '')}${webhookPath}`;

    try {
      await bot.setWebHook(fullWebhookUrl);
      console.log(`🤖 Webhook set to ${fullWebhookUrl}`);
    } catch (err) {
      console.error('❌ Failed to set webhook:', err);
      process.exit(1);
    }

    // Register handlers
    registerHandlers(bot);

    // Express app to receive updates
    const app = express();
    app.use(express.json());

    // Health endpoint
    app.get('/', (req, res) => res.send('Brief Telegram Bot — webhook mode.'));

    // Telegram will POST updates to this path
    app.post(webhookPath, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    app.listen(PORT, () => {
      console.log(`🌐 Express server listening on port ${PORT}`);
    });
  } else {
    // Polling mode (default)
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('🤖 Brief 10.0 Telegram Bot Server running in polling mode...');

    registerHandlers(bot);
  }
}

start().catch((err) => {
  console.error('❌ Unexpected error starting bot:', err);
  process.exit(1);
});
