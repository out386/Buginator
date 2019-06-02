const request = require('request');
const CX = process.env.GOOGLE_CX;
const KEY = process.env.GOOGLE_KEY;

const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${KEY}&cx=${CX}&num=10&q={}`;

function search (query, callback) {
  request.get(searchUrl + query, { json: true }, (err, resp, body) => {
    if (err) {
      console.print(err);
      callback(err);
      return;
    }

    if (body.items) {
      var results = [];
      body.items.forEach(item => {
        results.push({
          title: item['title'],
          snippet: item['snippet'],
          link: item['link']
        });
      });

      callback(null, results);
    } else {
      callback();
    }
  });
}

module.exports.search = search;
