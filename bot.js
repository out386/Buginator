var token = process.env.TOKEN;

var Bot = require('node-telegram-bot-api');
var bot;
var google = require('google')
const translate = require('google-translate-api');
const pool = require('./db');

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
  if (id == "161484381") {
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
  var req = msg.text.slice(msg.text.indexOf(" "));
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
        var status = bot.getChatMember(msg.chat.id, msg.from.id).status;
        var req_user_id = result.rows[0].user_id;
        if (req_user_id == msg.from.id || status == "creator" || status == "administrator") {
          var delete_query = "DELETE FROM requests WHERE id = " + id + "AND chat_id = " + msg.chat.id;
          pool.query(delete_query, function(err, result) {
          });
        }
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
