var helpers	    = require('../helpers'),
    mongoose =  require('mongoose'),
    Rfid =  mongoose.model('Rfid'),
    app;


var init = function() {

    helpers.initCrudTemplate(
        app,
        Rfid,
        'rfid',
        'rfid',
        'rfid'
    );

    app.controllers.socket.addSocketListener(socketListener);
    app.controllers.arduino.addListener(arduinoListener);

};

var socketListener = function(socket) {

    // remove unknown tag from list when it is saved

    socket.on('rfid.create', function(rfid) {
        var pos = app.state.rfidUnknown.indexOf(rfid.tag);

        if(pos > -1) {
            app.state.rfidUnknown.splice(pos, 1);
            app.controllers.socket.refreshState(
                false,
                ['rfidUnknown']
            );
        }
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
        Rfid.findByIdAndUpdate(i, { lastUsed: new Date() }).exec();
        app.controllers.socket.refreshState(false, ['rfid.' + knownTag]);
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
 * @returns Seconds since a specified tag was used, false if the ID is unknown
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

    app.events.once('ready', function() {
        init();
    });

    return {
        getSecondsSinceLastUse: getSecondsSinceLastUse
    };

};
