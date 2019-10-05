module.exports = {
    add_to_group: 'Add the bot to a group!',
    start_group: 'Send a private message for more info to enable alerts.',
    start_private:
        'You will receive tag notifications, if @smallBug_bot is in your groups.\n\n' +
        'Source code and info for @TagAlertBot: http://tagalert.pitasi.space/\n\n' +
        ' - This bot contains code copied from @TagAlertBot for the tag alert funtionality. ' +
        'The rest of the features were added hurridly by @out386.\n' +
        'See the README in the source for other features, at https://github.com/out386/Buginator/\n' +
        'Written hastily on top of https://github.com/volodymyrlut/heroku-node-telegram-bot and https://github.com/yagop/node-telegram-bot-api',
    main_text:
        '<b>[ Incoming Message ]</b>\n\n' +
        '<b>[ FROM ]</b>\n' +
        '\uD83D\uDC64' +
        '  %s\n<b>[ GROUP ]</b>\n' +
        '\uD83D\uDC65' +
        '  %s\n<b>[ TEXT ]</b> \n' +
        '\u2709\ufe0f  %s',
    main_caption:
        '[ Incoming Message ]\n\n' +
        '[ FROM ]\n' +
        '\uD83D\uDC64' +
        '  %s\n[ GROUP ]\n' +
        '\uD83D\uDC65' +
        '  %s\n[ TEXT ] \n' +
        '\u2709\ufe0f  %s',
    options: 'From group: <b>%s</b>\nAvailable operations:',
    retrieve: 'Find the message',
    retrieve_group: 'Here is your message, %s.',
    retrieve_success: 'Done!\nNow check the group of the message.',
    no_username: "Sorry.\nYou need to set an username from Telegram's settings before using me.",
    error: 'Sorry.\nSomething went wrong.',
    flooding: 'Too many requests! Try again in a few minutes.',
    kick1: 'git rebase -i (some SHA)\n(Drop all commits with "',
    kick2: '" in them, save)\necho "',
    kick3: ' was never here" >> .log\ngit add .log' + '\ngit commit -m "',
    kick4: '"\ngit push --force origin master',
    no_kick_permissions: 'No. You should leave instead.',
    owner_wrong_kick: 'Uhh...',
    id_text1: 'The ID of this ',
    id_text2: ' is `',
    private_id_text: 'Your ID is `',
    leaving_chat: '@out386 did not add this group to the DB. Goodbye.',
    failed_to_add_group: 'Could not add this group to whitelist.',
    bot_ready_reply: 'Yes?',
}
