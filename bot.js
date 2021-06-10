const admin = require('firebase-admin');
const moment = require('moment');
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

function toTimeString(input) {
    if (Number(input) >= 10) {
        return input;
    } else {
        return `0${ input }`;
    }
}

bot.onText(/^\/schedule ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})$/, async (msg, match) => {
    if (!moment(match[1], 'DD/MM/YYYY').isValid()) {
        await bot.sendMessage(chatId, 'Please provide a valid date in the format DD/MM/YYYY.');
        return;
    }

    const sender = msg.from;
    const chatId = msg.chat.id;
    const msgId = msg.message_id;

    const meetingDate = moment(match[1], 'DD/MM/YYYY').startOf('day');
    await admin.database().ref(`${chatId}/`).set({
        meetingDate: meetingDate.valueOf(),
    });

    await bot.sendMessage(chatId, `${ sender.username ? '@' + sender.username : '<b>' + sender.first_name + '</b>' } wants to schedule a meeting on <b>${ meetingDate.format('DD MMM YYYY') }</b>.\n\nPlease indicate your availability in the format <b>HH:MM-HH:MM</b>, separated by linebreaks where applicable.\n\n<b>Example:</b>\n09:00-11:30\n14:00-16:00`, {
        parse_mode: 'HTML',
        reply_to_message_id: msgId,
    });
});

bot.on('text', async msg => {
    const msgText = msg.text;
    const match = msgText.match(/((0?[0-9]|1[0-9]|2[0-3]):[0-5][0,5]-(0?[0-9]|1[0-9]|2[0-3]):[0-5][0,5])/g);

    const chatId = msg.chat.id;
    const msgId = msg.message_id;
    const userId = msg.from.id;

    const dataSnapshot = await admin.database().ref(`${chatId}/`).get();
    if (!dataSnapshot.val()) {
        return;
    }

    const timeArray = [];
    for (let i = 0; i < 288; i++) {
        timeArray.push(false);
    }

    for (let j = 0; j < match.length; j++) {
        const timeIntervalArray = match[j].split('-');
        const startTimeArray = timeIntervalArray[0].split(':');
        const endTimeArray = timeIntervalArray[1].split(':');

        const startHour = Number(startTimeArray[0]);
        const startMinute = Number(startTimeArray[1]);
        const endHour = Number(endTimeArray[0]);
        const endMinute = Number(endTimeArray[1]);

        const startTimeIndex = (12 * startHour) + (startMinute / 5);
        const endTimeIndex = (12 * endHour) + (endMinute / 5);

        for (let k = startTimeIndex; k < endTimeIndex; k++) {
            timeArray[k] = true;
        }
    }

    await admin.database().ref(`${chatId}/schedules/${userId}/`).set(timeArray);
    
    await bot.sendMessage(chatId, '\u2705', {
        parse_mode: 'HTML',
        reply_to_message_id: msgId,
    });

    const schedules = (await admin.database().ref(`${chatId}/schedules/`).get()).val();
    const chatMembersCount = await bot.getChatMembersCount(chatId);
    if (chatMembersCount - Object.keys(schedules).length === 1) {
        const availableTimeslots = [];
        let currentStatus = false;
        for (let a = 0; a < 288; a++) {
            let isFree = true;
            Object.values(schedules).forEach(schedule => {
                if (!schedule[a]) {
                    isFree = false;
                    return;
                }
            });
            if (isFree !== currentStatus) {
                if (isFree) {
                    availableTimeslots[availableTimeslots.length] = [`${toTimeString(Math.floor(a / 12))}:${toTimeString((a % 12) * 5)}`];
                } else {
                    availableTimeslots[availableTimeslots.length - 1][1] = `${toTimeString(Math.floor(a / 12))}:${toTimeString((a % 12) * 5)}`;
                }
                currentStatus = isFree;
            }
        }
        
        const scheduleString = availableTimeslots.map((value) => value.join('-')).join('\n');
        await bot.sendMessage(chatId, `<b>Available timeslots:</b>\n${scheduleString}`, {
            parse_mode: 'HTML',
        });
    }
});

module.exports = bot;
