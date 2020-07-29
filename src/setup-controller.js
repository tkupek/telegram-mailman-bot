'use strict';

const crypto = require('crypto');

const SetupError = require("./setup-error");
const mailman = require('./mailman');
const data = require('./data');

const SALT_BYTE_LENGTH = 64;
const HASH_ENCODING = 'hex';
const SESSION_MAX_AGE_IN_HOURS = 12;


function createSetupErrorArray() {
    let errors = [];

    for(let i = 0; i < arguments.length; i++) {
        errors = errors.concat(arguments[i]);
    }

    return errors;
}

function saveConnection(sessionToken, connection) {
    let maxAge = new Date();
    maxAge.setHours(maxAge.getHours() - SESSION_MAX_AGE_IN_HOURS);

    const chatId = data.setupInit.getId(sessionToken, maxAge);

    if(chatId) {
        data.mailmanConnections(chatId, connection);
        data.setupInit.delete(chatId);
    }
}


const setupController = {
    getNewSetupHash: function(chatId) {
        const hash = crypto.createHash(setupFields.sessionIdHash);

        hash.update(new Date().valueOf().toString());
        hash.update(chatId);
        hash.update(crypto.randomBytes(SALT_BYTE_LENGTH));

        return hash.digest(HASH_ENCODING);
    },

    checkAndSaveSetup: async function (setupModel) {
        const newConnection = {
            url: setupModel.host,
            name: setupModel.username,
            password: setupModel.password,
            headers: { 'X-Auth': setupModel.xAuthHeader },
            lists: setupModel.listsRegex
        };

        const connectionResult = await mailman.checkConnection(newConnection);

        if(connectionResult === 499) {
            return createSetupErrorArray(
                new SetupError(setupFields.host)
            );
        }
        if(connectionResult === 401) {
            return createSetupErrorArray(
                new SetupError(setupFields.username),
                new SetupError(setupFields.password),
                new SetupError(setupFields.xAuthHeader)
            );
        }

        // TODO: add listsRegex check
        if(false) {
            return createSetupErrorArray(
                new SetupError(setupFields.listsRegex)
            );
        }

        if(connectionResult === 200) {
            saveConnection(setupModel.sessionId, newConnection);
            return [];
        }

        // Something really ugly has gone wrong.
        return null;
    },

    setupFields: Object.freeze({
        sessionId: 'sessionId',
        sessionIdHash: 'sha1',
        host: 'host',
        listsRegex: 'listsRegex',
        username: 'username',
        password: 'password',
        xAuthHeader: 'xAuthHeader'
    })

};

module.exports = setupController;
