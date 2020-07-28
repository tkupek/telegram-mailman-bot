'use strict';

class SetupModel {
    constructor(sessionId, host, listsRegex, username, password, xAuthHeader) {
        this.sessionId = sessionId;
        this.host = host;
        this.listsRegex = listsRegex;
        this.username = username;
        this.password = password;
        this.xAuthHeader = xAuthHeader;
    }
}

module.exports = SetupModel;
