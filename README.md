# Buginator

A Telegram bot with some random features. https://t.me/smallBug_bot


## Usage

#### Inline functions:

1. @smallBug_bot g (query) : Perform an inline/interactive Google Search.
2. @smallBug_bot t (text) : Translate text to english.


#### Group tag management:

1. /newtag tag message : Save a message (admins only).
2. tag : show the saved message.
3. /alltags : List all tags in the current group.
4. /deltag tag : Delete tag (admins only).

#### Random features
1. /boot : Use when really angry at someone. Doesn't actually kick.
2. /pun : Sends a random pun from a predefined list of puns.


#### Group request management:

_Stores the provided message in a list._  
1. /newreq request : Add a new request for the group. Useful for things like feature requests.
2. /allreqs : Show all requests for this group (autodelete in 60 seconds).
3. /delreq requestNumber : Delete the specified request (bot owner, group admin, and original requester only). There's no validation before confirmation, so things like "/deltag The biggest idiot" will produce interesting results.


#### Before Hosting:

This bot needs the "privacy" attribute to be set to "disabled" and the inline attribute to be set to "enabled" from Botfather.

This bot was written using [heroku-node-telegram-bot](https://github.com/volodymyrlut/heroku-node-telegram-bot). The below are the hosting instructions from heroku-node-telegram-bot, modified for Buginator.


## Hosting instructions

#### Setup and run locally

1. Create a new bot using Telegram's [BotFather](https://core.telegram.org/bots#3-how-do-i-create-a-bot) and copy your TOKEN.
2. Send "/setprivacy" to BotFather, and set it to "disabled".
3. Send "/setinline" to BotFather, and turn it on.
4. Clone or download and unpack this repo.
5. Go to the app's folder.
6. Run `npm install` (in some cases you will need to run this with sudo).
7. Rename .env_example file into .env and set TOKEN to the value you've got from the BotFather.
8. Send the bot a message.
9. Go to https://api.telegram.org/bot(botToken)/getUpdates.
10. Copy the value for result[0].message.from.id, and set OWNER to that value in .env.
11. Go to https://api.telegram.org/bot(botToken)/getMe.
12. Copy the value for result.id, and set BOT_ID to that value in .env.
13. Run `npm start`. As there is no PostgreSQL database, many of the features won't work yet.


#### Deploy the bot to Heroku

1. Create an [Heroku account](https://heroku.com) and install the [Heroku Toolbelt](https://toolbelt.heroku.com/).
2. [Provision](https://devcenter.heroku.com/articles/heroku-postgresql#provisioning-heroku-postgres) Heroku Postgres.
3. Login to your Heroku account using `heroku login`.
4. Go to the app's folder.
5. Run `heroku create` to prepare the Heroku environment.
6. Run `heroku config:set TOKEN=(botToken)`.
7. Run `heroku config:set HEROKU_URL=$(heroku info -s | grep web_url | cut -d= -f2)`.
8. Run `heroku config:set OWNER=(OWNER from step 10 in the previous section)`.
9. Run `heroku config:set BOT_ID=(BOT_ID from step 12 in the previous section)`.
10. Run `git add -A && git commit -m "Commit message" && git push heroku master` to deploy the bot to Heroku.

All features will now work.


#### Set up the local environment

To use Heroku Postgres while developing locally, run `source .setHeroku` before running `npm start`. That script also adds a few aliases that are useful while running on Heroku.  
In development mode, the bot works using [polling](https://en.wikipedia.org/wiki/Push_technology#Long_polling) and on the heroku server it uses a [webhook](https://core.telegram.org/bots/api#setwebhook), because Heroku will shut down the bot after a period of inactivity. That would have resulted in the polling loop shutting down, too. Once a webhook is enabled, Telegram will return an error `{"ok":false,"error_code":409,"description":"Error: Conflict: another webhook is active"}` when you try to use polling again.

To go back to development mode, run `npm run switch_to_dev`. This script will disable the current webhook and start the bot locally. Run `git push heroku master` when done, to deploy it to Heroku. Then restart the bot using `heroku restart`. It will set the webhook again.


## Credits

The puns were copied from [here](https://www.bungie.net/en/Forums/Post/134567540?page=0&path=1).  
The /boot messages get generated with [this](https://github.com/ngerakines/commitment), from [here](http://whatthecommit.com/index.txt).  
This bot was written using [heroku-node-telegram-bot](https://github.com/volodymyrlut/heroku-node-telegram-bot).  