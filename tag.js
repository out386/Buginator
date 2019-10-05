//   TagAlertBot (https://telegram.me/tagalertbot)
//   Simple notifications for mentions
//
//   Author: Antonio Pitasi (@Zaphodias)
//   2016 - made with love

var AntiFlood = require('./antiflood.js')
const pool = require('./db')
var replies = require('./replies.js')
var util = require('util')
var tools = require('./tools')
var af = new AntiFlood()

function addUser(username, userId, chatId) {
    if (!username || !userId) {
        return
    }

    var loweredUsername = username.toLowerCase()
    var query = 'INSERT INTO users VALUES (' + userId + ", '" + loweredUsername + "')"
    pool.query(query, (err, result) => {
        if (err) {
            // User already in db, updating him
            query = "UPDATE users SET username='" + loweredUsername + "' WHERE id=" + userId
            pool.query(query, (err, result) => {
                if (err) {
                    console.log(err)
                }
            })
        } else {
            console.log('Added an user to the database')
        }
    })
}

function notifyUser(bot, user, msg, silent) {
    if (user.substring) {
        // user is a string -> get id from db
        var query = "SELECT id FROM users WHERE username='" + user.toLowerCase() + "'"
        pool.query(query, (err, result) => {
            if (!err && result && result.rows && result.rows[0] && result.rows[0].id) {
                notify(bot, msg, result.rows[0].id, silent)
            }
        })
    } else if (user.toFixed) {
        // user is a number, already the id
        notify(bot, msg, user, silent)
    }
}

function notify(bot, msg, userId, silent) {
    bot.getChatMember(msg.chat.id, userId).then(res => {
        if (res.status === 'left' || res.status === 'kicked') {
            return
        }
        // User is inside in the group
        var from = util.format(
            '%s %s %s',
            msg.from.first_name,
            msg.from.last_name ? msg.from.last_name : '',
            msg.from.username ? `(@${msg.from.username})` : '',
        )
        var btn = { inline_keyboard: [[{ text: replies.retrieve }]] }

        if (msg.chat.username) {
            btn.inline_keyboard[0][0].url = `telegram.me/${msg.chat.username}/${msg.message_id}`
        } else {
            btn.inline_keyboard[0][0].callback_data = `/retrieve_${msg.message_id}_${-msg.chat.id}`
        }

        var finalText
        if (msg.photo) {
            finalText = util.format(replies.main_caption, from, msg.chat.title, msg.caption)
            var fileId = msg.photo[0].file_id
            bot.sendPhoto(userId, fileId, { caption: finalText, reply_markup: btn })
        } else {
            finalText = util.format(replies.main_text, from, msg.chat.title, msg.text)
            bot.sendMessage(userId, finalText, {
                parse_mode: 'HTML',
                reply_markup: btn,
                disable_notification: silent,
            })
        }
    })
}

function onCallback(bot, call) {
    if (!af.isFlooding(call.from.id)) {
        var splitted = call.data.split('_')
        if (splitted[0] === '/retrieve') {
            var messageId = splitted[1]
            var groupId = splitted[2]
            bot.sendMessage(
                -parseInt(groupId),
                util.format(
                    replies.retrieve_group,
                    call.from.username ? '@' + call.from.username : call.from.first_name,
                ),
                { reply_to_message_id: parseInt(messageId) },
            ).then(m => {
                tools.deleteMsg(bot, m, 20000)
            })
            bot.answerCallbackQuery(call.id, replies.retrieve_success, true)
        }
    } else {
        bot.answerCallbackQuery(call.id, replies.flooding, true)
    }
}

function onStart(bot, msg) {
    if (msg.chat.type !== 'private') {
        return
    }

    if (!af.isFlooding(msg.from.id)) {
        bot.sendMessage(msg.chat.id, replies.start_private)
    }
}

function onInfo(bot, msg) {
    if (!af.isFlooding(msg.from.id)) {
        if (msg.chat.type !== 'private') {
            bot.sendMessage(msg.chat.id, replies.start_group)
        } else {
            bot.sendMessage(msg.chat.id, replies.start_private, { parse_mode: 'HTML' })
        }
    }
}

function onMessage(bot, msg) {
    addUser(msg.from.username, msg.from.id, msg.chat.id)

    if (
        (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') ||
        (msg.forward_from && msg.forward_from.id === process.env.BOT_ID)
    ) {
        return
    }
    var toBeNotified = new Set() // avoid duplicate notifications if tagged twice

    // Text messages
    if (msg.text && msg.entities) {
        // Extract (hash)tags from message text
        var extract = entity => {
            return msg.text.substring(entity.offset + 1, entity.offset + entity.length).toLowerCase()
        }

        for (var i in msg.entities) {
            var entity = msg.entities[i]

            // Tags
            if (entity.type === 'mention') {
                var username = extract(entity)
                toBeNotified.add(username)
            } else if (entity.user) {
                // Users without username
                notifyUser(bot, entity.user.id, msg, false)
            }
        }
    } else if (msg.caption) {
        // Images/media captions
        var matched = msg.caption.match(/@[a-z0-9]*/gi)
        for (var c in matched) {
            var user = matched[c]
                .trim()
                .substring(1)
                .toLowerCase()
            toBeNotified.add(user)
        }
    } else return

    // helpful to check if the user is tagging himself
    var isEqual = (u1, u2) => {
        if (u1 && u2) return u1.toLowerCase() === u2.toLowerCase()
        else return false
    }

    // let's really send notifications
    toBeNotified.forEach(username => {
        // check if user is tagging himself
        if (!isEqual(msg.from.username, username)) {
            notifyUser(bot, username, msg, false)
        }
    })
}

module.exports.onMessage = onMessage
module.exports.onCallback = onCallback
module.exports.onInfo = onInfo
module.exports.onStart = onStart
