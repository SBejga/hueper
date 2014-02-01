var address = require('network-address'),
    range   = require('ipv4-range'),
    ping    = require('ping'),
    arp     = require('arp-a'),

    mongoose = require('mongoose'),
    Device  = mongoose.model('Device'),
    helpers = require('../helpers'),

    app,

    lastIp = false,
    pingStatus = {},
    arpTable = {};


var init = function() {

    helpers.initCrudTemplate(
        app,
        Device,
        'devices',
        'device',
        'device'
    );

    // first range ping is used to fill the ARP table
    refreshPing();
    setInterval(refreshPing, 20000);

    setTimeout(function() {
        refreshArpTable();
        setInterval(refreshArpTable, 20000);
    }, 10000);

};

/**
 * Periodically ping the whole class C network to find active devices
 */
var refreshPing = function() {
    var ip = address();

    if(ip.indexOf('127.0') === 0) {
        console.log('[devices] No local IPv4 found, aborting!');
        return;
    }

    if(ip !== lastIp) {
        if(lastIp !== false) {
            console.log('[devices] Local IP changed, resetting device status table');
        }
        pingStatus = {};
        lastIp = ip;
    }

    console.log('[devices] Starting network range ping');

    range(ip, 254).forEach(function(host) {
        ping.sys.probe(host, function(isAlive) {
            var address = arpTable[host];

            if(address === undefined) {
                return;
            }

            var deviceId = isDeviceKnown(address);

            if(!deviceId) {
                return;
            }

            var oldStatus = !!pingStatus[address];
            pingStatus[address] = isAlive;

            // device status changed
            if(oldStatus !== isAlive) {
                console.log('[devices] Status for ' + address + ' (' + host + ') changed to ' + isAlive);

                app.controllers.automation.fireEvent(
                    'device',
                    {
                        action: (isAlive ? 'login' : 'logout'),
                        address: address
                    }
                );
            }

            // update lastActivity date every minute
            if(isAlive && (!app.state.devices[deviceId].lastActivity || new Date() - app.state.devices[deviceId].lastActivity > 60000)) {
                app.state.devices[deviceId].lastActivity = new Date();
                Device.findByIdAndUpdate(deviceId, { lastActivity: new Date() }).exec();
                app.controllers.socket.refreshState(false, ['devices.' + deviceId + '.lastActivity']);
            }
        });
    });
};

/**
 * periodically refresh the mapping from IP to MAC addresses
 */
var refreshArpTable = function() {
    console.log('[devices] Refreshing ARP table');

    arp.table(function(err, entry) {
        if(err || entry === null || entry.mac === '00:00:00:00:00:00') {
            return;
        }

        arpTable[entry.ip] = entry.mac;
    });
};

/**
 * @param address
 * @returns ID of the device if it is known, false otherwise
 */
var isDeviceKnown = function(address) {
    var i;

    for(i in app.state.devices) {
        if(app.state.devices.hasOwnProperty(i)) {
            if(app.state.devices[i].address === address) {
                return i;
            }
        }
    }

    return false;
};


/**
 * @param address
 * @returns {boolean} current active state of the device
 */
var getStatus = function(address) {
    return pingStatus[address];
};

/**
 * @returns {boolean} at least one known device is currently active
 */
var isOneActive = function() {
    var i;

    for(i in pingStatus) {
        if(pingStatus.hasOwnProperty(i)) {
            if(pingStatus[i]) {
                return true;
            }
        }
    }

    return false;
};


/**
 * finds the corresponding MAC address to a given IP address
 * @param ip
 * @returns {string} MAC address
 */
var getMacAddress = function(ip) {
    return arpTable[ip];
};

/**
 * @param address or any device if left out falsy
 * @returns minutes since a specified device was used, false if the ID is unknown or has not been used
 */
var getMinutesSinceLastActivity = function(address) {
    var i, lastActivity = false;

    for(i in app.state.devices) {
        if(app.state.devices.hasOwnProperty(i)) {

            // single device
            if(address) {
                if(app.state.devices[i].address === address) {
                    if(app.state.devices[i].lastActivity) {
                        return (new Date().getTime() - app.state.devices[i].lastActivity.getTime()) / 60000;
                    }
                    else {
                        return false;
                    }
                }
            }
            // any device
            else {
                if(!lastActivity || (app.state.devices[i].lastActivity && app.state.devices[i].lastActivity.getTime() > lastActivity)) {
                    lastActivity = app.state.devices[i].lastActivity.getTime();
                }
            }

        }
    }

    // device not found or no devices used
    if(address || !lastActivity) {
        return false;
    }

    // compute seconds
    return (new Date().getTime() - lastActivity) / 60000;
};



module.exports = function(globalApp) {

    app = globalApp;

    app.events.once('ready', function() {
        init();
    });

    return {
        getStatus: getStatus,
        isOneActive: isOneActive,
        getMacAddress: getMacAddress,
        getMinutesSinceLastActivity: getMinutesSinceLastActivity
    };

};
