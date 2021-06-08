const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.on('text', msg => {
    const firstName = msg.from.first_name;
    const chatId = msg.chat.id;
    const msgText = msg.text;

    bot.sendMessage(chatId, `Hello ${ firstName }! You said "${ msgText }"!`);
});
