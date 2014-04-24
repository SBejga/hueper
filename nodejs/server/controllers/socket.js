var util = require('util'),

    app, io,

    socketListeners = [];

/**
 * Socket connection listener
 */
var init = function() {

	io.sockets.on('connection', function(socket) {

        if(socket.handshake && socket.handshake.address && socket.handshake.address.address) {
            console.log('[socket] connection from ' + socket.id + ' (' + socket.handshake.address.address + ')');
        }
        else {
            console.log('[socket] connection from ' + socket.id);
        }

        app.events.on('config.ready', function() {
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

        // sending the client his MAC address for device registration
        socket.emit('device.address', app.controllers.devices.getMacAddress(socket.handshake.address.address));
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

    if(channel.isDummySocket) {
        return;
    }

	// refresh complete state
	if(area === undefined || area === false || area === null) {
		channel.emit('state', {
			'': app.state
		});
		return;
	}
    // convert String to array
    else if(!util.isArray(area)) {
        area = [area];
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

var refreshStateOfOthers = function(socket, area) {
    refreshState(getOtherSockets(socket), area);
};

/**
 * Remove specified parts of the client-side application state
 * @param socket specified socket to send state to, all sockets if false
 * @param area array of paths in app.state object that are to be deleted
 */
var deleteFromState = function(socket, area) {
    var channel = socket || io.sockets.in('login');

    if(channel.isDummySocket) {
        return;
    }

    // convert string to array
    if(!util.isArray(area)) {
        area = [area];
    }

    channel.emit('state.delete', area);
};

var deleteFromStateOfOthers = function(socket, area) {
    deleteFromState(getOtherSockets(socket), area);
};

/**
 * Send notification or error message
 * @param socket
 * @param notification message
 * @param isError
 */
var sendNotification = function(socket, notification, isError) {
    var channel = socket || io.sockets.in('login'),
        message = {};

    if(channel.isDummySocket) {
        return;
    }

    if(isError) {
        message.error = notification;
    }
    else {
        message.notification = notification;
    }

    channel.emit('notification', message);
};

/**
 * add listener that is applied to all newly logged in sockets
 * @param {function} listener
 */
var addSocketListener = function(listener) {
    socketListeners.push(listener);

    // enable the REST interface to use this socket listener
    app.controllers.rest.addSocketDummyListener(listener);
};

/**
 * Send broadcast to all logged in users
 * @param data
 */
var broadcast = function(data) {
    io.sockets.in('login').emit(data);
};

/**
 * Send broadcast to all logged in users except the parameter
 */
var broadcastToOthers = function(socket, data) {
    if(socket.isDummySocket) {
        io.sockets.in('login').emit(data);
    }
    else {
        socket.broadcast.to('login').emit(data);
    }
};

/**
 * get all sockets for logged in users except the parameter
 * @param socket
 * @returns {socket}
 */
var getOtherSockets = function(socket) {
    if(socket.isDummySocket) {
        return io.sockets.in('login');
    }
    else {
        return socket.broadcast.to('login');
    }
};

/**
 * @returns {Number} amount of currently logged in users
 */
var getConnectedUserCount = function() {
    return io.sockets.clients('login').length;
};



module.exports = function(globalApp) {

    app = globalApp;
    io	= app.server.io;

    app.events.on('ready', function() {
        init();
    });


    return {
        refreshState: refreshState,
        refreshStateOfOthers: refreshStateOfOthers,
        deleteFromState: deleteFromState,
        deleteFromStateOfOthers: deleteFromStateOfOthers,
        addSocketListener: addSocketListener,
        broadcast: broadcast,
        broadcastToOthers: broadcastToOthers,
        getOtherSockets: getOtherSockets,
        getConnectedUserCount: getConnectedUserCount,
        sendNotification: sendNotification
    };
};
