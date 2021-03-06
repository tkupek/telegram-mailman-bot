'use strict';

const { Datastore } = require('@google-cloud/datastore');

const datastore = new Datastore();

const KEY_CONNECTION = 'connection';
const KEY_DECISION = 'decision';
const KEY_SETUP = 'setup';

async function get(key) {
	try {
		let result = await datastore.get(datastore.key(key));
		return result[0];
	} catch(error) {
		console.error(error);
		return;
	}
}

async function set(key, value) {
	try {
		return await datastore.upsert({
			key: datastore.key(key),
			data: value,
		});
	} catch(error) {
		console.error(error);
		return error;
	}
}

async function del(key) {
	try {
		return await datastore.delete(datastore.key(key));
	} catch(error) {
		console.error(error);
		return error;
	}
}

async function query(query) {
	try {
		let result = await datastore.runQuery(query);
		if(!result[0].length) {
			return [];
		}
		return result[0].map(function(val) {
			return [val[datastore.KEY]['id'], val];
		});
	} catch(error) {
		console.error(error);
		return [];
	}
}

// TODO: export to a model class
const data = {
	mailmanConnections: {
		get: function(id) {
			return get([KEY_CONNECTION, id]);
		},
		set: function(id, connection) {
			return set([KEY_CONNECTION, id], connection)
		},
		delete: function(id) {
			return del([KEY_CONNECTION, id]);
		},
		all: function() {
			return query(datastore.createQuery(KEY_CONNECTION));
		},
		count: async function() {
			return (await query(datastore.createQuery(KEY_CONNECTION).select('__key__'))).length;
		}
	},
	openDecisions: {
		get: function(id) {
			return get([KEY_DECISION, id]);
		},
		set: function(id, decision) {
			return set([KEY_DECISION, id], decision);
		},
		delete: function(id) {
			return del([KEY_DECISION, id])
		}
	},
	setupInit: {
		get: function(id) {
			return get([KEY_SETUP, id]);
		},
		getId: async function(token, maxAgeDate) {
			let result = await query(datastore.createQuery(KEY_SETUP)
				.select('__key__')
				.filter('token', '=', token)
				.filter('created', '>', maxAgeDate));
			if(result.length) {
				return parseInt(result[0][0]);
			}
			return null;
		},
		set: function(id, setupToken, createdAt) {
			return set([KEY_SETUP, id], { token: setupToken, created: createdAt });
		},
		delete: function(id) {
			return del([KEY_SETUP, id]);
		}
	}
};

module.exports = data;
