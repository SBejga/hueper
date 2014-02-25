var app;


var init = function() {

    /*
     * Commodity function to properly shut down the Raspberry Pi
     * with a button connected to the Arduino
     */

    // listening for {action: button} event
    app.controllers.arduino.addListener(function(message) {
        if(typeof(message.action) !== 'undefined' && message.action === 'button') {
            console.log('[arduino_button] Button event received, shutting down');

            try {
                require('child_process').exec('sudo halt');
            }
            catch(e) {
                console.log('[arduino_button] Shutdown error:', e);
            }
        }
    });

};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });

};
