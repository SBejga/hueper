var helpers	    = require('../helpers'),
    mongoose    = require('mongoose'),
    Rfid        = mongoose.model('Rfid'),

    model,
    app;


var init = function() {

    model = helpers.initCrudTemplate(
        app,
        Rfid,
        'rfid',
        'rfid'
    );

    // remove unknown tag from list when it is saved

    model.on('create', function(rfid) {
        var pos = app.state.rfidUnknown.indexOf(rfid.tag);

        if(pos > -1) {
            app.state.rfidUnknown.splice(pos, 1);
            app.controllers.socket.refreshState(
                false,
                ['rfidUnknown']
            );
        }
    });

    // remove automation triggers and conditions when corresponding rfid tag is removed

    model.on('delete', function(id, rfid) {

        if(!rfid) {
            return;
        }

        app.controllers.automation.removeSubEntries(
            function(trigger) {
                return (trigger.type === 'rfid' && trigger.value === rfid.tag);
            },
            function(condition) {
                return (condition.type === 'rfid' && condition.value.id === rfid.tag);
            }
        );

    });

    app.controllers.socket.addSocketListener(socketListener);

    app.controllers.arduino.addListener(arduinoListener);

};

var socketListener = function(socket) {

    // reset list of unknown tags

    socket.on('rfid.reset', function() {
        console.log('[rfid] Resetting unknown tag list');

        app.state.rfidUnknown = [];

        app.controllers.socket.refreshStateOfOthers(
            socket,
            ['rfidUnknown']
        );
    });

};

var arduinoListener = function(message) {
    var i,
        knownTag = false;

    if(typeof(message.nfc) === 'undefined') {
        return;
    }

    app.controllers.automation.fireEvent('rfid', message.nfc);

    // check if RFID tag is already known

    for(i in app.state.rfid) {
        if(app.state.rfid.hasOwnProperty(i)) {
            if(app.state.rfid[i].tag === message.nfc) {
                knownTag = i;
                break;
            }
        }
    }

    // update last used date
    if(knownTag !== false) {
        console.log('[rfid] Update last use date for tag ' + message.nfc + ' / ' + knownTag);

        app.state.rfid[knownTag].lastUsed = new Date();
        Rfid.findByIdAndUpdate(knownTag, { lastUsed: new Date() }).exec();
        app.controllers.socket.refreshState(false, ['rfid.' + knownTag + '.lastUsed']);
    }
    // add to unknown tag list
    else if(app.state.rfidUnknown.indexOf(message.nfc) === -1) {
        console.log('[rfid] Add new tag ' + message.nfc + ' to unknown list');

        app.state.rfidUnknown.push(message.nfc);
        app.controllers.socket.refreshState(false, ['rfidUnknown']);
    }

};


/**
 * @param tagId or any tag if left out falsy
 * @returns Seconds since a specified tag was used, false if the ID is unknown or has not been used
 */
var getSecondsSinceLastUse = function(tagId) {
    var i, lastUsed = false;

    for(i in app.state.rfid) {
        if(app.state.rfid.hasOwnProperty(i)) {

            // single tag
            if(tagId) {
                if(app.state.rfid[i].tag === tagId) {
                    if(app.state.rfid[i].lastUsed) {
                        return (new Date().getTime() - app.state.rfid[i].lastUsed.getTime()) / 1000;
                    }
                    else {
                        return false;
                    }
                }
            }
            // any tag
            else {
                if(!lastUsed || (app.state.rfid[i].lastUsed && app.state.rfid[i].lastUsed.getTime() > lastUsed)) {
                    lastUsed = app.state.rfid[i].lastUsed.getTime();
                }
            }

        }
    }

        // tag not found or no tags used
    if(tagId || !lastUsed) {
        return false;
    }

    // compute seconds
    return (new Date().getTime() - lastUsed) / 1000;
};




module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });

    return {
        getSecondsSinceLastUse: getSecondsSinceLastUse
    };

};
