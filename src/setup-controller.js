'use strict';

const crypto = require('crypto');

const SetupError = require("./setup-error");
const mailman = require('./mailman');
const data = require('./data');

const SESSION_MAX_AGE_IN_HOURS = 12;

const SALT_BYTE_LENGTH = 64;
const HASH_ENCODING = 'hex';


function saveConnection(sessionToken, connection) {
    let maxAge = new Date();
    maxAge.setHours(maxAge.getHours() - SESSION_MAX_AGE_IN_HOURS);

    const chatId = data.setupInit.getId(sessionToken, maxAge);

    if(chatId) {
        data.mailmanConnections.set(chatId, connection);
        data.setupInit.delete(chatId);
    }
}


const setupController = {
    getNewSetupHash: function(chatId) {
        const hash = crypto.createHash(setupController.setupFields.sessionIdHash);

        hash.update(new Date().valueOf().toString());
        hash.update(chatId.toString());
        hash.update(crypto.randomBytes(SALT_BYTE_LENGTH));

        return hash.digest(HASH_ENCODING);
    },

    checkAndSaveSetup: async function (setupModel) {
        const newConnection = {
            url: setupModel.url,
            name: setupModel.username,
            password: setupModel.password,
            headers: { 'X-Auth': setupModel.xAuthHeader },
            lists: setupModel.listsRegex
        };

        const connectionResult = await mailman.checkConnection(newConnection);

        if(connectionResult === 499) {
            return [
                new SetupError(setupController.setupFields.url, setupModel.url)
            ];

        }
        if(connectionResult === 401) {
            return [
                new SetupError(setupController.setupFields.username),
                new SetupError(setupController.setupFields.password),
                new SetupError(setupController.setupFields.xAuthHeader)
            ];
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
        url: 'url',
        listsRegex: 'listsRegex',
        username: 'username',
        password: 'password',
        xAuthHeader: 'xAuthHeader'
    })

};

module.exports = setupController;
