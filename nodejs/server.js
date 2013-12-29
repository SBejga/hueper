console.log("Starting HueControl on Port 8080");

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
        favorites: {},
        scenes: {}
	},
	
	server: {},
	
	controllers: {}
};

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

// general

app.controllers.mongoose = require('./server/controllers/mongoose')(app);
app.controllers.socket = require('./server/controllers/socket')(app);
app.controllers.hue = require('./server/controllers/hue')(app);


// functional

app.controllers.configuration = require('./server/controllers/configuration')(app);
app.controllers.lights = require('./server/controllers/lights')(app);
app.controllers.groups = require('./server/controllers/groups')(app);
app.controllers.favorites = require('./server/controllers/favorites')(app);
app.controllers.scenes = require('./server/controllers/scenes')(app);

//
// Debug REPL console
//

// TODO move to dev environment

var webrepl = require('node-web-repl');

global.app = app;

// setup your app as normal
webrepl.createServer({
    username: 'admin',
    password: 'admin',
    port: 11911,
    host: '127.0.0.1'
});