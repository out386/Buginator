const axios = require('axios');
const cheerio = require('cheerio');

class Prices {
  constructor(bot, pool) {
    this.bot = bot;
    this.pool = pool;
  }

  updatePrices() {
    if (!process.env.DATABASE_URL) {
      return;
    }
    const func = this;
    var chatQuery = 'SELECT chat_id, msg_id FROM prices';
    func.pool.query(chatQuery, function (err, chats) {
      if (err) {
        console.log(`Prices: Error getting chats: ${err.message}`);
        return;
      }
      var chatRows = chats.rows;
      if (chatRows && chatRows.length) {
        chatRows = chatRows.filter((v, i, a) => func.chatIndexOf(a, v) === i);
        for (var chat of chatRows) {
          // All items for a particular chat have the same msg_id
          func.fetchChatPrices(chat.chat_id, chat.msg_id);
        }
      }
    });
  }

  chatIndexOf(chatRows, item) {
    for (var i = 0; i < chatRows.length; i++)
      if (item.chat_id === chatRows[i].chat_id)
        return i;
  }

  fetchChatPrices(chatId, msgId) {
    var func = this;
    var itemQuery = `SELECT * FROM prices WHERE chat_id='${chatId}'`;
    func.pool.query(itemQuery, function (err, items) {
      if (err) {
        console.log(`Prices: Error getting items for chat ${chatId}: ${err.message}`);
        return;
      }

      var itemRows = items.rows;
      if (itemRows && itemRows.length) {
        var isUpdateNeeded;
        var lastPromise;
        var result = '';

        // Fetching prices one item at a time might help avoid rate limiting
        const chain = (promise, item) => promise.then(res => {
          if (res.priceChanged)
            isUpdateNeeded = true;
          result += `${res.msg}\n\n`;
          func.updatePrice(res.url, res.newPrice);
          return func.fetchSinglePrice(item.url, item.price);
        });

        for (var item of itemRows) {
          if (!lastPromise) {
            lastPromise = func.fetchSinglePrice(item.url, item.price);
          } else {
            lastPromise = chain(lastPromise, item);
          }
        }
        lastPromise
        .then(res => {
          if (res.priceChanged)
            isUpdateNeeded = true;
          func.updatePrice(res.url, res.newPrice);
          const time = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" });
          result += `${res.msg}\n\n<i>Updated: ${time}</i>`;

          if (isUpdateNeeded)
            func.sendNewMsg(chatId, result);
          else
            func.editMessage(chatId, msgId, result);
        })
        .catch(err => console.error(err));
      }
    });
  }

  fetchSinglePrice(url, lastPrice) {
    lastPrice = parseFloat(lastPrice);
    return new Promise((resolve, reject) => {
      axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36' } })
        .then(result => {
          const $ = cheerio.load(result.data);
          var priceInt;
          var price;
          var title;

          if (url.indexOf('flipkart.com') > -1) {
            price = $('#container > div > div._2c7YLP.UtUXW0._6t1WkM._3HqJxg > div._1YokD2._2GoDe3 > div._1YokD2._3Mn1Gg.col-8-12 > div:nth-child(2) > div > div.dyC4hf > div.CEmiEU > div > div._30jeq3._16Jk6d').text();
            title = $('#container > div > div._2c7YLP.UtUXW0._6t1WkM._3HqJxg > div._1YokD2._2GoDe3 > div._1YokD2._3Mn1Gg.col-8-12 > div:nth-child(2) > div > div:nth-child(1) > h1 > span').text();
          } else if (url.indexOf('amazon.in') > -1) {
            price = $('#priceblock_ourprice').text();
            if(!price) price = $('#priceblock_dealprice').text()
            title = $('#productTitle').text().trim();
          } else {
              // Yeah, I don't care to find out what happens if I reject here, so let's just resolve with garbage
              resolve({
                url: url,
                priceChanged: false,
                newPrice: -1,
                msg: `<a href="${url}">Invalid URL</a> - ${price}`
              })
              return;
          }
          
          title = (!title || title === '' || title === ' ') ? 'Title' : title.length > 70 ? title.substring(0, 70) + '...' : title;
          price = price.replace(',','');
          /* if (!price || price === '' || price === ' ') {
            var price = $('#container > * > ._3Z5yZS > ._1HmYoV > .col-8-12 > .col-12-12 > ._29OxBi > ._1JKm3V > .qR0IkO > *')[0].children[0].data;
            if (!price || price === '' || price === ' ') {
              // Should probably reject at this point
              price = '-1';
            } else {
              var temp = price.split(' ');
              temp = temp[temp.length - 1];
              priceInt = parseFloat(temp.substring(1));
            }
          } */
          if (!priceInt) {
            // The first char is a currency symbol
            priceInt = parseFloat(price.substring(1));
          }
          if (!priceInt) {
            priceInt = -1;
            price = '-1';
          }
          var priceMsg = `<a href="${url}">${title}</a> - ${price}`;
          var priceChanged;
          if (priceInt !== lastPrice)
            priceChanged = true;
          else
            priceChanged = false;

          resolve({
            url: url,
            priceChanged: priceChanged,
            newPrice: priceInt,
            msg: priceMsg
          });
        })
        .catch(err => reject(err));
    });
  }

  editMessage(chatId, msgId, str) {
    const func = this;
    func.bot.editMessageText(str, {
      chat_id: chatId,
      message_id: msgId,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
      .then(() => { })
      .catch(() => {
        // Should check what caused this error, but meh.
        func.sendNewMsg(chatId, str);
      });
  }

  sendNewMsg(chatId, str) {
    const func = this;
    func.bot.sendMessage(chatId, str,
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
      .then(m => func.updateMessage(chatId, m.message_id))
      .catch(() => { });
  }

  updatePrice(url, newPrice) {
    var query = `UPDATE prices SET price=${newPrice} WHERE url='${url}'`;
    this.pool.query(query, function (err) {
      if (err) {
        console.log(`Prices: Error while updating price of ${url}: ${err.message}`);
      }
    });
  }

  updateMessage(chatId, newMsgId, callback) {
    var query = `UPDATE prices SET msg_id=${newMsgId} WHERE chat_id='${chatId}'`;
    this.pool.query(query, function (err) {
      if (err) {
        console.log(`Prices: Error while updating message IDs for ${chatId}: ${err.message}`);
        if (callback) {
          callback(err);
        }
      } else {
        if (callback) {
          callback();
        }
      }
    });
  }

  addItem(url, chatId) {
    const func = this;
    var insertQuery = `INSERT INTO prices (url, price, msg_id, chat_id) VALUES ('${url}', -1, -1, '${chatId}')`;
    func.pool.query(insertQuery, function (err) {
      if (err) {
        console.log(`Prices: Error while adding ${url} for ${chatId}: ${err.message}`);
        return;
      }
      // Will force a new message
      // TODO: Delete the old message
      func.updateMessage(chatId, -1, err => {
        func.updatePrices();
      });
    });
  }

  removeItem(url, chatId) {
    // TODO: stop the timer when there aren't any items being watched
    const func = this;
    var deleteQuery = `DELETE FROM prices WHERE chat_id='${chatId}' AND url='${url}'`
    func.pool.query(deleteQuery, function (err) {
      if (err) {
        console.log(`Prices: Error while deleting ${url} for ${chatId}: ${err.message}`);
        return;
      }
      // Will force a new message
      // TODO: Delete the old message
      func.updateMessage(chatId, -1, err => {
        func.updatePrices();
      });
    });
  }

}

module.exports.Prices = Prices;
