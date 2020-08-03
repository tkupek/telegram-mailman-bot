# Telegram Mailman Moderator Bot

This Telegram chatbot can be used to moderate your Mailman Suite 3 lists via chat.
After setup, the bot automatically checks the Mailman API for new held mails and asks you to accept, reject or discard the mail.

![moderation example](https://raw.githubusercontent.com/tkupek/telegram-mailman-bot/master/doc/moderation-example.jpg)

## Prerequisites
The Mailman 3 API of your server has to be publicly available, secured with username and password.
Additional instructions can be found in the [Mailman Docs](https://docs.mailman3.org/projects/mailman/en/latest/src/mailman/rest/docs/rest.html).
We recommend to set an additional X-Auth Header on the Webserver for additional security.

We currently only tested the API in version 3.1. However, as we only use the /system and /lists calls, it might as well work with different versions.
Let us know if you have issues or successfully tested a different API version.

## Setup
The bot is available to everyone and can be used, simply by chatting with 'MailmanModeratorBot' on Telegram.

To setup a new connection, call /setup and follow the URL.
A web-form will ask you for the connection details and automatically tests the connection when submitting.

- API URL - *the URL for your Mailman 3 API, including the API version (https://lists.example.com/api/3.1)*
- Lists - *regex to match all lists to watch (* for all lists)*
- Username - *configured username of the Mailman 3 API*
- Password - *configured password of the Mailman 3 API*
- X-Auth-Header - *additional HTTP header to authenticate the API call (optional)*

⚠️ All connection parameters including the credentials will be saved in an internal database. This is necessary, as the Mailman 3 API does not support OAuth. We recommend to set an additional X-Auth Header on the Webserver for additional security.

On a successful connection, the bot will check for held mails on all lists that match the provided regex. On a new held mail, the bot sends a message and asks you to */accept*, */reject* or */decline* the mail.

## Commands
- **/setup** initialize mailman connection
- **/check** test connection
- **/lists** show monitored lists
- **/update** manual check for held mails
- **/reset** stop and remove connection

## Hosting & Support
The bot is hosted on the [GCloud App Engine](https://cloud.google.com/appengine).

A status page can be found at [https://mailman-moderator-bot.ey.r.appspot.com/](https://mailman-moderator-bot.ey.r.appspot.com/).

If you do not want to store your credentials in the central database, you can easily setup your own private bot. Just make sure to provide your own app.yaml and set the environment variable *BOT_TOKEN* and *BASE_URL*.

If you have any issues regarding the bot, feel free to open a [GitHub issue](https://github.com/tkupek/telegram-mailman-bot/issues).
