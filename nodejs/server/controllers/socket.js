var	mongoose	= require('mongoose'),
	Scene		= mongoose.model('Scene');

var socketListeners = [];
	
var app, io;

/*
var	sceneCallback = function(err) {

	// TODO error handling
	
	if(err) {
	
	}
	else {
		Scene.find(function(err, scenes) {
			io.sockets.in('login').emit('scenes.update', scenes);
		});
	}
	
};
*/

/**
 * Socket connection listener
 * User login handler
 */
var setupSocketHandlers = function() {

	io.sockets.on('connection', function(socket) {

        // TODO remove
        app.config.password = 'admin';

        // no login required
        if(typeof(app.config.password) === 'undefined') {
            socket.emit('login.required', false);
            acceptSocket(socket);
        }
        else {

            socket.on('login', function(data) {

                // only proceed if not already logged in
                socket.get('login', function(err, login) {

                    if(login === null) {
                        if(data.password === app.config.password) {

                            socket.set('login', true, function() {
                                socket.emit('login', true);
                                acceptSocket(socket);
                            });

                        }
                        else {
                            socket.emit('login', false);
                        }
                    }

                });

            });

            socket.emit('login.required', true);
        }

	});

};

/**
 * User successfully logged in: add attached socket listeners
 * @param socket
 */
var acceptSocket = function(socket) {
    var i;

    // join login room to receive broadcasts
    socket.join('login');

    // make socket available for external listeners

    for(i = 0; i < socketListeners.length; i++) {
        socketListeners[i](socket);
    }

    /*
     // scene administration

     socket.on('scene.create', function(data) {
     Scene.create(data, sceneCallback);
     });

     socket.on('scene.update', function(data) {
     Scene.update({_id: data._id}, data, sceneCallback);
     });

     socket.on('scene.remove', function(data) {
     Scene.remove({_id: data}, sceneCallback);
     });

     */

    //
    // actions after connecting to socket
    //

    refreshState(socket);
};

var addSocketListener = function(listener) {
    socketListeners.push(listener);
};

/**
 * Send specified parts of the application state to specified clients
 * @param socket specified socket to send state to, all sockets if false
 * @param area array of paths in app.state object that are to be refreshed, complete state if false
 */
var refreshState = function(socket, area) {
	var channel = socket || io.sockets.in('login'),
		message = {},
		i, j, path, messagePart;
	
	// refresh complete state
	if(!area || !area.length) {
		channel.emit('state', {
			'': app.state
		});
		return;
	}
	
	for(i = 0; i < area.length; i++) {
		path = area[i].split('.');
		messagePart = app.state;
		
		for(j = 0; j < path.length; j++) {
			messagePart = messagePart[path[j]];
		}
		
		message[area[i]] = messagePart;
	}
	
	channel.emit('state', message);
};


module.exports = function(globalApp) {

    app = globalApp;
    io	= app.server.io;

    setupSocketHandlers();

    return {
        refreshState: refreshState,
        addSocketListener: addSocketListener
    };
};
