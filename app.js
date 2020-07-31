const express = require('express');
const { body, query, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const pug = require('pug');
const cron = require('node-cron');
const { Telegraf } = require('telegraf');

const SetupModel = require("./src/setup-model")
const data = require('./src/data');
const handler = require('./src/handler');
const setupController = require('./src/setup-controller');
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const setupFields = setupController.setupFields;

// Start Bot
const bot = new Telegraf(process.env.BOT_TOKEN)
handler.init(bot, data);

cron.schedule('*/1 * * * *', async function() {
	await handler.update_all();
});

const renderStatusPage = pug.compileFile(__dirname + '/resources/status.pug');
const renderSetupPage = pug.compileFile(__dirname + '/resources/setup.pug');


// Start Webserver
const app = express();

app.get('/', async (req, res) => {
	let num_connections = await data.mailmanConnections.count();
	res.send(renderStatusPage({connections: num_connections}));
});
app.get('/favicon.ico', (req, res) => res.sendStatus(204));
app.get('/_ah/stop', async (req, res) => {
	console.log('trigger stop');
	// this is not working, bot is not stopped correctly and http 500 is given
	try {
		await bot.stop(() => {
			console.log('bot stopped...')
			res.sendStatus(200)
		});
	} catch(error) {
		console.log('tada');
		console.error(error);
	}
});
app.get('/_ah/start', async (req, res) => {
	await bot.launch();
	res.sendStatus(200);
});

app.get("/setup", [
	query('id').isHash(setupFields.sessionIdHash)
], function (req, res) {
	let session_id = null;
	const validationError = validationResult(req);

	if(validationError.isEmpty()) {
		session_id = req.query.id;
	}
	res.send(renderSetupPage({sessionId: session_id}));
});
app.post('/setup', urlencodedParser, [
	body(setupFields.sessionId).isHash(setupFields.sessionIdHash),
	body(setupFields.url).isURL({protocols: ['https']}),
	body(setupFields.listsRegex).isString().customSanitizer(value => {
		if(value === "*") { return ".*" } else { return value }
	}).custom(value => {
		try { RegExp(value);
		} catch (syntaxError) { return false; }
		return true;
	}),
	body(setupFields.username).isString(),
	body(setupFields.password).isString(),
	body(setupFields.xAuthHeader).isString()
], async (req, res) => {
	const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
		return { "msg": msg, "param": param, "location": location }
	};
	const validationError = validationResult(req).formatWith(errorFormatter);
	const data = req.body;
	let responseCode;
	let errorResponseArray;

	if(validationError.isEmpty()) {
		const newSetupData = new SetupModel(
			data.sessionId,
			data.url,
			data.listsRegex,
			data.username,
			data.password,
			data.xAuthHeader
		);
		errorResponseArray = await setupController.checkAndSaveSetup(newSetupData, handler.sendSetupSuccess);

		if(errorResponseArray) {
			responseCode = 200;
		} else {
			responseCode = 500;
			errorResponseArray = []
			console.error("Setup failed terribly.")
		}
	} else {
		responseCode = 400;
		errorResponseArray = validationError.array();
	}

	res.status(responseCode).json({ "errors": errorResponseArray});
});

app.listen(process.env.PORT, () => {
	console.log('webserver initialized and listening on port [' + process.env.PORT + ']');
});
