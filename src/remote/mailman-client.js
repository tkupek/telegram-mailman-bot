'use strict';

const axios = require('axios');
const urljoin = require('url-join');

const mailmanClient = {
	getHeldMails: async function(connection) {
		// checks all lists in connection and returns the first open mail
		const selectedLists = await this.getSelectedLists(connection);

		for (let list of selectedLists) {
			const heldMail = await mailmanClient.getHeldMail(connection, list.address);
			if(heldMail) {
				return heldMail;
			}
		}

		return null;
	},
	getHeldMail: async function(connection, list) {
		// check list for open mails and returns the first open mail
		let response;
		try {
			response = await axios.get(urljoin(connection.url, '/lists', list, '/held'), this.getAuthConfig(connection));
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
				'remaining': result.total_size - 1
			};
		}
		/**
		 * TODO: find more elegant solution
		 *
		 * Best solution would be: https://github.com/tc39/proposal-optional-chaining
		 * But until this is fixed I would rather go with 'null'
		 */
		return null;
	},
	checkVersion: async function(connection) {
		try {
			let response = await axios.get(urljoin(connection.url, '/system/versions'), this.getAuthConfig(connection));
			return response.data.mailman_version;
		} catch (error) {
		    console.error(error);
		    return error;
		}
	},
	checkConnection: async function(connection) {
		try {
			let response = await axios.get(urljoin(connection.url, '/system'), this.getAuthConfig(connection));
			return response.status;
		} catch (error) {
			console.error("Check connection with url [" + connection.url + "] failed with status " + error.response.status.toString());
			if(error.response.status === 404) {
				return error.response.status;
			}
			return 499;
		}
	},
	moderateMail: async function(connection, list, request_id, action) {
		try {
			await axios.post(urljoin(connection.url, '/lists', list, '/held', request_id.toString()), { 'action': action }, this.getAuthConfig(connection));
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
	banAddress: async function(connection, email, list) {
		try {
			await axios.post(urljoin(connection.url, '/lists', list, '/bans'), { 'email': email }, this.getAuthConfig(connection));
		} catch (error) {
			console.error(error);
			return error;
		}

		return true;
	},
	banAddressGlobal: async function(connection, email) {
		try {
			await axios.post(urljoin(connection.url, '/bans'), { 'email': email }, this.getAuthConfig(connection));
		} catch (error) {
			console.error(error);
			return error;
		}

		return true;
	},
	getAuthConfig: function (connection) {
		return {
			auth: {
				username: connection.name,
				password: connection.password
			},
			headers: connection.headers
		};
	},
	getAllLists: async function (connection) {
		try {
			const response = await axios.get(urljoin(connection.url, '/lists'), this.getAuthConfig(connection));
			let availableLists = [];

			response.data.entries.forEach(item => {
				availableLists.push({
					"name": item.list_name,
					"domain": item.mail_host,
					"address": item.fqdn_listname,
					"mailman_id": item.list_id,
					"description": item.description,
					"subscribers": item.member_count
				});
			});

			return availableLists;
		} catch (error) {
			console.error(error);
			return [];
		}
	},
	getSelectedLists: async function(connection) {
		try {
			const allLists = await this.getAllLists(connection);
			let selectedLists = [];

			allLists.forEach(item => {
				if(item.address.match(connection.lists)) {
					selectedLists.push(item);
				}
			});

			return selectedLists;
		} catch (error) {
			console.error(error);
			return [];
		}
	}
};

module.exports = mailmanClient;
