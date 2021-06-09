const admin = require('firebase-admin');
const moment = require('moment');
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

/*bot.on('text', async msg => {
    const firstName = msg.from.first_name;
    const chatId = msg.chat.id;
    const chatMembersCount = await bot.getChatMembersCount(chatId);

    bot.sendMessage(chatId, `Hello ${ firstName }! There are ${ chatMembersCount } members in this chat.`);
});*/

bot.onText(/^\/schedule ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})$/, async (msg, match) => {
    if (!moment(match[1], 'DD/MM/YYYY').isValid()) {
        await bot.sendMessage(chatId, 'Please provide a valid date in the format DD/MM/YYYY.');
        return;
    }

    const sender = msg.from;
    const chatId = msg.chat.id;
    const msgId = msg.message_id;

    const meetingDate = moment(match[1], 'DD/MM/YYYY').startOf('day');
    await admin.database().ref(chatId).set({
        meetingDate: meetingDate.valueOf(),
    });

    await bot.sendMessage(chatId, `${ sender.username ? '@' + sender.username : '<b>' + sender.first_name + '</b>' } wants to schedule a meeting on <b>${ meetingDate.format('DD MMM YYYY') }</b>.\n\nPlease indicate your availability in the format <b>HH:MM-HH:MM</b>, separated by linebreaks where applicable.\n\n<b>Example:</b>\n09:00-11:30\n14:00-16:00`, {
        parse_mode: 'HTML',
        reply_to_message_id: msgId,
    });
});

module.exports = bot;
