/**
 * BRIEF 10.0 — TELEGRAM BOT & MINI APP SERVER
 * Headline: Brief connects everything that matters nearby.
 * Public Experience: Everything happening around you.
 */

const TelegramBot = require('node-telegram-bot-api');

// Read environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://brief-town-centre.netlify.app';

if (!BOT_TOKEN) {
  console.error('❌ ERROR: TELEGRAM_BOT_TOKEN environment variable is missing!');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Brief 10.0 Telegram Bot Server running 24/7...');

// Command: /start
bot.onText(/\/start/, (msg) => {
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

  bot.sendMessage(chatId, welcomeMessage, {
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
bot.onText(/\/town|\/app|\/brief/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '📍 Click below to open Brief and explore everything around you:', {
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
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.callback_data;

  if (data === 'cmd_journeys') {
    bot.sendMessage(chatId, '📋 *Active Local Workflows:*\n1. Register & Open a Licensed Food Enterprise\n2. Transition Market Stall to Solar Battery Power\n\nLaunch Brief to track your progress step-by-step.', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 Launch Brief', web_app: { url: MINI_APP_URL } }]]
      }
    });
  } else if (data === 'cmd_health') {
    bot.sendMessage(chatId, '📊 *Local Intelligence Index (Nairobi CBD):*\n• Opportunities Acted On: 184\n• Businesses Helped: 412\n• Events Attended: 620\n• Info Freshness: 97.4%\n\nBrief connects people, places, services, and opportunities so local life is easier to navigate.', {
      parse_mode: 'Markdown'
    });
  }
});
