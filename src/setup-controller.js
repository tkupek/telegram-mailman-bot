'use strict';

const crypto = require('crypto');

const SetupError = require("./setup-error");
const mailman = require('./mailman');
const data = require('./data');

const SESSION_MAX_AGE_IN_HOURS = 12;

const SALT_BYTE_LENGTH = 64;
const HASH_ENCODING = 'hex';


const setupController = {
    getNewSetupHash: function(chatId) {
        const hash = crypto.createHash(setupController.setupFields.sessionIdHash);

        hash.update(new Date().valueOf().toString());
        hash.update(chatId.toString());
        hash.update(crypto.randomBytes(SALT_BYTE_LENGTH));

        return hash.digest(HASH_ENCODING);
    },

    checkAndSaveSetup: async function (setupModel, successCallback) {
        // TODO: move save part out of this function again to make it more readable
        let maxAge = new Date();
        maxAge.setHours(maxAge.getHours() - SESSION_MAX_AGE_IN_HOURS);
        let chatId = await data.setupInit.getId(setupModel.sessionId, maxAge);
        if(!chatId) {
            console.error('No valid chatId for token [' + setupModel.sessionId + '] found.')
            return [
                new SetupError(setupController.setupFields.sessionId)
            ];
        }

        const newConnection = {
            url: setupModel.url,
            name: setupModel.username,
            password: setupModel.password,
            headers: { 'X-Auth': setupModel.xAuthHeader },
            lists: setupModel.listsRegex,
            created: new Date()
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
            await data.mailmanConnections.set(chatId, newConnection);
            await data.setupInit.delete(chatId);
            successCallback(chatId);
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
