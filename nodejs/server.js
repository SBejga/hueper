console.log('[SERVER] Starting Smart Lights backend on Port 8080');


// global application object

var app = {

    config: {},

	state: {
		connect: {
            mongodb: false,
            hue: false,
            hueRegistered: false,
            arduino: false
        },
        appConfig: {},
        config: {},
        lights: {},
        groups: {},
        sensors: {},
        favorites: {},
        scenes: {},
        automation: {},
        rfid: {},
        rfidUnknown: [],
        devices: {},
        speech: {
            testMode: false,
            recognized: false
        },
        party: {}
	},
	
	server: {},
	
	controllers: {}
};

// set up global event infrastructure

app.events = require('./server/modules/events');


// start Express server with Socket.IO

app.server.express	= require('express')();
app.server.http		= require('http').createServer(app.server.express);
app.server.io		= require('socket.io').listen(app.server.http);

app.server.http.listen(8080);


// Configuration

require('./server/config/express')(app);
require('./server/config/socket')(app);
require('./server/config/mongoose')(app);


// include controllers

require('fs').readdirSync(__dirname + '/server/controllers').forEach(function(file) {
    var controller;

    if(file.match(/\.js$/) !== null) {
        controller = file.replace(/\.js$/, '');
        app.controllers[controller] = require('./server/controllers/' + controller)(app);
    }
});



// fire ready event

console.log('[SERVER] All controllers loaded, firing ready event');
app.events.fire('ready');
