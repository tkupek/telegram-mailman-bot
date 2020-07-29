const {Datastore} = require('@google-cloud/datastore');
var crypto = require('crypto')
var shasum = crypto.createHash('sha1')

const datastore = new Datastore();

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
			return get(['connection', id]);
		},
		set: function(id, connection) {
			return set(['connection', id], connection);
		},
		delete: function(id) {
			return del(['connection', id]);
		},
		all: function() {
			return query(datastore.createQuery('connection'));
		},
		count: async function() {
			return (await query(datastore.createQuery('connection').select('__key__'))).length;
		}
	},
	openDecisions: {
		get: function(id) {
			return get(['decision', id]);
		},
		set: function(id, decision) {
			return set(['decision', id], decision);
		},
		delete: function(id) {
			return del(['decision', id]);
		}
	},
	authLink: {
		create: async function(id) {
			shasum.update('TODO' + (new Date).getTime());
			let authId = shasum.digest('hex');

			await set(['auth', id], authId);
			return authId;
		},
		get: function(id) {
			return get(['auth', id]);
		},
		delete: function(id) {
			return del(['auth', id]);
		}
	}
};

module.exports = data;
