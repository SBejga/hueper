var mongoose	= require('mongoose'),
    Config      = mongoose.model('Config'),
    app;

var socketListeners = function(socket) {

    //
    // Hue bridge configuration
    //

    // delete user
    socket.on('config.deleteUser', function(data) {
        console.log('[configuration] Delete user: ', data.id);
        app.controllers.hue.getApi().deleteUser(data.id);

        delete app.state.config.whitelist[data.id];
        app.controllers.socket.deleteFromState(
            app.controllers.socket.getBroadcastSocket(socket),
            ['config.whitelist.' + data.id]
        );
    });

    // press link button
    socket.on('config.pressLinkButton', function() {
        console.log('[configuration] Press link button');
        app.controllers.hue.getApi().pressLinkButton();

        app.state.config.linkbutton = true;
        app.controllers.socket.refreshState(
            app.controllers.socket.getBroadcastSocket(socket),
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
            console.log('[configuration] Applying Hue bridge firmware update');

            app.state.config.swupdate.updatestate = 3;
            app.controllers.hue.customApiCall(
                '/config',
                'PUT',
                { swupdate: { updatestate: 3 } }
            );

            app.controllers.socket.refreshState(
                app.controllers.socket.getBroadcastSocket(socket),
                ['config.swupdate.updatestate']
            );
        }

    });


    //
    // Application configuration
    //

    // change application password
    socket.on('config.password', function(data) {

        // wrong old password
        if(app.config.password !== null && data.oldPassword !== app.config.password) {
            socket.emit('config.password', false);
        }
        else {
            console.log('[configuration] Change application password');

            // no password
            if(data.newPassword === '') {
                data.newPassword = null;
            }

            app.config.password = data.newPassword;
            Config.update(
                { name: 'password' },
                { value: data.newPassword }
            ).exec();

            socket.emit('config.password', {
                password: data.newPassword
            });
        }

    });

    // change application configuration
    socket.on('config.change', function(data) {
        var i;

        console.log('[configuration] Change application configuration', data);

        for(i in data) {
            if(data.hasOwnProperty(i) && typeof(app.state.appConfig[i]) !== 'undefined') {
                app.state.appConfig[i] = data[i];
                Config.update(
                    { name: i },
                    { value: data[i] }
                ).exec();
            }
        }

        app.controllers.socket.refreshState(
            app.controllers.socket.getBroadcastSocket(socket),
            ['appConfig']
        );
    });

};

module.exports = function(globalApp) {

    app = globalApp;

    app.controllers.socket.addSocketListener(socketListeners);

};
