var token = process.env.TOKEN;

var Bot = require('node-telegram-bot-api');
var bot;

var google = require('google')

google.resultsPerPage = 10

if(process.env.NODE_ENV === 'production') {
  bot = new Bot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
}
else {
  bot = new Bot(token, { polling: true });
}

console.log('Bot server started in the ' + process.env.NODE_ENV + ' mode');

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
  if (message) {
    console.log(message);
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
console.log(baseurl);
          var result = {"type": "article",
                        "id" : i+'',
                        "title" : title,
                        "input_message_content" : {"message_text" : url},
                        "thumb_url" : baseurl,
                        "hide_url" : true,
                        "description" : link.description};
         results.push(result);
        }
      }
      bot.answerInlineQuery(msg.id, results);
      // bot.sendMessage(msg.from.id, title + "\n\n" + url);
    })
  }
});

module.exports = bot;
