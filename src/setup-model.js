'use strict';

class SetupModel {
    constructor(sessionId, url, listsRegex, username, password, xAuthHeader) {
        this.sessionId = sessionId;
        this.url = url;
        this.listsRegex = listsRegex;
        this.username = username;
        this.password = password;
        this.xAuthHeader = xAuthHeader;
    }
}

module.exports = SetupModel;
