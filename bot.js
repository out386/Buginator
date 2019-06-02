var token = process.env.TOKEN;

var Bot = require('node-telegram-bot-api');
var bot;
const translate = require('google-translate-api');
var request = require('request');
const crypto = require('crypto')
const search = require('./search');
const pool = require('./db');
const fs = require('fs');
var replies = require('./replies.js');
var tools = require('./tools');
if (process.env.DATABASE_URL) {
  var tagAlert = require('./tag');
}

if (process.env.NODE_ENV === 'production') {
  bot = new Bot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
} else {
  bot = new Bot(token, { polling: true });
}

console.log('Bot server started in the ' + process.env.NODE_ENV + ' mode');

bot.onText(/^Hey, bot$/, (msg) => {
  bot.sendMessage(msg.chat.id, replies.bot_ready_reply);
});

bot.onText(/^spam (\d)+$/i, function (msg) {
  if (!msg.reply_to_message || msg.reply_to_message.from.id != process.env.BOT_ID ||
       !msg.reply_to_message.text || msg.reply_to_message.text !== replies.bot_ready_reply) {
    return;
  }
  var status = bot.getChatMember(msg.chat.id, msg.from.id);
  status.then(function (result) {
    if (result.status === 'creator' || result.status === 'administrator' ||
        msg.from.id == process.env.OWNER) {
      var times = msg.text.replace(/^\D+/g, '');
      if (times > 20) {
        bot.sendMessage(msg.chat.id, "I can't count that high, now FO");
      } else {
        var message = 'Total messages to send: ' + times + '\nStarted by: @' + msg.from.username;
        spam(msg.chat.id, times, message, msg);
      }
    } else {
      bot.sendMessage(msg.chat.id, 'GTFO.');
    }
  });
});

bot.onText(/^\/restart$|^\/restart@smallBug_bot$/, (msg) => {
  if (msg.from.id == process.env.OWNER) {
    request.delete(
      {
        url: 'https://api.heroku.com/apps/' + process.env.APP_NAME_HEROKU + '/dynos/',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.heroku+json; version=3',
          'Authorization': 'Bearer ' + process.env.API_TOKEN_HEROKU
        }
      }, (err, resp, body) => {
        if (err) {
          console.log("Restart error" + err);
        } else if (resp && resp.statusCode === 202)
          bot.sendMessage(msg.chat.id, "Restarting the bot");
      }
    );
  }
});

bot.onText(/^flood pm([a-zA-Z\s]?)+ (\d)+$/i, function (msg) {
  if (msg.from.id == process.env.OWNER && msg.reply_to_message) {
    var message;
    var lastSpace = msg.text.lastIndexOf(' ');
    var times = msg.text.slice(lastSpace + 1);
    var messageInText = msg.text.slice(msg.text.indexOf(' ') + 1);
    messageInText = messageInText.slice(messageInText.indexOf(' ') + 1);
    lastSpace = messageInText.lastIndexOf(' ');

    if (lastSpace > -1) {
      message = '@out386 says :\n' + messageInText.slice(0, lastSpace);
    } else {
      message = "You have been tagged. No, not really. Just an useless notification.\n@out386's doing.";
    }
    spam(msg.reply_to_message.from.id, times, message, msg);
  } else { bot.sendMessage(msg.chat.id, 'Uh... No.'); }
});

async function spam (id, times, string, originalMessage) {
  var delay = 1500;
  const APPEND_TEXT = '\nMessage number: ';
  for (var i = 1; i <= times; i++) {
    bot.sendMessage(id, string + APPEND_TEXT + i)
      .catch((ignored) => {
      });
    await tools.sleep(delay);
  }
}

bot.onText(/^\/pun$/i, function (msg) {
  fs.readFile('./puns.txt', function (err, data) {
    if (err) { return; }
    var lines = data.toString('utf8').split('\n');
    bot.sendMessage(msg.chat.id, lines[Math.floor(Math.random() * lines.length)]);
  });
});

bot.onText(/^\/boot$/, (msg) => {
  if (msg.reply_to_message) {
    var replyMsgId;
    var from;

    if (msg.reply_to_message.from.id == process.env.OWNER ||
        msg.reply_to_message.from.id == process.env.BOT_ID) {
      var reply;
      if (msg.from.id == process.env.OWNER) {
        reply = replies.owner_wrong_kick;
      } else {
        reply = replies.no_kick_permissions;
      }
      replyMsgId = msg.message_id;
      bot.sendMessage(msg.chat.id, reply,
        {
          reply_to_message_id: replyMsgId
        });
    } else {
      if (msg.reply_to_message.from.last_name) {
        from = msg.reply_to_message.from.first_name +
          ' ' + msg.reply_to_message.from.last_name;
      } else {
        from = msg.reply_to_message.from.first_name;
      }

      request('http://whatthecommit.com/index.txt', (error, response, body) => {
        if (error) {
          console.log(error);
          return;
        }
        var reply = generateKickReply(from, body);
        replyMsgId = msg.reply_to_message.message_id;
        bot.sendMessage(msg.chat.id, reply,
          {
            reply_to_message_id: replyMsgId,
            parse_mode: 'Markdown'
          });
      });
    }
  }
});

function generateKickReply (from, body) {
  body = body.split('\n')[0];
  var reply = '`' + replies.kick1;
  reply = reply + from;
  reply = reply + replies.kick2;
  reply = reply + from;
  reply = reply + replies.kick3;
  reply = reply + body;
  reply = reply + replies.kick4 + '`';
  return reply;
}

bot.onText(/^\/id$|^\/id@smallbug_bot$/i, (msg) => {
  var type;
  var reply;
  if (msg.chat.type === 'private') {
    type = 'chat';
    reply = replies.private_id_text;
  } else {
    if (msg.chat.type === 'supergroup') {
      type = 'group';
    } else {
      type = 'chat';
    }
    reply = replies.id_text1 + type + replies.id_text2;
  }
  reply = reply + msg.chat.id + '`.';
  bot.sendMessage(msg.chat.id, reply, {
    reply_to_message_id: msg.message_id,
    parse_mode: 'Markdown'
  });
});

bot.onText(/^\/deletemsg$/, (msg) => {
  if (msg.from.id == process.env.OWNER && msg.reply_to_message) {
    deleteMessageCommand(msg);
  } else {
    var status = bot.getChatMember(msg.chat.id, msg.from.id);
    status.then(function (result) {
      if ((result.status === 'creator' || result.status === 'administrator') &&
          msg.reply_to_message) {
        deleteMessageCommand(msg);
      }
    });
  }
});

function deleteMessageCommand (msg) {
  bot.deleteMessage(msg.reply_to_message.message_id, msg.chat.id);
  bot.deleteMessage(msg.message_id, msg.chat.id);
}

// For string substituition
bot.onText(/^s\/(.+)/i, (msg) => {
  if (!msg.reply_to_message || !msg.reply_to_message.text || !msg.text) { return; }
  var message = msg.text.substring(2); // As 0 and 1 are "s/"
  var regexIndex = findMessageIndex(message, 0);
  if (regexIndex === -1) {
    return;
  }
  var replaceIndex = findMessageIndex(message, regexIndex + 1);
  if (replaceIndex === -1) {
    return;
  }
  var regexText = message.substring(0, regexIndex);
  var replaceText = message.substring(regexIndex + 1, replaceIndex);
  replaceText = replaceText.replace(/\\/g, ''); // Yeah, can't use real backslashes in the replace string. :evil_smile:
  var regexp;
  try {
    regexp = new RegExp(regexText, 'g');
  } catch (e) {
    return;
  }
  var newText = msg.reply_to_message.text.replace(regexp, replaceText);
  bot.sendMessage(msg.chat.id, newText, {reply_to_message_id: msg.reply_to_message.message_id});
});

function findMessageIndex (msg, index) {
  while (true) {
    if (index >= msg.length) {
      break;
    }
    var tempIndex = msg.indexOf('/', index);
    if (tempIndex > -1 && (tempIndex === 0 || msg.charAt(tempIndex - 1) !== '\\')) {
      return tempIndex;
    } else {
      index++;
    }
  }
  return -1;
}

bot.onText(/^\/newReq (.+)/i, function (msg) {
  if (!process.env.DATABASE_URL) {
    return;
  }
  var text = msg.text.trim();
  var req = text
    .slice(text.indexOf(' ') + 1);
  req = req.replace(/'/g, "''");
  var from;

  if (msg.from.username) {
    from = '@' + msg.from.username;
  } else {
    from = msg.from.first_name;
    if (msg.from.last_name) {
      from = from + ' ' + msg.from.last_name;
    }
  }
  var chatId = msg.chat.id;
  var query = 'INSERT INTO requests (chat_id, user_id, req, from_name) VALUES (' +
    chatId + ', ' +
    msg.from.id + ", '" +
    req + "', '" +
    from + "')";

  pool.query(query, function (err, result) {
    if (!err) {
      bot.sendMessage(msg.chat.id, '"' + req + '" was added.', {reply_to_message_id: msg.message_id})
        .then((m) => {
          tools.deleteMsg(bot, m, 15000);
        });
      tools.deleteMsg(bot, msg, 3000);
    }
  });
});

bot.onText(/^\/delReq (\d+)/i, function (msg) {
  if (!process.env.DATABASE_URL) {
    return;
  }
  var id = Number(msg.text.slice(msg.text.indexOf(' ')));
  if (id) {
    var query = 'SELECT * FROM requests WHERE chat_id = ' + msg.chat.id + ' AND id = ' + id;
    pool.query(query, function (err, result) {
      if (err) {
        bot.sendMessage(msg.chat.id, 'Could not delete.', {reply_to_message_id: msg.message_id});
        return;
      }
      if (result && result.rows && result.rows[0]) {
        var reqUserId = result.rows[0].user_id;
        var req = result.rows[0].req;
        if (msg.from.id == process.env.OWNER || msg.from.id == reqUserId) {
          deleteReq(id, msg, req);
        } else {
          var status = bot.getChatMember(msg.chat.id, msg.from.id);
          status.then(function (result) {
            if (result.status === 'creator' || result.status === 'administrator') {
              deleteReq(id, msg, req);
            }
          }, function (err) {
            bot.sendMessage(msg.chat.id, 'Could not delete.', {reply_to_message_id: msg.message_id});
            console.log('getchatmemberbroke' + err);
          });
        }
      }
    });
  }
});

function deleteReq (id, msg, req) {
  if (!process.env.DATABASE_URL) {
    return;
  }
  var deleteQuery = 'DELETE FROM requests WHERE id = ' + id + 'AND chat_id = ' + msg.chat.id;
  pool.query(deleteQuery, function (err, result) {
    if (!err) {
      bot.sendMessage(msg.chat.id, '#' + id + ', "' + req + '", was deleted. ',
        {
          reply_to_message_id: msg.message_id
        }
      ).then((m) => {
        tools.deleteMsg(bot, m, 15000);
      });
      tools.deleteMsg(bot, msg, 3000);
    }
  });
}

bot.onText(/^\/allReqs/i, function (msg) {
  if (!process.env.DATABASE_URL) {
    return;
  }
  var chatId = msg.chat.id;
  var query = "SELECT id, req, from_name FROM requests WHERE chat_id = '" + chatId + "' ORDER BY id";
  pool.query(query, (err, result) => {
    if (err) {
      return;
    }
    var deleteDelay = 60000;
    if (result && result.rows && result.rows[0]) {
      var items = 'Requests for this group:\n\n\n';
      result.rows.forEach((item) => {
        if (item.id && item.req && item.from_name) { items = items + '#' + item.id + '    ' + item.req + '  ->   by  ->  ' + item.from_name + '\n\n'; }
      });
      if (items) {
        tools.deleteMsg(bot, msg, 3000);
        bot.sendMessage(msg.chat.id, items)
          .then((m) => {
            tools.deleteMsg(bot, m, deleteDelay);
          });
      }
    } else {
      bot.sendMessage(msg.chat.id, 'There are no requests for this group.')
        .then((m) => {
          tools.deleteMsg(bot, m, deleteDelay);
        });
    }
  });
});

bot.onText(/^(\/newTag (.+))/i, msg => {
  if (!process.env.DATABASE_URL) {
    return;
  }
  var status = bot.getChatMember(msg.chat.id, msg.from.id);
  status.then((result) => {
    if (msg.from.id != process.env.OWNER &&
      result.status !== 'creator' &&
      result.status !== 'administrator') {
      bot.sendMessage(msg.chat.id, 'Make me.', {
        reply_to_message_id: msg.message_id
      });
    } else {
      var text = msg.text.trim();
      var tagStartIndex = text.indexOf(' '); // Will be > -1 because the regex in onText guarantees that
      var tag;
      var message;
      var tagEndIndex = text.indexOf(' ', tagStartIndex + 1);
      if (tagEndIndex <= -1) {
        return;
      }
      tag = text.slice(tagStartIndex + 1, tagEndIndex);
      text = text + ' ';
      message = text.slice(tagEndIndex + 1);
      var query = "INSERT INTO tags (id, tag, message) VALUES ('" + msg.chat.id +
          "','" + tag.toLowerCase() +
          "','" + message + "')" +
          "ON CONFLICT ON CONSTRAINT uk DO UPDATE SET id='" +
          msg.chat.id + "', tag='" +
          tag.toLowerCase() + "', message='" +
          message + "'";

      pool.query(query, (err, result) => {
        if (!err) {
          bot.sendMessage(msg.chat.id, tag + ' has been saved.');
        }
      });
    }
  }, (err) => {
    bot.sendMessage(msg.chat.id, 'Could not save.');
    console.log('save broke: ' + err);
  });
});

bot.onText(/^\/delTag (.+)/i, msg => {
  if (!process.env.DATABASE_URL) {
    return;
  }
  bot.getChatMember(msg.chat.id, msg.from.id)
    .then((result) => {
      if (msg.from.id != process.env.OWNER &&
        result.status !== 'creator' &&
        result.status !== 'administrator') {
        bot.sendMessage(msg.chat.id, 'Make me.', {
          reply_to_message_id: msg.message_id
        });
      } else {
        var text = msg.text.trim();
        var tagStartIndex = text.indexOf(' ');
        if (tagStartIndex <= -1) {
          return;
        }
        var tag = text.slice(tagStartIndex + 1);
        var query = "DELETE FROM tags WHERE  id = '" +
          msg.chat.id +
          "' AND tag = '" +
          tag.toLowerCase() +
          "'";
        pool.query(query, (err, result) => {
          if (!err) {
            bot.sendMessage(msg.chat.id, tag + ' has been deleted.',
              {
                reply_to_message_id: msg.message_id
              });
          } else {
            console.log('deltag: ' + err);
          }
        });
      }
    }, (err) => {
      bot.sendMessage(msg.chat.id, 'Could not delete.');
      console.log('delTag broke: ' + err);
    });
});

function replyToTag (msg) {
  if (!process.env.DATABASE_URL) {
    return;
  }
  if (!msg.text) {
    return;
  }
  var tags = msg.text.split(' ');
  if (!tags || tags[0].indexOf('/') !== -1) {
    return;
  }
  var query = "SELECT message FROM tags WHERE id='" +
                msg.chat.id + "' AND (";
  for (var i = 0; i < tags.length - 1; i++) {
    if (tags[i]) {
      query = query + "tag='" + tags[i].toLowerCase() + "' OR ";
    }
  }
  if (tags[i]) {
    query = query + "tag='" + tags[i].toLowerCase() + "')";
  }

  pool.query(query, (err, result) => {
    if (err) {
      console.log(err);
      return;
    }
    if (result && result.rows) {
      var replyId;
      if (msg.reply_to_message && msg.reply_to_message.from.id != process.env.BOT_ID) {
        replyId = msg.reply_to_message.message_id;
      } else {
        replyId = msg.message_id;
      }

      var message = '';
      result.rows.forEach(row => {
        if (row.message) {
          message = message + row.message + '\n';
        }
      });

      if (message) {
        bot.sendMessage(msg.chat.id, message,
          {
            reply_to_message_id: replyId
          });
      }
    }
  });
}

bot.onText(/^\/allTags$/i, msg => {
  if (!process.env.DATABASE_URL) {
    return;
  }
  var query = "SELECT tag FROM tags WHERE id='" + msg.chat.id + "'";
  pool.query(query, (err, result) => {
    if (err) {
      return;
    }
    if (result && result.rows && result.rows[0]) {
      var items = 'Send a tag to see the associated message\nTags for this group:\n';
      result.rows.forEach(item => {
        items = items + item.tag + '\n';
      });
      bot.sendMessage(msg.chat.id, items)
        .then((m) => {
          tools.deleteMsg(bot, m, 15000);
        });
    } else {
      bot.sendMessage(msg.chat.id, 'No tags for this chat.');
    }
  });
});

bot.onText(/^\/google (.+)/, function (msg) {
  var message = msg.text.slice(msg.text.indexOf(' ') + 1);

  search.search(message, (err, res) => {
    if (err) {
      console.error(err);
      bot.sendMessage(msg.chat.id, 'An error occurred.');
    } else {
      if (res) {
        var title = res[0].title;
        var link = res[0].link;
        bot.sendMessage(msg.chat.id, `${title}\n\n${link}`);
      } else {
        bot.sendMessage(msg.chat.id, 'No results');
      }
    }
  });
});

function performInlineGoogle (message, id) {
  message = message.replace(/g /, '');
  search.search(message, function (err, res) {
    if (err) {
      console.error(err);
      sendErrorReplyInline('An error occurred.', id);
      return;
    }
    if (!res) {
      sendErrorReplyInline('No results.', id);
      return;
    }

    var results = [];
    for (var i = 0; i < res.length; i++) {
      var item = res[i];
      var spliturl = item['link'].split('/');
      var thumbUrl = `${spliturl[0]}//${spliturl[2]}/favicon.ico`;
      var resId = crypto.createHash('sha256').update(item['link']).digest('hex').substr(0, 16);
      var result = {
        'type': 'article',
        'id': resId + '',
        'title': item['title'],
        'input_message_content':
        {
          'message_text': `<code>Google: Result for</code>   <b>${message}:</b>\n\n${item['link']}`,
          'parse_mode': 'HTML'
        },
        'thumb_url': thumbUrl,
        'description': item['snippet']
      };
      results.push(result);
    }
    bot.answerInlineQuery(id, results, {cache_time: 1});
  });
}

function performInlineTranslate (message, id) {
  message = message.replace(/t /, '');
  translate(message, { to: 'en' })
    .then(res => {
      var result = {
        'type': 'article',
        'id': '1',
        'title': 'Translated to English',
        'input_message_content':
        {
          'message_text': '<b>' + message + '</b>' + '<code> translated to English:</code>\n' + res.text,
          'parse_mode': 'HTML'
        },
        'description': res.text
      };
      var results = [];
      results.push(result);
      bot.answerInlineQuery(id, results);
    })
    .catch(err => {
      sendErrorReplyInline('An error occurred. Our code monkeys are NOT trying to fix your problem.', id);
      console.error(err);
    });
}

bot.on('inline_query', function (msg) {
  var message = msg.query;

  if (message) {
    if (/g (.+)/.test(message)) {
      performInlineGoogle(message, msg.id);
    } else if (/t (.+)/.test(message)) {
      performInlineTranslate(message, msg.id);
    } else {
      sendErrorReplyInline('Invalid command! Check the list of available commands.', msg.id);
    }
  } else {
    sendHelpInline(msg.id);
  }
});

bot.onText(/!addgroup/, (msg) => {
  if (!process.env.DATABASE_URL) {
    return;
  }
  if (msg.from) {
    if (msg.from.id == process.env.OWNER) {
      var query = 'INSERT INTO authorized_chats VALUES (' + msg.chat.id + ')';
      pool.query(query, (err, result) => {
        if (err) {
          bot.sendMessage(msg.chat.id, replies.failed_to_add_group);
        }
      });
    }
  }
});

bot.onText(/^\/info/i, (msg) => {
  if (process.env.DATABASE_URL) {
    tagAlert.onInfo(bot, msg);
  }
});

bot.onText(/^\/start/i, (msg) => {
  if (process.env.DATABASE_URL) {
    tagAlert.onStart(bot, msg);
  }
});

bot.on('callback_query', (call) => {
  if (process.env.DATABASE_URL) {
    tagAlert.onCallback(bot, call);
  }
});

bot.on('message', (msg) => {
  if (process.env.DATABASE_URL) {
    if (msg.new_chat_member) {
    // Checking if the bot got added to a chat
      leaveCheck(msg);
    }
    replyToTag(msg);
    tagAlert.onMessage(bot, msg);
  }
});

bot.deleteMessage = function (messageId, chatId, form = {}) {
  form.chat_id = chatId;
  form.message_id = messageId;
  return this._request('deleteMessage', { form });
};

async function leaveCheck (msg) {
  if (msg.new_chat_member.id == process.env.BOT_ID) {
    await tools.sleep(20000); // Waiting for owner to send the add group command
    var query = "SELECT chat_id FROM authorized_chats WHERE chat_id='" + msg.chat.id + "'";
    pool.query(query, (err, result) => {
      if (err || !result || !result.rows || !result.rows[0]) {
        bot.sendMessage(msg.chat.id, replies.leaving_chat)
          .catch(() => {});
        bot.leaveChat(msg.chat.id);
        sendGroupLeftToOwner(msg);
      }
    });
  }
}

function sendGroupLeftToOwner (msg) {
  var leftGroupName;
  if (msg.chat.title) {
    leftGroupName = msg.chat.title;
  } else {
    leftGroupName = msg.chat.id;
  }
  bot.sendMessage(process.env.OWNER, 'Just left ' + leftGroupName);
}

function sendErrorReplyInline (message, id) {
  var results = [];
  var result = {
    'type': 'article',
    'id': 'oops',
    'title': 'Invalid query',
    'input_message_content':
      {
        'message_text': 'Invalid query.'
      },
    'hide_url': true,
    'description': message
  };
  results.push(result);
  bot.answerInlineQuery(id, results);
}

function sendHelpInline (id) {
  var results = [];
  var result = {
    'type': 'article',
    'id': 'Googlen',
    'title': 'Google',
    'input_message_content':
      {
        'message_text': 'Type @BigBug_bot g (query) to search with Google'
      },
    'thumb_url': 'https://google.com/favicon.ico',
    'hide_url': true,
    'description': 'Search for anything with Google Search\nTap "g" (without quotes) now to use.'
  };
  results.push(result);

  result = {
    'type': 'article',
    'id': 'Translaten',
    'title': 'Translate to english',
    'input_message_content':
      {
        'message_text': 'Type @BigBug_bot t (text) to translate to english'
      },
    'hide_url': true,
    'description': 'Translate anything with Google Translate\nTap "t" (without quotes) now to use.'
  };
  results.push(result);
  bot.answerInlineQuery(id, results);
}

module.exports = bot;
