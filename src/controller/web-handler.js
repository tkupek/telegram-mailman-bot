const express = require('express');

const env = require('../env/environment');

const webHandler = {
    init: function () {
        const app = express();

        app.get(env.web.path.status, async (req, res) => {
            let num_connections = await data.mailmanConnections.count();
            res.send('The Telegram MailmanModeratorBot is up and running.<br/><br/>' + String(num_connections) + ' connection' + (num_connections === 1 ? '' : 's') + ' monitored.');
        });
        app.get(env.web.path.favicon, (req, res) => res.sendStatus(204));
        app.get(env.web.path.stop, async (req, res) => {
            // this is not working, bot is not stopped correctly and http 500 is given
            await bot.stop(() => {
                console.log('bot stopped...')
                res.sendStatus(200)
            });
        });
        app.get(env.web.path.start, async (req, res) => {
            await bot.launch();
            res.sendStatus(200);
        });

        app.listen(process.env.PORT, () => {
            console.log('webserver initialized and listening...');
        });
    }
};

module.exports = webHandler;
