const express = require('express');
const { body, query, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const pug = require('pug');
const cron = require('node-cron');
const { Telegraf } = require('telegraf');

const data = require('./src/data');
const handler = require('./src/handler');
const urlencodedParser = bodyParser.urlencoded({ extended: false });

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
 	const compiledSetup = pug.compileFile(__dirname + '/resources/status.pug');
	res.send(compiledSetup({connections: 1}));
});
app.get('/favicon.ico', (req, res) => res.sendStatus(204));
app.get('/_ah/stop', async (req, res) => {
	// this is not working, bot is not stopped correctly and http 500 is given
	await bot.stop(() => {
		console.log('bot stopped...')
		res.sendStatus(200)
	});
});
app.get('/_ah/start', async (req, res) => {
	await bot.launch();
	res.sendStatus(200);
});

app.get("/setup", [
	query('id').isHash('sha1')
], function (req, res) {
	let session_id = null;
	const validationError = validationResult(req);
	if(validationError.isEmpty()) {
		session_id = req.query.id;
	}
	const compiledSetup = pug.compileFile(__dirname + '/resources/setup.pug');
	res.send(compiledSetup({sessionId: req.query.id}));
});
app.post('/setup', urlencodedParser, [
	body('session').isHash('sha1'),
	body('host').isURL({protocols: ['http', 'https']}),
	body('lists').isString(),
	body('username').isString(),
	body('password').isString(),
	body('xAuthHeader').isString()
], function (req, res) {
	const validationError = validationResult(req);
	if(!validationError.isEmpty()) {
		return res.status(400).json({ errors: validationError.array() });
	}

	res.send('welcome!\n');
	console.log(req.body)
});

app.listen(80, () => {
	console.log('webserver initialized and listening on port [' + process.env.PORT + ']');
});
