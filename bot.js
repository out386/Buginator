var token = process.env.TOKEN;

var Bot = require('node-telegram-bot-api');
var bot;
var google = require('google');
const translate = require('google-translate-api');
const pool = require('./db');
const fs = require('fs');
var replies = require('./replies.js');
var util = require('util');
var AntiFlood = require('./antiflood.js');
var request = require('request');

google.resultsPerPage = 10

if(process.env.NODE_ENV === 'production') {
  bot = new Bot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
}
else {
  bot = new Bot(token, { polling: true });
}

console.log('Bot server started in the ' + process.env.NODE_ENV + ' mode');

bot.onText(/^Botspam (\d)+$/i, function(msg) {
  var status = bot.getChatMember(msg.chat.id, msg.from.id);
  status.then(function(result) {
    if (result.status == "creator" || result.status == "administrator" || msg.from.id == process.env.OWNER) {
      var times = msg.text.replace(/^\D+/g, '');
      if (times > 20)
        bot.sendMessage(msg.chat.id, "I can\'t count that high, now FO");
      else {
        var message = "Total messages to send: " + times + "\nStarted by: @" + msg.from.username;
        var shouldDelete;
        if (msg.from.id == process.env.OWNER)
          shouldDelete = false;
        else
          shouldDelete = true;
        spam(msg.chat.id, times, message, shouldDelete);
      }
    }
  });
});

bot.onText(/^Bug him (\d)+$/i, function(msg) {
  if (msg.from.id == process.env.OWNER) {
    if (msg.reply_to_message) {
      var times = msg.text.replace(/^\D+/g, '');
      spam(msg.reply_to_message.from.id, times, "You have been tagged. No, not really. Just an useless notification.\n@out386\'s doing.", false);
    }
  }
});

async function spam(id, times, string, shouldDelete) {
  var delay = 1500;
  for( i = 1; i <= times; i++) {
    bot.sendMessage(id, string)
      .then((m) => {
        if (shouldDelete)
          deleteMsg(m,6000);
      });
    await sleep(delay);
  }
}
bot.onText(/^\/pun/i, function(msg) {
  fs.readFile("./puns.txt", function(err, data) {
    if(err)
      return;
    var lines = data.toString('utf8').split('\n');
    bot.sendMessage(msg.chat.id, lines[Math.floor(Math.random()*lines.length)]);
 });
});

bot.onText(/^KmeStop/, function(msg) {
  bot.sendMessage(msg.chat.id, "Not gonna happen, man.");
});

bot.onText(/^\/pizzaplz/, function(msg) {
  bot.sendMessage(msg.chat.id, "Go make your own pizza");
});

bot.onText(/^\/kick/, (msg) => {
  if (msg.reply_to_message) {
    var reply;
    var reply_msg_id;
    var from;

    if (msg.reply_to_message.from.id == process.env.OWNER || msg.reply_to_message.from.id == process.env.THIS_BOT) {
      if (msg.from.id == process.env.OWNER)
        reply = replies.owner_wrong_kick;
      else
        reply = replies.no_kick_permissions;
      reply_msg_id = msg.message_id;
      bot.sendMessage(msg.chat.id, reply, {reply_to_message_id: reply_msg_id});
    } else {
      if (msg.reply_to_message.from.last_name)
        from = msg.reply_to_message.from.first_name + " " + msg.reply_to_message.from.last_name;
      else
        from = msg.reply_to_message.from.first_name;

      request('http://whatthecommit.com/index.txt', function (error, response, body) {
        body = body.split('\n')[0];
        reply = "`" + replies.kick1;
        reply = reply + from;
        reply = reply + replies.kick2;
        reply = reply + from;
        reply = reply + replies.kick3;
        reply = reply + body;
        reply = reply + replies.kick4 + "`";
        reply_msg_id = msg.reply_to_message.message_id;
        bot.sendMessage(msg.chat.id, reply, {
                                              reply_to_message_id: reply_msg_id,
                                              parse_mode: "Markdown"
                                            });
      });
    }
  }
});

bot.onText(/^\/deletemsg/, (msg) => {
  var status = bot.getChatMember(msg.chat.id, msg.from.id);
  status.then(function(result){
    if ((result.status == "creator" || result.status == "administrator" || msg.from.id == process.env.OWNER) && msg.reply_to_message) {
      bot.deleteMessage(msg.reply_to_message.message_id, msg.chat.id)
        .then(()=>{}, ()=>{});
      bot.deleteMessage(msg.message_id, msg.chat.id)
        .then(()=>{}, ()=>{});
    }
  });
});
bot.onText(/^\/newreq (.+)/, function(msg) {
  var req = msg.text.slice(msg.text.indexOf(" ") +1);
  req = req.replace(/'/g, "''");
  console.log(req);
  var from;

  // No need to tag the person who made the request
  if (msg.from.username)
    from = "@" + msg.from.username;
  else
    if (msg.from.last_name)
      from = msg.from.first_name + " " + msg.from.last_name;
    else
      from = msg.from.first_name;
  var chat_id;
  if ( msg.chat.id == -1001106567058)
    chat_id = -1001143833889;
  else
    chat_id = msg.chat.id;
  var query = "INSERT INTO requests (chat_id, user_id, req, from_name) VALUES ("
    + chat_id + ", "
    + msg.from.id + ", '"
    + req + "', '"
    + from + "')";

  pool.query(query, function(err, result) {
    if (! err) {
      bot.sendMessage(msg.chat.id, "\"" + req + "\" was added.", {reply_to_message_id: msg.message_id})
        .then((m) => {
          deleteMsg(m, 15000);
        });
      deleteMsg(msg, 3000);
    }
  });
});

bot.onText(/^\/delreq (\d+)/i, function(msg) {
  var id = Number(msg.text.slice(msg.text.indexOf(" ")));
  if (id) {
    var query = "SELECT * FROM requests WHERE chat_id = " + msg.chat.id + " AND id = " + id;
    pool.query(query, function(err, result) {
      if (result && result.rows && result.rows[0]) {
        var req_user_id = result.rows[0].user_id;
        var req = result.rows[0].req;
        var status = bot.getChatMember(msg.chat.id, msg.from.id);
        status.then(function(result){
          if (msg.from.id == process.env.OWNER || req_user_id == msg.from.id || result.status == "creator" || result.status == "administrator") {
            var delete_query = "DELETE FROM requests WHERE id = " + id + "AND chat_id = " + msg.chat.id;
            pool.query(delete_query, function(err, result) {
              if (! err) {
                bot.sendMessage(msg.chat.id, "#" + id + ", \"" + req + "\", was deleted. ", {reply_to_message_id: msg.message_id})
                  .then((m) => {
                    deleteMsg(m, 15000);
                  });
                deleteMsg(msg, 3000);
              }
            });
          }
        }, function(err) {
          console.log("getchatmemberbroke");
        });
      }
    });
  }
});

bot.onText(/^getreq/i, function(msg) {
  var chatId = msg.chat.id;
  if (chatId == -1001106567058)
    chatId = -1001143833889;
  var query = "SELECT id, req, from_name FROM requests WHERE chat_id = '" + chatId + "' ORDER BY id";
  pool.query(query, function(err, result) {
    if (result && result.rows) {
      var items = "Requests for this group:\n\n\n";
      var item;
      var deleteDelay = 60000;
      result.rows.forEach(function(item) {
        if (item.id && item.req && item.from_name)
          items = items + "#" + item.id + "    " + item.req + "  ->   by  ->  " + item.from_name + "\n\n";
      });
      if (items) {
        deleteMsg(msg, 3000);
        bot.sendMessage(msg.chat.id, items)
          .then((m) => {
            deleteMsg(m, deleteDelay);
          });
        if (msg.from.id != process.env.OWNER)
          bot.sendMessage(msg.from.id, items)
            .catch(err => {});
      }
    }
  });
});

bot.onText(/\/save (.+)/, function(msg) {
  var text = msg.text;
  var tagStartIndex = text.indexOf("#");
  var tagEndIndex;
  var tag;
  var message;
  if (tagStartIndex > -1)
    tagEndIndex = text.indexOf(" ", tagStartIndex);
  if (tagEndIndex > -1) {
    tag = text.slice(tagStartIndex + 1, tagEndIndex);
    message = text.slice(tagEndIndex+1);
    console.log(msg.chat.id + ": #" + tag + " = " + message + "\n");
  }
  var query;
  if (tag) {
    var query = "insert into tags (id, tag, message) values ('" + msg.chat.id
      + "','" + tag
      + "','" + message + "')"
      + "on conflict on constraint uk do update set id='"
      + msg.chat.id + "', tag='"
      + tag + "', message='"
      + message + "'";

    pool.query(query, function(err, result) {
    });
  }
});

bot.onText(/^#([a-zA-Z0-9_\-]+)$/, function(msg) {
  var tag = msg.text.slice(msg.text.indexOf("#") + 1);
  if (tag) {
    var query = "SELECT message FROM tags WHERE id='"
        + msg.chat.id + "' AND tag='"
        + tag + "'";
    pool.query(query, function(err, result) {
      if (result && result.rows && result.rows[0] && result.rows[0].message) {
        bot.sendMessage(msg.chat.id, result.rows[0].message);
      }
    });
  }
});

bot.onText(/^alltags/i, function(msg) {
  var query = "SELECT tag FROM tags WHERE id='" + msg.chat.id + "'";
  pool.query(query, function(err, result) {
    if (result && result.rows) {
      var items = "Send tag to see the associated message\nTags for this group:\n";
      var item;
      result.rows.forEach(function(item) {
        if (item.tag) {
          items = items + "#" + item.tag + "\n";
        }
      });
      if (items) {
        bot.sendMessage(msg.chat.id, items)
          .then((m) => {
            deleteMsg(m, 15000);
          });
      }
    }
  });
});

bot.onText(/\/google (.+)/, function (msg) {
  var name = msg.from.first_name;
  var message = msg.text;

  google(message, function (err, res){
    if (err) console.error(err)
    var link = res.links[0];
    var title = link.title;
    var url = link.href;

    if (url == null) {
      if (res.next) res.next()
    } else
    bot.sendMessage(msg.chat.id, title + "\n\n" + url);
  })
});

bot.on('inline_query', function(msg) {
  var name = msg.from.first_name;
  var message = msg.query;
  var user = msg.from.id;
  var reses = [];
//  console.log("Got message! " + message + " from " + msg.id);

  if (message) {

    if(/g (.+)/.test(message)) {
      message = message.replace(/g /, '');
//      console.log(message);
      google(message, function (err, res){
        if (err) console.error(err)
        var results = [];
        for (var i = 0; i < res.links.length; ++i) {
          var link = res.links[i];
          //console.log(link);
          var title = link.title;
          var url = link.href;
          if (url != null) {
            var spliturl = url.split('/');
            var baseurl = spliturl[0] +"//" + spliturl[2] + "/favicon.ico";

            var result = {"type": "article",
                          "id" : i+'',
                          "title" : title,
                          "input_message_content" : {"message_text" : "<code>Google: Result for</code>   <b>\"" + message + "\" :</b>\n\n" + url, "parse_mode" : "HTML"},
                          "thumb_url" : baseurl,
                          "hide_url" : true,
                          "description" : link.description};
            results.push(result);
            bot.answerInlineQuery(msg.id, results);
          }
        }
      })
//            console.log(results);
    }

    else if(/t (.+)/.test(message)) {
      message = message.replace(/t /, '');
      translate(message, {to: 'en'}).then(res => {
        var result = {"type": "article",
                      "id": "1",
                      "title": "Translated to English",
                      "input_message_content": {"message_text": res.text},
                      "description": res.text};
        var results = [];
        results.push(result);
        bot.answerInlineQuery(msg.id, results);
      }).catch(err => {
          console.error(err);
      });
   }
    else {
      var results = [];
      var result = {"type": "article",
         "id" : "oops",
         "title" : "Invalid query",
         "input_message_content" : {"message_text" : "Invalid query."},
         "hide_url" : true,
         "description" : "Invalid command! Check the list of available commands."};
     results.push(result);
     bot.answerInlineQuery(msg.id, results);
    }
  }
  else {
    var results = [];
    var result = {"type": "article",
     "id" : "Googlen",
     "title" : "Google",
     "input_message_content" : {"message_text" : "Type @BigBug_bot g (query) to search with Google"},
     "thumb_url" : "https://google.com/favicon.ico",
     "hide_url" : true,
     "description" : "Search for anything with Google Search\nTap \"g\" (without quotes) now to use."};
     results.push(result);

    result = {"type": "article",
     "id" : "Translaten",
     "title" : "Translate to english",
     "input_message_content" : {"message_text" : "Type @BigBug_bot t (text) to translate to english"},
     "hide_url" : true,
     "description" : "Translate anything with Google Translate\nTap \"t\" (without quotes) now to use."};
     results.push(result);
     bot.answerInlineQuery(msg.id, results);
  }
//  console.log("here "+msg.id+" results are :"+results);
});

async function deleteMsg (msg, time) {
  await sleep (time);
  bot.deleteMessage(msg.message_id, msg.chat.id)
    .catch(err => {});
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//------------------------------------------------------------------------------------//
//			TagAlertBot						      //
//------------------------------------------------------------------------------------//


/****************************************************/
//   TagAlertBot (https://telegram.me/tagalertbot)  //
//   Simple notifications for mentions              //
//                                                  //
//   Author: Antonio Pitasi (@Zaphodias)            //
//   2016 - made with love                          //
/****************************************************/

var af = new AntiFlood()

function removeGroup(groupId) {
  var query = "DELETE FROM groups WHERE groupId=" + groupId;
  pool.query(query, (err, result) => {
    if (err) return
    console.log("Removing group %s", groupId)
  })
}

function removeUserFromGroup(userId, groupId) {
  var query = "DELETE FROM groups WHERE userId=" + userId + " AND groupId=" + groupId;
  pool.query(query, (err, result) => {
    if (err) return
    console.log("Removing @%s from group %s", userId, groupId)
  })
}

function addUser(username, userId, chatId) {
  if (!username || !userId) return

  var loweredUsername = username.toLowerCase()
  var query = "INSERT INTO users VALUES (" + userId + ", '" + loweredUsername + "')";
  pool.query(query, (err, result) => {
    if (err) {
      // User already in db, updating him
      query = "UPDATE users SET username='" + loweredUsername + "' WHERE id=" + userId;
      pool.query(query, (err, result) => {})
    }
    else
      console.log("Added @%s (%s) to database", loweredUsername, userId)
  })

  if (userId !== chatId)
    query = "INSERT INTO groups VALUES (" + chatId + ", " + userId + ")";
    pool.query(query, (err, result) => {})
}

function notifyUser(user, msg, silent) {
  var notify = (userId) => {
    bot.getChatMember(msg.chat.id, userId).then((res) => {
      if (res.status == 'left' || res.status == 'kicked') return
      // User is inside in the group
      var from = util.format('%s %s %s',
        msg.from.first_name,
        msg.from.last_name ? msg.from.last_name : '',
        msg.from.username ? `(@${msg.from.username})` : ''
      )
      var btn = {inline_keyboard:[[{text: replies.retrieve}]]}
      if (msg.chat.username)
        btn.inline_keyboard[0][0].url = `telegram.me/${msg.chat.username}/${msg.message_id}`
      else
        btn.inline_keyboard[0][0].callback_data = `/retrieve_${msg.message_id}_${-msg.chat.id}`

      if (msg.photo) {
        var final_text = util.format(replies.main_caption, from, msg.chat.title, msg.caption)
        var file_id = msg.photo[0].file_id
        bot.sendPhoto(userId, file_id, {caption: final_text, reply_markup: btn})
          .then((m)=>{}, ()=>{})
      }
      else {
        var final_text = util.format(replies.main_text, from, msg.chat.title, msg.text)
        bot.sendMessage(userId,
                        final_text,
                        {parse_mode: 'HTML',
                         reply_markup: btn,
			 disable_notification: silent})
          .then((m)=>{}, ()=>{})
      }
    })
  }

  if (user.substring) { // user is a string -> get id from db
    var query = "SELECT id FROM users WHERE username='" + user.toLowerCase() + "'";
    pool.query(query, (err, result) => {
      if (!err && result && result.rows && result.rows[0] && result.rows[0].id) {
        notify(result.rows[0].id)
      }
    });
  }
  // user is a number, already the id
  else if (user.toFixed) notify(user)
}

bot.on('callback_query', (call) => {
  if (!af.isFlooding(call.from.id)) {
    var splitted = call.data.split('_')
    if (splitted[0] === '/retrieve') {
      var messageId = splitted[1]
      var groupId = splitted[2]
      bot.sendMessage(-parseInt(groupId),
      util.format(replies.retrieve_group, call.from.username?'@'+call.from.username:call.from.first_name),
      {reply_to_message_id: parseInt(messageId)})
        .then((m) => {
          deleteMsg(m, 20000)
        })
      bot.answerCallbackQuery(call.id, replies.retrieve_success, true)
      }
  }
  else bot.answerCallbackQuery(call.id, replies.flooding, true)
})

bot.onText(/\/start/, (msg) => {
  if (msg.chat.type !== 'private') return

  if (!af.isFlooding(msg.from.id)) {
    bot.sendMessage(msg.chat.id, replies.start_private)
  }
})

bot.onText(/^\/info$|^\/info@TagAlertBot$/gi, (msg) => {
  if (!af.isFlooding(msg.from.id)) {
    if (msg.chat.type !== 'private')
      bot.sendMessage(msg.chat.id, replies.start_group)
    else
      bot.sendMessage(msg.chat.id, replies.start_private, {parse_mode: 'HTML'})
  }
})

bot.on('message', (msg) => {
  addUser(msg.from.username, msg.from.id, msg.chat.id)

  // A user left the chat
  if (msg.left_chat_member) {
    var userId = msg.left_chat_member.id
    if (userId == bot.myId)
      removeGroup(msg.chat.id)
    else
      removeUserFromGroup(userId, msg.chat.id)
    return
  }
  else if (msg.new_chat_member) {
    // Checking if the bot got added to a chat
    leave_check(msg);
  }

  if (
      (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') ||
      (msg.forward_from && msg.forward_from.id == bot.myId)
    ) return
  var toBeNotified = new Set() // avoid duplicate notifications if tagged twice

  // Text messages
  if (msg.text && msg.entities) {
    // Extract (hash)tags from message text
    var extract = (entity) => {
      return msg.text
                .substring(entity.offset + 1, entity.offset + entity.length)
                .toLowerCase()
    }

    for (var i in msg.entities) {
      var entity = msg.entities[i]

      // Tags
      if (entity.type === 'mention') {
        var username = extract(entity)
        toBeNotified.add(username)
      }

      // Users without username
      else if (entity.user)
        notifyUser(entity.user.id, msg, false)
    }
  }

  // Images/media captions
  else if (msg.caption) {
    var matched = msg.caption.match(/@[a-z0-9]*/gi)
    for (var i in matched) {
      var username = matched[i].trim().substring(1).toLowerCase()
      toBeNotified.add(username)
    }
  }

  else return

  // helpful to check if user is tagging himself
  var isEqual = (u1, u2) => {
    if (u1 && u2) return u1.toLowerCase() === u2.toLowerCase()
    else return false
  }

  // let's really send notifications
  toBeNotified.forEach((username) => {
    // check if user is tagging himself
    if (!isEqual(msg.from.username, username)) {
      notifyUser(username, msg, false)
    }
  })
})

bot.onText(/!addgroup/, (msg) => {
  if (msg.from) {
    if (msg.from.id == process.env.OWNER) {
      var query = "INSERT INTO authorized_chats VALUES (" + msg.chat.id + ")";
      pool.query(query, (err, result) => {});
    }
  }
});

async function leave_check(msg) {
  if (msg.new_chat_member.id == process.env.THIS_BOT) {
    await sleep(20000);
    var query = "SELECT chat_id FROM authorized_chats WHERE chat_id=" + msg.chat.id;
    pool.query(query, (err, result) => {
      // so many checks because I just want this to work, not gonna do it properly and read the docs
      if (err || !result || !result.rows || !result.rows[0]) {
        bot.leaveChat(msg.chat.id);
      }
    });
  }
}

bot.deleteMessage = function (message_id, chat_id, form = {}) {
  form.chat_id = chat_id;
  form.message_id = message_id;
  return this._request('deleteMessage', { form });
}

module.exports = bot;
