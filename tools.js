deleteMsg = async (bot, msg, time) => {
    await sleep(time)
    bot.deleteMessage(msg.message_id, msg.chat.id).catch(ignored => {})
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = {
    deleteMsg,
    sleep,
}
