const { Telegraf } = require('telegraf')
const cron = require('node-cron');

const data = require('./src/data');
const handler = require('./src/handler');

const bot = new Telegraf(process.env.BOT_TOKEN)

handler.init(bot, data);
handler.registerHandler();

cron.schedule('*/1 * * * *', function() {
	handler.updateAll();
});

bot.launch();
