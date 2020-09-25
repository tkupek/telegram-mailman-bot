'use strict';

const env = {
    web: {
        path: {
            favicon: "/favicon.ico",
            status: "/",
            setup: "/setup",
            stop: "/_ah/stop",
            start: "/_ah/start",
            update: "/update/all"
        }
    }
}

module.exports = env;
