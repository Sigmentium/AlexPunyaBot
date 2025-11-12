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

bot.on('message', (msg) => {
    const text = msg.text;

    if (!text) return;
    if (text.startsWith('/')) return;
    if (text.includes('http://')) return;
    if (text.includes('https://')) return;

    if (!Array.isArray(Messages[msg.chat.id])) {
        Messages[msg.chat.id] = [];
    }

    Messages[msg.chat.id].push(text);
    SaveMessage();

    if (Math.random() < 0.8) {
        const Message = Messages[msg.chat.id];
        const RandomMessage = Message[Math.floor(Math.random() * Message.length)];
        bot.sendMessage(msg.chat.id, RandomMessage);
    }
});

bot.on('message', async (msg) => {
    const text = msg.text;
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    if (!text) return;
    if (text.startsWith('/')) return;
    if (text.includes('http://')) return;
    if (text.includes('https://')) return;

    if (Math.random() < 0.2) {
        await bot._request("setMessageReaction", {
            qs: {
                chat_id: chatId,
                message_id: messageId,
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
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Отправь мне файл базы данных (database.json)');

  bot.once('document', async (msg) => {
    const fileId = msg.document.file_id;
    const fileLink = await bot.getFileLink(fileId);

    const res = await fetch(fileLink);
    const fileStream = fs.createWriteStream('./Messages.json');

    // Читаем поток из fetch и пишем в файл
    await new Promise((resolve, reject) => {
      res.body.pipe(fileStream);
      res.body.on('error', reject);
      fileStream.on('finish', resolve);
    });

    bot.sendMessage(chatId, '✅ Файл успешно сохранён как database.json');
  });
});

console.log('> Successful start');