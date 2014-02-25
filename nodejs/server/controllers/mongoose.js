var	mongoose = require('mongoose'),
	db = mongoose.connection,

    app;

//
// Connection management
//

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

// fire event once the connection could be established
db.once('open', function() {
    app.events.fire('mongodb.ready');
});



var init = function() {
    mongoose.connect(app.config.mongoDBHost);
};


var setConnectedState = function(state) {
    console.log('[mongoose] MongoDB ' + (state ? '' : 'dis') + 'connected');
    app.state.connect.mongodb = state;

    // send to all sockets, including not logged in users
    app.controllers.socket.refreshState(
        app.server.io.sockets,
        ['connect.mongodb']
    );
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


module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });


    return {
        handleError: handleError
    };

};
