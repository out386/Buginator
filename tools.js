async function deleteMsg (bot, msg, time) {
  await sleep(time);
  bot.deleteMessage(msg.message_id, msg.chat.id)
    .catch(err => {
      console.log(err);
    });
}
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.deleteMsg = deleteMsg;
module.exports.sleep = sleep;
