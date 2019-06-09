const request = require('request');
const CX = process.env.GOOGLE_CX;
const KEY = process.env.GOOGLE_KEY;

const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${KEY}&cx=${CX}&num=10&fields=items(link%2Csnippet%2Ctitle%2Cpagemap%2Fcse_thumbnail%2Fsrc)&q=`;

function search (query, callback) {
  request.get(searchUrl + query, { json: true }, (err, resp, body) => {
    if (err) {
      console.print(err);
      callback(err);
      return;
    }

    if (body.items) {
      body.items.forEach(item => {
        var thumb;
        if (item['pagemap'] && item['pagemap']['cse_thumbnail'] && item['pagemap']['cse_thumbnail'][0]['src']) {
          thumb = item['pagemap']['cse_thumbnail'][0]['src'];
        } else {
          var spliturl = item['link'].split('/');
          thumb = `${spliturl[0]}//${spliturl[2]}/favicon.ico`;
        }
        item['thumbnail'] = thumb;
      });

      callback(null, body.items);
    } else {
      callback();
    }
  });
}

module.exports.search = search;
