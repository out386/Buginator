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
      if(item.chat_id === chatRows[i].chat_id)
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
        lastPromise.then(res => {
          if (res.priceChanged)
            isUpdateNeeded = true;
          func.updatePrice(res.url, res.newPrice);
          const time = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" });
          result += `${res.msg}\n\n<i>Updated: ${time}</i>`;

          if (isUpdateNeeded)
            func.sendNewMsg(chatId, result);
          else
            func.editMessage(chatId, msgId, result);
        });
      }
    });
  }

  fetchSinglePrice(url, lastPrice) {
    lastPrice = parseFloat(lastPrice);
    return new Promise((resolve, reject) => {
      axios.get(url)
        .then(result => {
          const $ = cheerio.load(result.data);
          var price = $('#container > * > .t-0M7P > ._3e7xtJ > ._1HmYoV > .col-8-12 > .col-12-12 > ._29OxBi > ._3iZgFn > ._2i1QSc > ._1uv9Cb > ._1vC4OE').text();
          var title = $('#container > * > .t-0M7P > ._3e7xtJ > ._1HmYoV > .col-8-12 > .col-12-12 > ._29OxBi > * > ._9E25nV > ._35KyD6').text();
          title = title.substring(0, 100) + '...';
          if (!price || price === '' || price === ' ') {
            // Should probably reject at this point
            price = '-1';
          }
          // The first char is a currency symbol
          var priceInt = parseFloat(price.substring(1))
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
        console.log(`Error while updating price of ${url}: ${err.message}`);
      }
    });
  }

  updateMessage(chatId, newMsgId) {
    var query = `UPDATE prices SET msg_id=${newMsgId} WHERE chat_id='${chatId}'`;
    this.pool.query(query, function (err) {
      if (err) {
        console.log(`Error while updating message IDs for ${chatId}: ${err.message}`);
      }
    });
  }

}

module.exports.Prices = Prices;