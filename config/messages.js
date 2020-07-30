const messages = {
	default: 'en',
	'en': {
        'START_INITIALIZED': 'Your connection is setup. Wait for a new message or call /update\ to pull.',
        'START_NOT_INITIALIZED': 'Welcome to Mailman Moderator Bot! To initialize your connection, type /setup.',
        'SETUP_NEW': 'Click on the following link and fill in the required fields to connect to a Mailman3 server. If necessary, ask your Mailman administrator for help.\nPlease note that the setup link expires after 12 hours.\n\n{{0}}',
        'HELP': 'This bot can help you to moderate your mailman lists via Telegram Chat. To start, type /setup.',
        'MAIL_NOTIFICATION': 'Mailman message on hold!\n\nList: {{0}}\nFrom: {{1}}\nSubject: {{2}}\nReason: {{3}}\n\nWhat\'s your decision?',
        'SETUP_SUCCESSFUL': 'Mailman connection successfully initialized. You can now wait for a message or call an manual /update.',
        'RESET': 'Everything clear. Bot was reset. Call /setup to start again.',
        'NOT_INITIALIZED': 'Connection to mailman not initialized. Call /setup.',
        'EMPTY_QUEUE': 'All clear, no new mails 🏁',
        'CONNECTION_FAILED': 'Something went wrong while fetching mails. Check your connection settings.',
        'CONNECTION_CHECK_SUCCESS': '✅ Connection check was successful.\nFound {{0}}',
        'CONNECTION_CHECK_FAIL': '❌ Connection check was not successful.',
        'DECISION_FAILED': 'Something went wrong while moderating mail. Check your connection settings.',
        'KEYBOARD_DECISION': ['/accept ✅', '/reject ↩️', '/discard ❌'],
        'NO_DECISION': 'No open decision. Call /update to check new mails.',
        'MODERATION_SUCCESS': 'Moderation successful. Decision [{{0}}] was sent.',
        'SETUP': 'To setup your mailman connection, please open the following URL and provide your connection parameters.\n{{0}}'
    }
}

module.exports = messages;
