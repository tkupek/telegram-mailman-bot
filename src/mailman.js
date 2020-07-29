const axios = require('axios');

const mailman = {
	getHeldMails: async function(connection) {
		// checks all lists in connection and returns the first open mail
		for (let list of connection.lists) {
			heldMail = mailman.getHeldMail(connection, list);
			if(heldMail) {
				return heldMail;
			}
		}
		return;
	},
	getHeldMail: async function(connection, list) {
		// check list for open mails and returns the first open mail
		let response;
		try {
			response = await axios.get(connection.url + '/lists/' + list + '/held', this.getAuthConfig(connection));
		} catch (error) {
		    console.error(error);
		    return error;
		}

		let result = response.data;
		if(result.total_size > 0) {
			let entry = result.entries[0];
			return {
				'list': list,
				'from': entry.sender,
				'subject': entry.subject,
				'reason': entry.reason,
				'request_id': entry.request_id,
				'remaining': result.total_size -1
			};
		}

		return; // TODO find more elegant solution
	},
	checkVersion: async function(connection) {
		try {
			let response = await axios.get(connection.url + '/system/versions', this.getAuthConfig(connection));
			return response.data.mailman_version;
		} catch (error) {
		    console.error(error);
		    return error;
		}
	},
	checkConnection: async function(connection) {
		try {
			let response = await axios.get(connection.url + '/system', this.getAuthConfig(connection));
			return response.status;
		} catch (error) {
			console.error(error);
			return 499;
		}
	},
	moderateMail: async function(connection, list, request_id, action) {
		try {
			await axios.post(connection.url + '/lists/' + list + '/held/' + request_id, { 'action': action }, this.getAuthConfig(connection));
		} catch (error) {
		    console.error(error);
		    return error;
		}

		return true;
	},
	actions: Object.freeze({
		accept: 'accept',
		discard: 'discard',
		reject: 'reject'
	}),
	getAuthConfig: function (connection) {
		return {
			auth: {
				username: connection.name,
				password: connection.password
			},
			headers: connection.headers
		};
	}
};

module.exports = mailman;
