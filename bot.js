const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.on('text', async msg => {
    const firstName = msg.from.first_name;
    const chatId = msg.chat.id;
    const chatMembersCount = await bot.getChatMembersCount(chatId);

    bot.sendMessage(chatId, `Hello ${ firstName }! There are ${ chatMembersCount } members in this chat.`);
});

module.exports = bot;
