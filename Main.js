const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();

const Token = process.env.token;

const bot = new TelegramBot(Token, { polling: true });

let Messages = {};

if (fs.existsSync('Messages.json')) {
    Messages = JSON.parse(fs.readFileSync('Messages.json'));
}

function SaveMessage() {
    fs.writeFileSync('Messages.json', JSON.stringify(Messages, null, 2));
}

bot.on('message', async (msg) => {
    const text = msg.text;

    if (!text) return;
    if (text.startsWith('/')) return;
    if (text.includes('http://')) return;
    if (text.includes('https://')) return;

    if (!Array.isArray(Messages[msg.chat.id])) {
        Messages[msg.chat.id] = [];
    }

    if (!Messages[msg.chat.id].includes(text)) {
        Messages[msg.chat.id].push(text);
        SaveMessage();
    }

    if (Math.random() < 0.8) {
        const Message = Messages[msg.chat.id];
        const RandomMessage = Message[Math.floor(Math.random() * Message.length)];
        bot.sendMessage(msg.chat.id, RandomMessage);
    }
    else {
        await bot._request("setMessageReaction", {
            qs: {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                reaction: JSON.stringify([{ type: 'emoji', emoji: '👍' }]),
                is_big: false
            }
        });
    }
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '<b>Привет!\nЯ Алекс Пыня!\nЯ бот-повторюшка</b>\n\nДобавь меня в группу, и я буду вас веселить', { parse_mode: 'HTML' });
});

bot.onText(/\/database/, (msg) => {
    const FilePath = path.resolve(__dirname, 'Messages.json');

    if (msg.chat.id === Number(process.env.chatId)) {
        bot.sendDocument(msg.chat.id, FilePath, {}, {
            filename: 'Messages.json',
            contentType: 'application/octet-stream',
        })
            .catch(() => {
                bot.sendMessage(msg.chat.id, '<b>Ошибка отправки</b>', { parse_mode: 'HTML' });
            });
    }
    else {
        bot.sendMessage(msg.chat.id, '<b>Ошибка. У вас недостаточно прав.</b>', { parse_mode: 'HTML' });
    }
});

bot.onText(/\/upload_database/, (msg) => {
    if (msg.chat.id === Number(process.env.chatId)) {
        bot.sendMessage(msg.chat.id, '<b>Отправьте файл Messages.json</b>', { parse_mode: 'HTML' });

        bot.once('message', async (msg) => {
            const FileInfo = await bot.getFile(msg.document.file_id);
            const FileUrl = `https://api.telegram.org/file/bot${Token}/${FileInfo.file_path}`;
            const FileName = 'Messages.json';

            const res = await fetch(FileUrl);
            const buffer = Buffer.from(await res.arrayBuffer());

            fs.writeFileSync('Messages.json', buffer);

            Messages = JSON.parse(fs.readFileSync('Messages.json'));

            bot.sendMessage(msg.chat.id, '<b>Успешная загрузка!</b>', { parse_mode: 'HTML' });
        });
    }
    else {
        bot.sendMessage(msg.chat.id, '<b>Ошибка. У вас недостаточно прав.</b>', { parse_mode: 'HTML' });
    }
});

console.log('> Successful start');