'use strict';

class SetupError {
    constructor(param) {
        this.param = param;
        this.msg = 'Incorrect value';
        this.location = 'body';
    }
}

module.exports = SetupError;
