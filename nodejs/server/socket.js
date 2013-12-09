var	mongoose	= require('mongoose'),
	Scene		= mongoose.model('Scene');
	
var app, io;

var	sceneCallback = function(err) {

	// TODO error handling
	
	if(err) {
	
	}
	else {
		Scene.find(function(err, scenes) {
			io.sockets.emit('scenes.update', scenes);
		});
	}
	
};

var setupSocketHandlers = function() {
	io.sockets.on('connection', function(socket) {
		
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
		
		
		// light state
		
		socket.on('light.state', function(data) {
			app.controllers.hue.setLightState(data);
			refreshState(socket.broadcast, ['lights.' + data.id + '.state']);
		});
		
		//
		// actions after connecting to socket
		//
		
		refreshState(socket);
		
	});
};

var refreshState = function(socket, area) {
	var channel = socket || io.sockets,
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
        refreshState: refreshState
    };
};
