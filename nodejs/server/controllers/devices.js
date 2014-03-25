var address = require('network-address'),
    range   = require('ipv4-range'),
    ping    = require('ping'),
    child   = require('child_process'),
    fs      = require('fs'),

    mongoose = require('mongoose'),
    Device  = mongoose.model('Device'),
    helpers = require('../helpers'),

    model,
    app,

    lastIp = false,
    pingStatus = {},
    arpTable = {};


var init = function() {

    model = helpers.initCrudTemplate(
        app,
        Device,
        'devices',
        'device'
    );

    // remove automation triggers and conditions when corresponding device is removed

    model.on('delete', function(id, device) {

        if(!device) {
            return;
        }

        app.controllers.automation.removeSubEntries(
            function(trigger) {
                return (trigger.type === 'device' && trigger.value.address === device.address);
            },
            function(condition) {
                return (condition.type === 'device' && condition.value.address === device.address);
            }
        );

    });



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

    if(!ip || ip.indexOf('127.0') === 0) {
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

    // use ping on windows
    if(process.platform.indexOf('win') === 0) {
        range(ip, 254).forEach(function(host) {
            ping.sys.probe(host, function(isAlive) {
                pingResult(host, isAlive);
            });
        });
    }
    // use nmap on linux (far better performance on raspberry pi)
    else {
        var stdout = '',
            ipRange = ip.replace(/\.\d{1,3}$/, '') + '.0/24',
            nmap = child.spawn('nmap', ['-sP', '-n', '-v', ipRange]);

        nmap.stdout.on('data', function(data) {
            stdout += data;
        });

        nmap.on('error', function() {
            console.log('[devices] Nmap error!');
        });

        nmap.on('close', function(code) {
            if(code !== 0) {
                console.log('[devices] Nmap closed with code ' + code);
            }

            var lines = stdout.split('\n'),
                i = lines.length,
                host;

            while(i--) {
                if(lines[i].indexOf('Nmap scan report for') === -1) {
                    continue;
                }

                host = lines[i].match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);

                if(host) {
                    pingResult(
                        host[0],
                        (lines[i].indexOf('[host down]') === -1)
                    );
                }
            }
        });

    }
};

var pingResult = function(host, isAlive) {
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
};

/**
 * periodically refresh the mapping from IP to MAC addresses
 */
var refreshArpTable = function() {
    console.log('[devices] Refreshing ARP table');

    readArpTable(function(err, entry) {
        if(err || entry === null || entry.mac === '00:00:00:00:00:00') {
            return;
        }
        arpTable[entry.ip] = entry.mac;
    });
};

/**
 * Reads the ARP table and executes callback for each entry
 * Modified version, original from https://github.com/mrose17/node-arp-a
 * @param cb
 */
var readArpTable = function(cb) {

    if(process.platform.indexOf('linux') === 0) {
        /* as noted in node-arp

         parse this format

         IP address HW type Flags HW address Mask Device
         192.168.1.1 0x1 0x2 50:67:f0:8c:7a:3f * em1

         */

        fs.readFile('/proc/net/arp', function(err, data) {
            var cols, i, lines;

            if (err) return cb(err, null);

            lines = data.toString().split('\n');
            for (i = 0; i < lines.length; i++) {
                if (i === 0) continue;

                cols = lines[i].replace(/ [ ]*/g, ' ').split(' ');
                if ((cols.length > 3) && (cols[0].length !== 0) && (cols[3].length !== 0)) {
                    cb(null, { ip: cols[0], mac: cols[3] });
                }
            }

            cb(null, null);
        });

    }

    if(process.platform.indexOf('win') === 0) {
        /*
         [blankline]
         Interface: 192.168.1.54 --- 0x12
           Internet Address Physical Address Type
           192.168.1.1 50-67-f0-8c-7a-3f dynamic
         */

        var arp, cols, i, lines, stderr, stdout;

        stdout = '';
        stderr = '';
        arp = child.spawn('arp', [ '-a' ]);
        arp.stdin.end();
        arp.stdout.on('data', function(data) { stdout += data.toString() ; });
        arp.stderr.on('data', function(data) { stderr += data.toString() ; });

        arp.on('close', function(code) {
            if (code !== 0) return cb(new Error('exit code ' + code + ', reason: ' + stderr), null);

            lines = stdout.split('\r\n');
            for (i = 0; i < lines.length; i++) {
                if (i < 3) continue;

                cols = lines[i].trim().replace(/ [ ]*/g, ' ').split(' ');

                if ((cols.length === 3) && /^[\d\.]+$/.test(cols[0])) {
                    cb(null, { ip: cols[0], mac: cols[1].replace(/-/g, ':') });
                }
            }

            cb(null, null);
        });
    }

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

    app.events.on('ready', function() {
        init();
    });

    return {
        getStatus: getStatus,
        isOneActive: isOneActive,
        getMacAddress: getMacAddress,
        getMinutesSinceLastActivity: getMinutesSinceLastActivity
    };

};
