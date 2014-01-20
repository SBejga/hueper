var app;


var init = function() {

    // listening for {action: motion} event
    app.controllers.arduino.addListener(function(message) {
        if(message.action === 'motion') {
            console.log('[arduino_motion] Motion event received');

            // TODO save time of last motion

            app.controllers.automation.fireEvent('motion');
        }
    });

};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.once('ready', function() {
        init();
    });

};
