const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')

const mailman = require('./mailman');
const tm = require('./translationManager');
const credentials = require('../config/credentials');

let data;
let bot;

const handler = {
	init: function(botmodule, datamodule) {
		data = datamodule;
		bot = botmodule;
		console.log('bot was initialized...')
	},
	registerHandler: function() {
		bot.start(handler.start);
		bot.help(handler.help);
		bot.command('setup', handler.setup);
		bot.command('reset', handler.reset);
		bot.command('update', handler.update);
		bot.command('accept', handler.accept);
		bot.command('discard', handler.discard);
		bot.command('reject', handler.reject);
		bot.command('check', handler.check);
		console.log('all handlers registered...')
    },
	start: function(ctx) {
		let connection = data.mailmanConnections.get(ctx.chat.id);

		if(connection) {
			return ctx.reply(tm.getMessage('START_INITIALIZED'));
		} else {
			return ctx.reply(tm.getMessage('START_NOT_INITIALIZED'))
		}
	},
	help: function(ctx) {
		ctx.reply(tm.getMessage('HELP'));
	},
	setup: async function(ctx, next) {
		data.openDecisions.delete(ctx.chat.id);
		data.mailmanConnections.set(ctx.message.chat.id, credentials);

		return await handler.check(ctx, next, true);
	},
	reset: function(ctx) {
		data.mailmanConnections.delete(ctx.chat.id);
		data.openDecisions.delete(ctx.chat.id);
		return ctx.reply(tm.getMessage('RESET'));
	},
	update: async function(ctx) {
		data.openDecisions.delete(ctx.chat.id);
		let connection = data.mailmanConnections.get(ctx.chat.id);
		if(!connection) {
			return ctx.reply(tm.getMessage('NOT_INITIALIZED'));
		}

		let heldMail = await mailman.getHeldMails(connection);
		if(!heldMail) {
			return ctx.reply(tm.getMessage('EMPTY_QUEUE'));
		}

		if(heldMail instanceof Error) {
			return ctx.reply(tm.getMessage('CONNECTION_FAILED'));
		}

		data.openDecisions.set(ctx.chat.id, {'list': heldMail.list, 'request_id': heldMail.request_id});
		return ctx.reply(tm.getMessage('MAIL_NOTIFICATION', [heldMail.list, heldMail.from, heldMail.subject, heldMail.reason]), Markup
			.keyboard(tm.getKeyboard('KEYBOARD_DECISION'), {columns: 3})
			.oneTime()
		    .resize()
		    .extra());
	},
	check: async function(ctx, next, was_setup) {
		let connection = data.mailmanConnections.get(ctx.chat.id);
		if(!connection) {
			return ctx.reply(tm.getMessage('NOT_INITIALIZED'));
		}

		let result = await mailman.checkConnection(connection);
		if(result instanceof Error) {
			return ctx.reply(tm.getMessage('CONNECTION_CHECK_FAIL'));
		}

		let message = tm.getMessage('CONNECTION_CHECK_SUCCESS', [result]);
		if(was_setup) {
			message += tm.getMessage('SETUP_SUCCESSFUL');
		}
		return ctx.reply(message, [result]);
	},
	updateAll: async function(client_id) {
		data.mailmanConnections.forEach(async (connection, id, map) => {
			if(client_id && client_id !== id) {
				return;
			}

			let heldMail = await mailman.getHeldMails(connection);
			if(!heldMail) {
				return;
			}

			if(heldMail instanceof Error) {
				bot.telegram.sendMessage(id, tm.getMessage('CONNECTION_FAILED'));
				return;
			}

			data.openDecisions.set(id, {'list': heldMail.list, 'request_id': heldMail.request_id});
			bot.telegram.sendMessage(id, tm.getMessage('MAIL_NOTIFICATION', [heldMail.list, heldMail.from, heldMail.subject, heldMail.reason]), Markup
			.keyboard(tm.getKeyboard('KEYBOARD_DECISION'), {columns: 3})
			.oneTime()
		    .resize()
		    .extra());
		});
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
		let connection = data.mailmanConnections.get(ctx.chat.id);
		if(!connection) {
			return ctx.reply(tm.getMessage('NOT_INITIALIZED'));
		}

		let decision = data.openDecisions.get(ctx.chat.id);
		if(!decision) {
			return ctx.reply(tm.getMessage('NO_DECISION'));
		}

		let result = await mailman.moderateMail(connection, decision.list, decision.request_id, action);
		if(result instanceof Error) {
			return ctx.reply(tm.getMessage('DECISION_FAILED'));
		}

		setTimeout(function () {
			handler.updateAll(ctx.chat.id);
		}, 3000)

		return ctx.reply(tm.getMessage('MODERATION_SUCCESS', [action]));
	}
};

module.exports = handler;