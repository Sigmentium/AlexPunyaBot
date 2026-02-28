const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpeg_static = require('ffmpeg-static');
const TelegramBot = require('node-telegram-bot-api');
const { Readable, PassThrough } = require('stream');

require('dotenv').config();

ffmpeg.setFfmpegPath(ffmpeg_static);

const Token = process.env.token;

const bot = new TelegramBot(Token, { polling: true });

let Messages = {};
let Stickers = {};

if (fs.existsSync('Messages.json')) {
    Messages = JSON.parse(fs.readFileSync('Messages.json'));
}

if (fs.existsSync('Stickers.json')) {
    Stickers = JSON.parse(fs.readFileSync('Stickers.json'));
}

function SaveMessage() {
    fs.writeFileSync('Messages.json', JSON.stringify(Messages, null, 2));
}

function SaveSticker() {
    fs.writeFileSync('Stickers.json', JSON.stringify(Stickers, null, 2));
}

function ConvertOGG(InputBuffer) {
    const InputStream = new Readable();
    InputStream.push(InputBuffer);
    InputStream.push(null);

    const stream = new PassThrough();

    ffmpeg(InputStream)
        .inputFormat('wav')
        .audioCodec('libopus')
        .audioChannels(1)
        .audioFrequency(48000)
        .audioBitrate('64k')
        .format('ogg')
        .outputOptions([
            '-vbr on',
            '-compression_level 10'
        ])
        .on('error', (err) => {
            console.error(err);
        })
        .on('end', () => stream.end())
        .pipe(stream, { end: true });

    return stream;
}

bot.on('sticker', (msg) => {
    const StickerId = msg.sticker.file_id;

    if (!Array.isArray(Stickers[msg.chat.id])) {
        Stickers[msg.chat.id] = [];
    }

    if (!Stickers[msg.chat.id].includes(StickerId)) {
        Stickers[msg.chat.id].push(StickerId);
        SaveSticker();
    }
});

bot.on('message', async (msg) => {
    const text = msg.text;
    const Random = Math.random();

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

    if (Random < 0.5) {
        const Message = Messages[msg.chat.id];
        const RandomMessage = Message[Math.floor(Math.random() * Message.length)];
        bot.sendMessage(msg.chat.id, RandomMessage);
    }
    else if (Random > 0.7) {
        const Reactions = ['👍', '❤️', '😁', '🤣'];
        const RandomReaction = Reactions[Math.floor(Math.random() * Reactions.length)];

        await bot._request("setMessageReaction", {
            qs: {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                reaction: JSON.stringify([{ type: 'emoji', emoji: RandomReaction }]),
                is_big: false
            }
        });
    }
    else {
        const Sticker = Stickers[msg.chat.id];
        const RandomSticker = Sticker[Math.floor(Math.random() * Sticker.length)];
        bot.sendSticker(msg.chat.id, RandomSticker);

        // fetch('https://alexpunya-tts-server.onrender.com', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         text: text
        //     })
        // })
        //     .then(async response => {
        //         const ResponseBuffer = await response.arrayBuffer();
        //         const AudioBuffer = Buffer.from(ResponseBuffer);

        //         const Audio = ConvertOGG(AudioBuffer);

        //         bot.sendVoice(msg.chat.id, Audio);
        //     });
    }
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '<b>Привет!\nЯ Алекс Пыня!\nЯ бот-повторюшка</b>\n\nДобавь меня в группу, и я буду вас веселить', { parse_mode: 'HTML' });
});

bot.onText(/\/database/, (msg) => {
    const FilePathMessages = path.resolve(__dirname, 'Messages.json');
    const FilePathStickers = path.resolve(__dirname, 'Stickers.json');

    if (msg.chat.id === Number(process.env.chatId)) {
        bot.sendDocument(msg.chat.id, FilePathMessages, {}, {
            filename: 'Messages.json',
            contentType: 'application/octet-stream',
        })
            .catch(() => {
                bot.sendMessage(msg.chat.id, '<b>Ошибка отправки</b>', { parse_mode: 'HTML' });
            });

        bot.sendDocument(msg.chat.id, FilePathStickers, {}, {
            filename: 'Stickers.json',
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

bot.onText(/\/upload_database_messages/, (msg) => {
    if (msg.chat.id === Number(process.env.chatId)) {
        bot.sendMessage(msg.chat.id, '<b>Отправьте файл Messages.json</b>', { parse_mode: 'HTML' });

        bot.once('message', async (msg) => {
            const FileInfo = await bot.getFile(msg.document.file_id);
            const FileUrl = `https://api.telegram.org/file/bot${Token}/${FileInfo.file_path}`;

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

bot.onText(/\/upload_database_stickers/, (msg) => {
    if (msg.chat.id === Number(process.env.chatId)) {
        bot.sendMessage(msg.chat.id, '<b>Отправьте файл Stickers.json</b>', { parse_mode: 'HTML' });

        bot.once('message', async (msg) => {
            const FileInfo = await bot.getFile(msg.document.file_id);
            const FileUrl = `https://api.telegram.org/file/bot${Token}/${FileInfo.file_path}`;

            const res = await fetch(FileUrl);
            const buffer = Buffer.from(await res.arrayBuffer());

            fs.writeFileSync('Stickers.json', buffer);

            Messages = JSON.parse(fs.readFileSync('Stickers.json'));

            bot.sendMessage(msg.chat.id, '<b>Успешная загрузка!</b>', { parse_mode: 'HTML' });
        });
    }
    else {
        bot.sendMessage(msg.chat.id, '<b>Ошибка. У вас недостаточно прав.</b>', { parse_mode: 'HTML' });
    }
});

console.log('> Successful start');