const cron = require('node-cron');
const { Telegraf } = require('telegraf');

<<<<<<< HEAD
const SetupModel = require("./src/setup-model")
const setupController = require('./src/setup-controller');
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const setupFields = setupController.setupFields;
=======
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
