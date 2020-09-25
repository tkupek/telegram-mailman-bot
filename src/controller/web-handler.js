'use strict';

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const bodyParser = require('body-parser');
const pug = require('pug');
const path = require('path');

const SetupModel = require("../repository/setup-model")
const setupController = require('./setup-controller');
const env = require('../env/environment');

const urlencodedParser = bodyParser.urlencoded({ extended: false });
const setupFields = setupController.setupFields;

const webHandler = {
    init: function (launch, stop, botHandler, data) {
        const app = express();

        const renderStatusPage = pug.compileFile(path.join(__dirname, '..', '..', 'resources', 'status.pug'));
        const renderSetupPage = pug.compileFile(path.join(__dirname, '..', '..', 'resources', 'setup.pug'));

        app.get(env.web.path.status, async (req, res) => {
            let num_connections = await data.mailmanConnections.count();
            res.send(renderStatusPage({connections: num_connections}));
        });
        app.get(env.web.path.pull, async (req, res) => {
            let cronheader = req.headers['x-appengine-cron'] === 'true';
            let cronip = req.headers['x-appengine-user-ip'] === '0.1.0.1';
            if(!cronheader || !cronip) {
                res.sendStatus(403);
                return;
            }
            await botHandler.update_all();
            res.sendStatus(200)
        });
        app.get(env.web.path.favicon, (req, res) => res.sendStatus(204));
        app.get(env.web.path.stop, async (req, res) => {
            await stop();
            res.sendStatus(200);
        });
        app.use(botHandler.getBot().webhookCallback(env.web.path.bot + '/' + process.env.BOT_TOKEN));
        app.get(env.web.path.start, async (req, res) => {
            await launch();
            res.sendStatus(200);
        });
        app.get(env.web.path.setup, [
            query('id').isHash(setupFields.sessionIdHash)
        ], function (req, res) {
            let session_id = null;
            const validationError = validationResult(req);

            if(validationError.isEmpty()) {
                session_id = req.query.id;
            }
            res.send(renderSetupPage({sessionId: session_id}));
        });
        app.post(env.web.path.setup, urlencodedParser, [
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
                errorResponseArray = await setupController.checkAndSaveSetup(newSetupData, botHandler.sendSetupSuccess);

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
    }
};

module.exports = webHandler;
