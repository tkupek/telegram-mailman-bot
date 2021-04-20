'use strict';

const Markup = require('telegraf/markup')
const urljoin = require('url-join');

const mailman = require('../remote/mailman-client');
const setupController = require('./setup-controller');
const tm = require('../utils/translation-manager');
const env = require('../env/environment');

let data;
let bot;

const botHandler = {
	init: function(botmodule, datamodule) {
		data = datamodule;
		bot = botmodule;

		bot.start(botHandler.start);
		bot.help(botHandler.help);
		bot.command('setup', botHandler.setup);
		bot.command('reset', botHandler.reset);
		bot.command('update', botHandler.update);
		bot.command('accept', botHandler.accept);
		bot.command('spam', botHandler.ban);
		bot.command('lists', botHandler.lists);
		bot.command('discard', botHandler.discard);
		bot.command('reject', botHandler.reject);
		bot.command('check', botHandler.check);

		bot.telegram.setWebhook(urljoin(process.env.BASE_URL, env.web.path.bot, process.env.BOT_TOKEN));
		console.log('bot initialized...');
	},
	getBot: function() {
		return bot;
	},
	start: async function(ctx) {
		if(await botHandler.isConnected(ctx)) {
			return ctx.reply(tm.getMessage('START_INITIALIZED'));
		} else {
			return ctx.reply(tm.getMessage('START_NOT_INITIALIZED'))
		}
	},
	isConnected: async function(ctx) {
		let connection = await data.mailmanConnections.get(ctx.chat.id);
		return !!connection;
	},
	help: function(ctx) {
		ctx.reply(tm.getMessage('HELP'));
	},
	setup: async function(ctx) {
		let message = ''
		if(await botHandler.isConnected(ctx)) {
			message += tm.getMessage('SETUP_ALREADY_CONNECTED');
		}

	    await data.setupInit.delete(ctx.chat.id);
		const newSetupToken = setupController.getNewSetupHash(ctx.chat.id);
		const tokenUrl = urljoin(process.env.BASE_URL, env.web.path.setup, "?id=" + newSetupToken);

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

		await data.openDecisions.set(ctx.chat.id, {'list': heldMail.list, 'request_id': heldMail.request_id, 'sender': heldMail.from});
		return ctx.reply(tm.getMessage('MAIL_NOTIFICATION', [heldMail.list, heldMail.from, heldMail.subject, heldMail.reason]), Markup
			.keyboard(tm.getKeyboard('KEYBOARD_DECISION'), {columns: 3})
			.oneTime()
		    .resize()
		    .extra());
	},
	check: async function(ctx) {
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

			await data.openDecisions.set(id, {'list': heldMail.list, 'request_id': heldMail.request_id, 'sender': heldMail.from});
			bot.telegram.sendMessage(id, tm.getMessage('MAIL_NOTIFICATION', [heldMail.list, heldMail.from, heldMail.subject, heldMail.reason]), Markup
				.keyboard(tm.getKeyboard('KEYBOARD_DECISION'), {columns: 2})
				.oneTime()
				.resize()
				.extra());
		}));
	},
	accept: async function(ctx) {
		return await botHandler.decide(ctx, mailman.actions.accept);
	},
	discard: async function(ctx) {
		return await botHandler.decide(ctx, mailman.actions.discard);
	},
	reject: async function(ctx) {
		return await botHandler.decide(ctx, mailman.actions.reject);
	},
	decide: async function(ctx, action, ban = false) {
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

		let reply;
		if(ban) {
			let result = await mailman.banAddress(connection, decision.sender, decision.list);
			if(result instanceof Error) {
				return ctx.reply(tm.getMessage('BAN_FAILED'), Markup.removeKeyboard().extra());
			}
			reply = ctx.reply(tm.getMessage('BAN_SUCCESS'), Markup.removeKeyboard().extra());
		} else {
			reply = ctx.reply(tm.getMessage('MODERATION_SUCCESS', [action]), Markup.removeKeyboard().extra());
		}

		setTimeout(function () {
			botHandler.update_all(ctx.chat.id);
		}, 3000)

		return reply;
	},
	ban: async function(ctx) {
		return await botHandler.decide(ctx, mailman.actions.discard, true)
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

module.exports = botHandler;
