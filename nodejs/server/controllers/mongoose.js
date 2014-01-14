var	mongoose = require('mongoose'),
	db = mongoose.connection,
    connectionListeners = [],
    wasConnected = false;

//
// import models (globally available through mongoose module)
//

var Config = mongoose.model('Config'),
    Favorite = mongoose.model('Favorite'),
    Scene = mongoose.model('Scene');


module.exports = function(app) {

    // synchronize asynchronous load events to determine when all have finished
    var remainingEvents = 0;

    //
    // Connection management
    //

	mongoose.connect(app.config.mongoDBHost);


    var setConnectedState = function(state) {
        console.log('[mongoose] MongoDB ' + (state ? '' : 'dis') + 'connected');
        app.state.connect.mongodb = state;

        // send to all sockets, including not logged in users
        app.controllers.socket.refreshState(
            app.server.io.sockets,
            ['connect']
        );
    };

    db.on('connected', function() {
        setConnectedState(true);
    });

    db.on('disconnected', function() {

        // close db and connection to prevent connection flood when trying to connect again
        mongoose.connection.db.close();
        mongoose.connection.close();

        setTimeout(function() {
            mongoose.connect(app.config.mongoDBHost);
        }, 5000);
    });

    // wait for closed event to determine connection loss as disconnected event is fired multiple times
    db.on('close', function() {
        setConnectedState(false);
    });

	db.on('error', console.error.bind(console, 'MongoDB connection error'));


    //
    // load models into cache and execute connection listeners
    //

	db.once('open', function() {

        console.log('[mongoose] Loading MongoDB content into cache');

        // config (app.config, app.state.appConfig)

        remainingEvents++;
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

            connectionFinished();
        });

        // favorites (app.state.favorites)

        remainingEvents++;
        Favorite.getAsMap(function(map) {
            app.state.favorites = map;

            connectionFinished();
        });

        // scenes (app.state.scenes)

        remainingEvents++;
		Scene.getAsMap(function(map) {
			app.state.scenes = map;

            connectionFinished();
		});

	});

    /**
     * execute connection listeners when all remaining data load events have finished
     */
    var connectionFinished = function() {
        var i;

        // only execute when all remaining events have finished
        remainingEvents--;

        if(remainingEvents > 0) {
            return;
        }

        console.log('[mongoose] MongoDB connection completed, executing ' + connectionListeners.length + ' listeners');

        wasConnected = true;

        for(i = 0; i < connectionListeners.length; i++) {
            connectionListeners[i]();
        }

        connectionListeners = [];

    };

    /**
     * Mongoose error handler to apply as parameter to exec() functions
     * @param socket the original client that sent the request
     * @param {string} statePath the path of the application state that is to be changed
     * @param oldValue the original value which is restored in case of an error
     * @param {string} errorType the error message type
     * @param {boolean} broadcast revert for all sockets
     * @returns {Function}
     */
    var handleError = function(socket, statePath, oldValue, errorType, broadcast) {
        return function(err) {
            if(err) {
                var path, statePart, j;

                console.log('[mongoose] Error in '  + errorType + ':', err);

                // send error notification to original client
                app.controllers.socket.sendNotification(socket, errorType, true);

                if(statePath !== false) {
                    path = statePath.split('.');
                    statePart = app.state;

                    // restore old value in applícation state
                    statePart[path[path.length-1]] = oldValue;

                    for(j = 0; j < path.length-1; j++) {
                        statePart = statePart[path[j]];
                    }

                    // broadcast error to all users or only original user
                    app.controllers.socket.refreshState(
                        (broadcast ? false: socket),
                        [statePath]
                    );
                }
            }
        };
    };


    return {

        /**
         * Add listener that gets executed on first MongoDB connection
         * @param listener
         */
        addConnectionListener: function(listener) {

            // execute listener immediately when MongoDB was already connected
            if(wasConnected) {
                listener();
            }
            else {
                connectionListeners.push(listener);
            }

        },

        handleError: handleError

    }

};
