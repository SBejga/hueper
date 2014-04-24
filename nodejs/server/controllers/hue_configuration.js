var app;

var init = function() {
    app.controllers.socket.addSocketListener(socketListeners);
};


var socketListeners = function(socket) {

    // delete user
    socket.on('config.deleteUser', function(data) {
        console.log('[hue_configuration] Delete user: ', data.id);
        app.controllers.hue.makeApiCall(function(api) {
            api.deleteUser(data.id);
        });

        delete app.state.config.whitelist[data.id];
        app.controllers.socket.deleteFromStateOfOthers(
            socket,
            ['config.whitelist.' + data.id]
        );
    });

    // press link button
    socket.on('config.pressLinkButton', function() {
        console.log('[hue_configuration] Press link button');
        app.controllers.hue.makeApiCall(function(api) {
            api.pressLinkButton();
        });

        app.state.config.linkbutton = true;
        app.controllers.socket.refreshStateOfOthers(
            socket,
            ['config.linkbutton']
        );
    });

    // apply firmware update
    socket.on('config.firmware', function() {

        /*
         * Hue firmware update status in config.swupdate.updatestate
         * 0 - no firmware update available
         * 1 - downloading firmware update
         * 2 - firmware update ready to apply
         * 3 - firmware update in progress
         */

        if(app.state.config.swupdate && app.state.config.swupdate.updatestate === 2) {
            console.log('[hue_configuration] Applying Hue bridge firmware update');

            app.state.config.swupdate.updatestate = 3;
            app.controllers.hue.customApiCall(
                '/config',
                'PUT',
                { swupdate: { updatestate: 3 } }
            );

            app.controllers.socket.refreshStateOfOthers(
                socket,
                ['config.swupdate.updatestate']
            );
        }

    });

};

module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });

};
