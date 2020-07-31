const Markup = require('telegraf/markup')
const urljoin = require('url-join');

const mailman = require('./mailman');
const setupController = require('./setup-controller');
const tm = require('./translationManager');

let data;
let bot;

const handler = {
	init: function(botmodule, datamodule) {
		data = datamodule;
		bot = botmodule;

		bot.start(handler.start);
		bot.help(handler.help);
		bot.command('setup', handler.setup);
		bot.command('reset', handler.reset);
		bot.command('update', handler.update);
		bot.command('accept', handler.accept);
		bot.command('lists', handler.lists);
		bot.command('discard', handler.discard);
		bot.command('reject', handler.reject);
		bot.command('check', handler.check);
		console.log('bot initialized...')
	},
	start: async function(ctx) {
		if(await handler.isConnected(ctx)) {
			return ctx.reply(tm.getMessage('START_INITIALIZED'));
		} else {
			return ctx.reply(tm.getMessage('START_NOT_INITIALIZED'))
		}
	},
	isConnected: async function(ctx) {
		let connection = await data.mailmanConnections.get(ctx.chat.id);
		return connection ? true : false;
	},
	help: function(ctx) {
		ctx.reply(tm.getMessage('HELP'));
	},
	setup: async function(ctx, next) {
		let message = ''
		if(await handler.isConnected(ctx)) {
			message += tm.getMessage('SETUP_ALREADY_CONNECTED');
		};

	    await data.setupInit.delete(ctx.chat.id);
		const newSetupToken = setupController.getNewSetupHash(ctx.chat.id);
		const tokenUrl = urljoin(process.env.BASE_URL, "/setup", "?id=" + newSetupToken);

		await data.openDecisions.delete(ctx.chat.id);
		await data.setupInit.set(ctx.chat.id, newSetupToken, new Date());

		message += tm.getMessage('SETUP_NEW', [tokenUrl]);
		return ctx.reply(message, Markup.removeKeyboard().extra());
	},
	sendSetupSuccess: function(client_id) {
		bot.telegram.sendMessage(client_id, tm.getMessage('SETUP_SUCCESSFUL'));
	},
	reset: async function(ctx) {
		await data.mailmanConnections.delete(ctx.chat.id);
		await data.openDecisions.delete(ctx.chat.id);
		return ctx.reply(tm.getMessage('RESET'), Markup.removeKeyboard().extra());
	},
	update: async function(ctx) {
		await data.openDecisions.delete(ctx.chat.id);
		let connection = await data.mailmanConnections.get(ctx.chat.id);
		if(!connection) {
			return ctx.reply(tm.getMessage('NOT_INITIALIZED'), Markup.removeKeyboard().extra());
		}

		let heldMail = await mailman.getHeldMails(connection);
		if(!heldMail) {
			return ctx.reply(tm.getMessage('EMPTY_QUEUE'), Markup.removeKeyboard().extra());
		}

		if(heldMail instanceof Error) {
			return ctx.reply(tm.getMessage('CONNECTION_FAILED'), Markup.removeKeyboard().extra());
		}

		await data.openDecisions.set(ctx.chat.id, {'list': heldMail.list, 'request_id': heldMail.request_id});
		return ctx.reply(tm.getMessage('MAIL_NOTIFICATION', [heldMail.list, heldMail.from, heldMail.subject, heldMail.reason]), Markup
			.keyboard(tm.getKeyboard('KEYBOARD_DECISION'), {columns: 3})
			.oneTime()
		    .resize()
		    .extra());
	},
	check: async function(ctx, next) {
		let connection = await data.mailmanConnections.get(ctx.chat.id);
		if(!connection) {
			return ctx.reply(tm.getMessage('NOT_INITIALIZED'), Markup.removeKeyboard().extra());
		}

		let result = await mailman.checkVersion(connection);
		if(result instanceof Error) {
			return ctx.reply(tm.getMessage('CONNECTION_CHECK_FAIL'), Markup.removeKeyboard().extra());
		}

		let message = tm.getMessage('CONNECTION_CHECK_SUCCESS', [result]);
		return ctx.reply(message);
	},
	update_all: async function(client_id) {
		let connections;
		if(client_id) {
			connections = [client_id, await data.mailmanConnections.get(client_id)];
		} else {
			connections = await data.mailmanConnections.all();
		}

		await Promise.all(connections.map(async ([id, connection]) => {
			id = parseInt(id);
			let heldMail = await mailman.getHeldMails(connection);
			if(!heldMail) {
				return;
			}

			if(heldMail instanceof Error) {
				bot.telegram.sendMessage(id, tm.getMessage('CONNECTION_FAILED'));
				return;
			}

			if(await data.openDecisions.get(id)) {
				return; // decision already pending
			}

			await data.openDecisions.set(id, {'list': heldMail.list, 'request_id': heldMail.request_id});
			bot.telegram.sendMessage(id, tm.getMessage('MAIL_NOTIFICATION', [heldMail.list, heldMail.from, heldMail.subject, heldMail.reason]), Markup
				.keyboard(tm.getKeyboard('KEYBOARD_DECISION'), {columns: 3})
				.oneTime()
				.resize()
				.extra());
		}));
	},
	accept: async function(ctx) {
		return await handler.decide(ctx, mailman.actions.accept);
	},
	discard: async function(ctx) {
		return await handler.decide(ctx, mailman.actions.discard);
	},
	reject: async function(ctx) {
		return await handler.decide(ctx, mailman.actions.reject);
	},
	decide: async function(ctx, action) {
		let connection = await data.mailmanConnections.get(ctx.chat.id);
		if(!connection) {
			return ctx.reply(tm.getMessage('NOT_INITIALIZED'), Markup.removeKeyboard().extra());
		}

		let decision = await data.openDecisions.get(ctx.chat.id);
		if(!decision) {
			return ctx.reply(tm.getMessage('NO_DECISION'), Markup.removeKeyboard().extra());
		}

		let result = await mailman.moderateMail(connection, decision.list, decision.request_id, action);
		if(result instanceof Error) {
			return ctx.reply(tm.getMessage('DECISION_FAILED'), Markup.removeKeyboard().extra());
		}
		await data.openDecisions.delete(ctx.chat.id);

		setTimeout(function () {
			handler.update_all(ctx.chat.id);
		}, 3000)

		return ctx.reply(tm.getMessage('MODERATION_SUCCESS', [action]), Markup.removeKeyboard().extra());
	},
	lists: async function(ctx) {
		let connection = await data.mailmanConnections.get(ctx.chat.id);
		if(!connection) {
			return ctx.reply(tm.getMessage('NOT_INITIALIZED'), Markup.removeKeyboard().extra());
		}

		let lists = await mailman.getSelectedLists(connection);
		let listsText = '';
		for (let list of lists) {
			listsText += '• ' + list.address + '\n'
		}
		return ctx.reply(tm.getMessage('CHECK_LISTS', [listsText]));
	}
};

module.exports = handler;
