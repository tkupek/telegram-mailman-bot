'use strict';

class SetupError {
    constructor(param, value) {
        this.param = param;
        this.value = value;
        this.msg = 'Incorrect value';
        this.location = 'body';
    }
}

module.exports = SetupError;
