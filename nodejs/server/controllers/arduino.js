var serialport = require("serialport"),

    app,

    listeners = [],
    connection,
    connectionTimeout,
    initialConnectionTryInterval = 10000,
    connectionTryInterval = initialConnectionTryInterval,
    connectionTryAdd = 10000,
    maxConnectionTryIntrerval = 60000,
    lastMessageTime;


var init = function() {
    findArduino();

    // periodically check if Arduino is still there
    setInterval(checkHeartBeat, 30000);
};


/**
 * Search all available serial ports for the Arduino
 */
var findArduino = function() {
    console.log('[arduino] Searching serial ports for Arduino');

    serialport.list(function (err, ports) {
        var foundArduino = false,
            i;

        for(i = 0; i < ports.length; i++) {
            if((ports[i].pnpId && ports[i].pnpId.indexOf('Arduino') !== -1) || (ports[i].manufacturer && ports[i].manufacturer.indexOf('Arduino') !== -1)) {
                foundArduino = true;
                connectToArduino(ports[i].comName);
                break;
            }
        }

        if(!foundArduino) {
            console.log('[arduino] Arduino not found');
            retryConnection();
        }

    });
};

/**
 * Establish connection to the Arduino and setup message listeners
 * @param port serial port address
 */
var connectToArduino = function(port) {
    console.log('[arduino] Connecting to Arduino on ' + port);

    connection = new serialport.SerialPort(port, {
        baudrate: 115200,
        parser: serialport.parsers.readline('\n')
    });

    // catch hanging connection
    connectionTimeout = setTimeout(function() {

        // causes abort on Linux when Arduino is disconnected
        //connection.close();

        console.log('[arduino] Arduino connection failed');
        retryConnection();

    }, 30000);


    connection.on('open', function() {
        clearTimeout(connectionTimeout);
        connectionTryInterval = initialConnectionTryInterval;

        app.state.connect.arduino = true;
        app.controllers.socket.refreshState(false, ['connect.arduino']);

        connection.on('data', function(data) {
            var max = listeners.length,
                json = false,
                i;

            console.log('[arduino] Received: ' + data);

            lastMessageTime = new Date().getTime();

            try {
                json = JSON.parse(data);
            }
            catch(e) {
                console.log('[arduino] Invalid JSON message received!');
            }

            if(json !== false) {
                for(i = 0; i < max; i++) {
                    listeners[i](json);
                }
            }

        });
    });

};

/**
 * Check Arduino connection
 * If no message has come for 10 seconds, assume connection loss
 */
var checkHeartBeat = function() {
    if(app.state.connect.arduino && new Date().getTime() - lastMessageTime > 30000) {
        console.log('[arduino] Arduino connection lost');

        // causes abort on Linux when Arduino is disconnected
        //connection.close();

        app.state.connect.arduino = false;
        app.controllers.socket.refreshState(false, ['connect.arduino']);

        retryConnection();
    }
};

/**
 * Retry connecting to Arduino and increase amount of next timeout
 */
var retryConnection = function() {
    console.log('[arduino] Retry connection in ' + (connectionTryInterval/1000) + ' seconds');
    setTimeout(findArduino, connectionTryInterval);

    if(connectionTryInterval < maxConnectionTryIntrerval) {
        connectionTryInterval += connectionTryAdd;
    }
};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });


    return {

        /**
         * add listener that is called on new Arduino messages
         * @param {function} listener
         */
        addListener: function(listener) {
            listeners.push(listener);
        }

    };
};
