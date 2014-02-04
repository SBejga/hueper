console.log('[SERVER] Starting HueControl on Port 8080');

//
// global application object
//
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
        }
	},
	
	server: {},
	
	controllers: {}
};

//
// set up global event infrastructure
//
var EventEmitter = require('events').EventEmitter;
app.events = new EventEmitter();
app.events.setMaxListeners(0);

//
// Start Express server with Socket.IO
//

app.server.express	= require('express')();
app.server.http		= require('http').createServer(app.server.express);
app.server.io		= require('socket.io').listen(app.server.http);

app.server.http.listen(8080);


//
// Configuration
//

require('./server/config/express')(app);
require('./server/config/socket')(app);
require('./server/config/mongoose')(app);


//
// Controllers
//

var controllers = [

    // general controllers
    'mongoose', 'socket', 'hue', 'arduino',

    // functional controllers
    'app_configuration', 'hue_configuration', 'lights', 'groups', 'favorites', 'scenes', 'automation', 'arduino_button',
    'arduino_sensors', 'rfid', 'devices', 'speech'

];

controllers.forEach(function(controller) {
    app.controllers[controller] = require('./server/controllers/' + controller)(app);
});



// fire ready event
console.log('[SERVER] All controllers loaded, emitting ready event');
app.events.emit('ready');
