var	mongoose	= require('mongoose'),
	Scene		= mongoose.model('Scene');

var socketListeners = [];
	
var app, io;

/**
 * Socket connection listener
 */
var setupSocketHandlers = function() {

	io.sockets.on('connection', function(socket) {

        if(socket.handshake && socket.handshake.address && socket.handshake.address.address) {
            console.log('[socket] connection from ' + socket.id + ' (' + socket.handshake.address.address + ')');
        }
        else {
            console.log('[socket] connection from ' + socket.id);
        }

        app.controllers.mongoose.addConnectionListener(function() {
            handleLogin(socket);
        });

        // send connect state to socket to display MongoDB connection problems
        if(!app.state.connect.mongodb) {
            refreshState(socket, ['connect']);
        }

	});

};

/**
 * MongoDB connection established; send login.required information to user
 * and handle login event
 * @param socket
 */
var handleLogin = function(socket) {

    // no login required
    if(app.config.password === null) {
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
};

/**
 * User successfully logged in: add attached socket listeners
 * @param socket
 */
var acceptSocket = function(socket) {
    var i;

    if(socket.handshake && socket.handshake.address && socket.handshake.address.address) {
        console.log('[socket] login from ' + socket.id + ' (' + socket.handshake.address.address + ')');
    }
    else {
        console.log('[socket] login from ' + socket.id);
    }


    // join login room to receive broadcasts
    socket.join('login');

    // make socket available for external listeners

    for(i = 0; i < socketListeners.length; i++) {
        socketListeners[i](socket);
    }

    //
    // actions after connecting to socket
    //

    refreshState(socket);
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

/**
 * Remove specified parts of the client-side application state
 * @param socket specified socket to send state to, all sockets if false
 * @param area array of paths in app.state object that are to be deleted
 */
var deleteFromState = function(socket, area) {
    var channel = socket || io.sockets.in('login');

    channel.emit('state.delete', area);
};


module.exports = function(globalApp) {

    app = globalApp;
    io	= app.server.io;

    setupSocketHandlers();

    return {
        refreshState: refreshState,
        deleteFromState: deleteFromState,

        /**
         * add listener that is applied to all newly logged in sockets
         * @param {function} listener
         */
        addSocketListener: function(listener) {
            socketListeners.push(listener);
        },

        /**
         * Send broadcast to all logged in users
         * @param data
         */
        broadcast: function(data) {
            io.sockets.in('login').emit(data);
        },

        /**
         * Send broadcast to all logged in users except the parameter
         */
        broadcastSocket: function(socket, data) {
            socket.broadcast.to('login').emit(data);
        },

        /**
         * get all sockets for logged in users except the parameter
         * @param socket
         * @returns {socket}
         */
        getBroadcastSocket: function(socket) {
            return socket.broadcast.to('login');
        }

    };
};
