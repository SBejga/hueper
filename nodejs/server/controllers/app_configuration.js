var mongoose    = require('mongoose'),
    Config      = mongoose.model('Config'),

    configurationChangeListeners = [],

    app;


var init = function() {

    // cache configuration in global app object
    app.events.on('mongodb.ready', function() {
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

            app.events.fire('config.ready');
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
        change(data, socket);
    });

};


var addConfigurationChangeListener = function(listener) {
    configurationChangeListeners.push(listener);
};

/**
 * Change application configuration
 * @param {object} data key-value pairs of the changed configuration entries
 *          The keys alrady have to be present in app.state.appConfig
 * @param socket (optional) socket of the originating client
 */
var change = function(data, socket) {
    var channel = socket ? app.controllers.socket.getOtherSockets(socket) : false;

    var i, j;

    console.log('[app_configuration] Change application configuration', data);

    for(i in data) {
        if(data.hasOwnProperty(i) && typeof(app.state.appConfig[i]) !== 'undefined' && app.state.appConfig[i] !== data[i]) {
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

            j = configurationChangeListeners.length;

            while(j--) {
                configurationChangeListeners[j](i);
            }
        }
    }

    app.controllers.socket.refreshState(
        channel,
        ['appConfig']
    );

};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });

    return {
        addConfigurationChangeListener: addConfigurationChangeListener,
        change: change
    };

};
