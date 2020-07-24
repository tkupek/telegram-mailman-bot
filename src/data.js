const {Datastore} = require('@google-cloud/datastore');

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
		let result = await datastore.runQuery(datastore.createQuery(query));
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
			return set(['connection', id], connection)
		},
		delete: function(id) {
			return del(['connection', id]);
		},
		all: function() {
			return query('connection');
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
			return del(['decision', id])
		}
	}
};

module.exports = data;
