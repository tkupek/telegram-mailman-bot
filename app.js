const express = require('express');
const cron = require('node-cron');
const { Telegraf } = require('telegraf')

const data = require('./src/data');
const handler = require('./src/handler');

// Start Bot
const bot = new Telegraf(process.env.BOT_TOKEN)
handler.init(bot, data);

cron.schedule('*/1 * * * *', function() {
	handler.update_all();
});


// Start Webserver
const app = express();

app.get('/', async (req, res) => {
	let num_connections = await data.mailmanConnections.count();
 	res.send('The Telegram MailmanModeratorBot is up and running.<br/><br/>' + String(num_connections) + ' connection' + (num_connections == 1 ? '' : 's') + ' monitored.');
});
app.get('/favicon.ico', (req, res) => res.sendStatus(204));
app.get('/_ah/stop', (req, res) => {
	// this is not working, bot is not stopped correctly and http 500 is given
	bot.stop(() => {
		console.log('bot stopped...')
		res.sendStatus(200)
	});
});
app.get('/_ah/start', (req, res) => {
	bot.launch();
	res.sendStatus(200);
});

app.listen(process.env.PORT, () => {
	console.log('webserver initialized and listening...');
});
