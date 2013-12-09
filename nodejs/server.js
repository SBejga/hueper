console.log("Starting HueControl on Port 8080");

// global application object
var app = {
	
	state: {
		connect: {
			mongodb: false,
			hue: false,
			arduino: false
		},
		lights: {},
		groups: {},
		scenes: {}
	},
	
	server: {},
	
	controllers: {}
};

// TODO configuration

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
require('./server/config/mongoose')(app);


//
// Controllers
//

app.controllers.socket = require('./server/socket')(app);
app.controllers.hue = require('./server/hue')(app);


