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
    const sender = msg.from;
    const chatId = msg.chat.id.toString();
    const msgId = msg.message_id;

    if (!moment(match[1], 'DD/MM/YYYY').isValid()) {
        await bot.sendMessage(chatId, 'Please provide a valid date in the format DD/MM/YYYY.');
        return;
    }

    const meetingDate = moment(match[1], 'DD/MM/YYYY').startOf('day');
    await admin.database().ref(`${ chatId }/`).set({
        meetingDate: meetingDate.valueOf(),
    });

    await bot.sendMessage(chatId, `${ sender.username ? '@' + sender.username : '<b>' + sender.first_name + '</b>' } wants to schedule a meeting on <b>${ meetingDate.format('DD MMM YYYY') }</b>.\n\nPlease indicate your availability in the format <b>HH:MM-HH:MM</b>, separated by linebreaks where applicable. Times specified should end in 5 or 0.\n\n<b>Example:</b>\n09:15-11:30\n14:00-16:45`, {
        parse_mode: 'HTML',
        reply_to_message_id: msgId,
    });
});

bot.onText(/^\/stop$/, async msg => {
    const chatId = msg.chat.id.toString();
    const meetingData = (await admin.database().ref(`${ chatId }/`).get()).val();
    if (!meetingData) {
        return;
    }

    const { meetingDate, schedules } = meetingData;
    const availableTimeslots = [];
    let currentStatus = false;
    for (let a = 0; a < 288; a++) {
        let isFree = true;
        for (const schedule of Object.values(schedules)) {
            if (!schedule[a]) {
                isFree = false;
                break;
            }
        }
        if (isFree !== currentStatus) {
            if (isFree) {
                availableTimeslots[availableTimeslots.length] = [`${ toTimeString(Math.floor(a / 12)) }:${ toTimeString((a % 12) * 5) }`];
            } else {
                availableTimeslots[availableTimeslots.length - 1][1] = `${ toTimeString(Math.floor(a / 12)) }:${ toTimeString((a % 12) * 5) }`;
            }
            currentStatus = isFree;
        }
    }

    if (!availableTimeslots[availableTimeslots.length - 1][1]) {
        availableTimeslots[availableTimeslots.length - 1][1] = '00:00';
    }

    const scheduleString = availableTimeslots.map((value) => value.join('-')).join('\n');
    await bot.sendMessage(chatId, `<b>${ moment(meetingDate).format('DD MMM YYYY') }\nAvailable timeslots:</b>\n${ scheduleString }`, {
        parse_mode: 'HTML',
    });

    await admin.database().ref(`${ chatId }/`).remove();
});

bot.on('text', async msg => {
    if (msg.chat.id > 0) {
        await bot.sendMessage(msg.chat.id, 'I can only be used in a group chat.');
        return;
    }

    const msgText = msg.text;
    const match = msgText.match(/((0?[0-9]|1[0-9]|2[0-3]):[0-5][0,5]-(0?[0-9]|1[0-9]|2[0-3]):[0-5][0,5])/g);
    if (!match || match.length === 0) {
        return;
    }

    const chatId = msg.chat.id.toString();
    const msgId = msg.message_id;
    const userId = msg.from.id.toString();

    const dataSnapshot = await admin.database().ref(`${ chatId }/`).get();
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
        let endTimeIndex = (12 * endHour) + (endMinute / 5);
        if (startTimeIndex > endTimeIndex) {
            endTimeIndex = 288;
        }

        for (let k = startTimeIndex; k < endTimeIndex; k++) {
            timeArray[k] = true;
        }
    }

    await admin.database().ref(`${ chatId }/schedules/${ userId }/`).set(timeArray);

    await bot.sendMessage(chatId, '\u2705', {
        parse_mode: 'HTML',
        reply_to_message_id: msgId,
    });

    const meetingData = (await admin.database().ref(`${ chatId }/`).get()).val();
    const { meetingDate, schedules } = meetingData;
    const chatMembersCount = await bot.getChatMembersCount(chatId);
    if (chatMembersCount - Object.keys(schedules).length === 1) {
        const availableTimeslots = [];
        let currentStatus = false;
        for (let a = 0; a < 288; a++) {
            let isFree = true;
            for (const schedule of Object.values(schedules)) {
                if (!schedule[a]) {
                    isFree = false;
                    break;
                }
            }
            if (isFree !== currentStatus) {
                if (isFree) {
                    availableTimeslots[availableTimeslots.length] = [`${ toTimeString(Math.floor(a / 12)) }:${ toTimeString((a % 12) * 5) }`];
                } else {
                    availableTimeslots[availableTimeslots.length - 1][1] = `${ toTimeString(Math.floor(a / 12)) }:${ toTimeString((a % 12) * 5) }`;
                }
                currentStatus = isFree;
            }
        }

        const scheduleString = availableTimeslots.map((value) => value.join('-')).join('\n');
        await bot.sendMessage(chatId, `<b>${ moment(meetingDate).format('DD MMM YYYY') }\nAvailable timeslots:</b>\n${ scheduleString }`, {
            parse_mode: 'HTML',
        });

        await admin.database().ref(`${ chatId }/`).remove();
    }
});

module.exports = bot;
