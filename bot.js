var token = process.env.TOKEN;

var Bot = require('node-telegram-bot-api');
var bot;
var google = require('google')
const translate = require('google-translate-api');
const pool = require('./db');
var replies = require('./replies.js')
var util = require('util')
var AntiFlood = require('./antiflood.js')

google.resultsPerPage = 10

if(process.env.NODE_ENV === 'production') {
  bot = new Bot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
}
else {
  bot = new Bot(token, { polling: true });
}

console.log('Bot server started in the ' + process.env.NODE_ENV + ' mode');

bot.onText(/(.+)/, function (msg) {
  var id = msg.from.id;
  if (id == "161484381b") {
    if(msg.text == "Yes?")
      bot.sendMessage(msg.chat.id, "Explain");
    else if(msg.text == "What?")
      bot.sendMessage(msg.chat.id, "Nothing");
    }
});

bot.onText(/KmeSpam/, function(msg) {
//  for(i=1; i<=1; i++) {
//    bot.sendMessage(msg.chat.id, "Kmank");
//  }
});

bot.onText(/^KmeStop/, function(msg) {
  bot.sendMessage(msg.chat.id, "Not gonna happen, man.");
});

bot.onText(/^\/pizzaplz/, function(msg) {
  bot.sendMessage(msg.chat.id, "Go make your own pizza");
});

bot.onText(/^\/newreq (.+)/, function(msg) {
  var req = msg.text.slice(msg.text.indexOf(" ") +1);
  var from;

  // No need to tag the person who made the request
  if (msg.from.username)
    from = msg.from.username;
  else
    if (msg.from.last_name)
      from = msg.from.first_name + " " + msg.from.last_name;
    else
      from = msg.from.first_name;

  var query = "INSERT INTO requests (chat_id, user_id, req, from_name) VALUES ("
    + msg.chat.id + ", "
    + msg.from.id + ", '"
    + req + "', '"
    + from + "')";

  pool.query(query, function(err, result) {
    });
});

bot.onText(/^delreq/i, function(msg) {
  var id = Number(msg.text.slice(msg.text.indexOf(" ")));
  if (id) {
    var query = "SELECT * FROM requests WHERE chat_id = " + msg.chat.id + " AND id = " + id;
    pool.query(query, function(err, result) {
      if (result && result.rows && result.rows[0]) {
        var req_user_id = result.rows[0].user_id;
        var status = bot.getChatMember(msg.chat.id, msg.from.id);
        status.then(function(result){
          console.log(result.status);
          if (req_user_id == msg.from.id || result.status == "creator" || result.status == "administrator") {
            var delete_query = "DELETE FROM requests WHERE id = " + id + "AND chat_id = " + msg.chat.id;
            pool.query(delete_query, function(err, result) {
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
  var query = "SELECT id, req, from_name FROM requests WHERE chat_id = '" + msg.chat.id + "'";
  pool.query(query, function(err, result) {
    if (result && result.rows) {
      var items = "Requests for this group:\n\n\n";
      var item;
      result.rows.forEach(function(item) {
        if (item.id && item.req && item.from_name)
          items = items + "#" + item.id + "    " + item.req + "  ->   by  ->  " + item.from_name + "\n\n";
      });
      if (items) {
        bot.sendMessage(msg.chat.id, items);
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
        bot.sendMessage(msg.chat.id, items);
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

module.exports = bot;



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
  console.log("adding");

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
           .then(()=>{}, ()=>{})
      }
      else {
        var final_text = util.format(replies.main_text, from, msg.chat.title, msg.text)
        bot.sendMessage(userId,
                        final_text,
                        {parse_mode: 'HTML',
                         reply_markup: btn,
			 disable_notification: silent})
           .then(()=>{}, ()=>{}) // avoid logs
      }
    })
  }

  if (user.substring) { // user is a string -> get id from db
    var query = "SELECT id FROM users WHERE username='" + user.toLowerCase() + "'";
    pool.query(query, (err, result) => {
      if (!err && result && result.rows) {
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
      bot.answerCallbackQuery(call.id, replies.retrieve_success, true)
      }
  }
  else bot.answerCallbackQuery(call.id, replies.flooding, true)
})

bot.onText(/\/start/, (msg) => {
  if (msg.chat.type !== 'private') return

  if (!af.isFlooding(msg.from.id)) {
    bot.sendMessage(msg.chat.id, replies.start_private,
                    {
                      parse_mode: 'HTML',
                      reply_markup: {inline_keyboard: [[{text: replies.add_to_group, url: 't.me/TagAlertBot?startgroup=true'}]]}
                    }
    )
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

  if (
      (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') ||
      (msg.forward_from && msg.forward_from.id == bot.myId)
    ) return
  console.log("about to notify");
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
    if (!isEqual(msg.from.username, username) || DEBUG) {
      notifyUser(username, msg, false)
    }
  })
})
