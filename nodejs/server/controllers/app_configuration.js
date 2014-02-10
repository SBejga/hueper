var mongoose	= require('mongoose'),
    Config      = mongoose.model('Config'),
    configurationChangeListeners = [],
    app;


var init = function() {

    // cache configuration in global app object
    app.controllers.mongoose.addQueryListener(function(callback) {
        console.log('[app_configuration] Loading configuration');

        Config.find(function(err, entries) {
            var i, c;

            for(i = 0; i < entries.length; i++) {
                c = entries[i];

                if(c.name) {
                    if(c.hidden) {
                        app.config[c.name] = c.value;
                    }
                    else {
                        app.state.appConfig[c.name] = c.value;
                    }
                }
            }

            // load default configuration into MongoDB if not already present
            require('../config/application')(app);

            console.log('[app_configuration] Configuration loaded, firing config_ready event');
            app.events.emit('config_ready');

            callback();
        });

    });

    app.controllers.socket.addSocketListener(socketListeners);
};

var socketListeners = function(socket) {

    // change application password
    socket.on('config.password', function(data) {

        // wrong old password
        if(app.config.password !== null && data.oldPassword !== app.config.password) {
            socket.emit('config.password', false);
        }
        else {
            console.log('[app_configuration] Change application password');

            // no password
            if(data.newPassword === '') {
                data.newPassword = null;
            }

            Config.update(
                { name: 'password' },
                { value: data.newPassword },

                function(err) {
                    if(err) {
                        app.controllers.socket.sendNotification(socket, 'config.password', true);
                        return;
                    }

                    // success: update in state and emit success message
                    app.config.password = data.newPassword;

                    socket.emit('config.password', {
                        password: data.newPassword
                    });
                }
            );

        }

    });

    // change application configuration
    socket.on('config.change', function(data) {
        var i, j;

        console.log('[app_configuration] Change application configuration', data);

        for(i in data) {
            if(data.hasOwnProperty(i) && typeof(app.state.appConfig[i]) !== 'undefined') {
                Config.update(
                    { name: i },
                    { value: data[i] },

                    app.controllers.mongoose.handleError(
                        socket,
                        'appConfig.' + i,
                        app.state.appConfig[i],
                        'config.save',
                        true
                    )
                );

                app.state.appConfig[i] = data[i];

                for(j in configurationChangeListeners) {
                    if(configurationChangeListeners.hasOwnProperty(j)) {
                        configurationChangeListeners[j](i);
                    }
                }
            }
        }

        app.controllers.socket.refreshState(
            app.controllers.socket.getBroadcastSocket(socket),
            ['appConfig']
        );
    });

};


var addConfigurationChangeListener = function(listener) {
    configurationChangeListeners.push(listener);
};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.once('ready', function() {
        init();
    });

    return {
        addConfigurationChangeListener: addConfigurationChangeListener
    };

};
