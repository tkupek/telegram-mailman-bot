
const {Datastore} = require('@google-cloud/datastore');
var crypto = require('crypto')
var shasum = crypto.createHash('sha1')
=======
const { Datastore } = require('@google-cloud/datastore');
>>>>>>> 26c776be09fd4af2e177018040b1385ffeb4b663

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
		return result[0].map(function(val) {
			return [val[datastore.KEY]['id'], val];
		});
	} catch(error) {
		console.error(error);
		return [];
	}
}

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
		getId: function(token, maxAgeDate) {
			return query(datastore.createQuery(KEY_SETUP)
				.select('__key__')
				.filter('token', '=', token)
				.filter('created', '>', maxAgeDate.toISOString()));
		},
		set: function(id, setupToken, createdAt) {
			return set([KEY_SETUP, id], { token: setupToken, created: createdAtDate.toISOString() });
		},
		delete: function(id) {
			return del(['KEY_SETUP', id]);
		}
	}
};

module.exports = data;
