module.exports = {
    'add_to_group':       'Add the bot to a group!',
    'start_group':        'Send a private message for more info to enable alerts.',
    'start_private':      'Hello.\n' +
                          '<b>You are now enabled</b> to receive notifications, ' +
                          'Just add @BigBug_Bot in your groups.\n' +
                          'When you\'ll get tagged you\'ll get a message.\n\n' +
                          'Source code and info for @TagAlertBot: http://tagalert.pitasi.space/\n\n' +
                          ' - @TagAlertBot is a bot by @Zaphodias. This bot contains code copied from it for the tag alert funtionality.\n' +
                          'The rest of the features were added hurridly by @out386, after an unhealthy amount of Googling, because he still <b>DOESN\'T GET JS!</b>\n.'+
                          'Send /help for other features. The unreadably dirty source is at https://github.com/out386/Buginator/\n' +
                          'Written hastily on top of https://github.com/volodymyrlut/heroku-node-telegram-bot and https://github.com/yagop/node-telegram-bot-api',
    'main_text':          '<b>[ Incoming Message ]</b>\n\n' +
                          '<b>[ FROM ]</b>\n' +
                          '\uD83D\uDC64' +
                          '  %s\n<b>[ GROUP ]</b>\n' +
                          '\uD83D\uDC65' +
                          '  %s\n<b>[ TEXT ]</b> \n' +
                          '\u2709\ufe0f  %s',
    'main_caption':       '[ Incoming Message ]\n\n' +
                          '[ FROM ]\n' +
                          '\uD83D\uDC64' +
                          '  %s\n[ GROUP ]\n' +
                          '\uD83D\uDC65' +
                          '  %s\n[ TEXT ] \n' +
                          '\u2709\ufe0f  %s',
    'options':            'From group: <b>%s</b>\nAvailable operations:',
    'retrieve':           'Find the message',
    'retrieve_group':     'Here is your message, %s.',
    'retrieve_success':   'Done!\nNow check the group of the message.',
    'no_username':        'Sorry.\nYou need to set an username from Telegram\'s settings before using me.',
    'error':              'Sorry.\nSomething went wrong.',
    'flooding':           'Too many requests! Try again in a few minutes.',
    //'kick':               'Please remove yourself from this group, because I\'m too polite to do it myself.',
    'kick1':              'git rebase -i (some SHA)'
                          + '\n(Drop all commits with "',
    'kick2':              '" in them, save)'
                          + '\necho "',
    'kick3':              ' was never here" >> .log'
                          + '\ngit commit -m "',
    'kick4':              '"\ngit push --force origin master',
    'no_kick_permissions':'No. You should leave instead.',
    'owner_wrong_kick':   'Uhh...',
}
