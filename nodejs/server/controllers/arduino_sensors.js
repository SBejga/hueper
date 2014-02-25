var app;

var lastMotion = 0,
    lastSynchronizedLight = 0;


var init = function() {

    // listening for {light: ...} and {action: motion} event
    app.controllers.arduino.addListener(function(message) {
        if(typeof(message.light) !== 'undefined') {
            handleLightSensor(message);
        }
        else if(message.action === 'motion') {
            handleMotionSensor();
        }
    });

};

var handleLightSensor = function(message) {
    var oldValue = app.state.sensors.light;

    app.state.sensors.light = message.light;

    // only broadcast to sockets when value has changed more than a threshold
    if(typeof(oldValue) === 'undefined' || Math.abs(lastSynchronizedLight - message.light) > 5) {
        app.controllers.socket.refreshState(
            false,
            ['sensors.light']
        );

        lastSynchronizedLight = message.light;
    }

    app.controllers.automation.fireEvent('light', message.light);
};

var handleMotionSensor = function() {
    console.log('[arduino_sensors] Motion event received');

    lastMotion = new Date().getTime();

    app.controllers.automation.fireEvent('motion');
};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });

    return {
        getLastMotion: function() {
            return lastMotion;
        },

        getSecondsSinceLastMotion: function() {
            return Math.round((new Date().getTime() - lastMotion) / 1000);
        }
    };

};
