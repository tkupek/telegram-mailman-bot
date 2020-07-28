const cron = require('node-cron');
const { Telegraf } = require('telegraf')

const data = require('./src/repository/data');
const botHandler = require('./src/controller/bot-handler');
const webHandler = require('./src/controller/web-handler');

// Start Bot
const bot = new Telegraf(process.env.BOT_TOKEN)
botHandler.init(bot, data);

cron.schedule('*/1 * * * *', function() {
	botHandler.update_all();
});

// Setup and start webserver
webHandler.init();
