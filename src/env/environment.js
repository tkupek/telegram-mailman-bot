'use strict';

const env = {
    web: {
        path: {
            favicon: "/favicon.ico",
            status: "/",
            setup: "/setup",
            stop: "/_ah/stop",
            start: "/_ah/start",
            pull: "/update/all",
            bot: "/bot"
        }
    }
}

module.exports = env;
