const messages = require('../config/messages');

let messagesLocale = messages[messages.default];

const translationManager = {
	getMessage: function(key, args) {
        let message = translationManager.random(messagesLocale[key]);
        message = translationManager.fillArgs(message, args);

        return message;
	},
	getKeyboard: function(key, args) {
        return messagesLocale[key];
	},
	fillArgs(value, args) {
        if(!args || !Array.isArray(args)) {
            return value;
        }

        for (let i = 0; i < args.length; i++) {
            value && (value = value.replace('{{' + i + '}}', args[i]));
        }
        return value;
    },
    random(input) {
        return Array.isArray(input) ? input[Math.floor(Math.random() * input.length)] : input;
    }
};

module.exports = translationManager;