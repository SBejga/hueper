var	express	= require('express');

module.exports = function(app) {
	
	app.server.express.configure(function() {
		
		app.server.express.use(express.compress());
		app.server.express.use(express.json());
		app.server.express.use(express.urlencoded());

        app.server.express.use(express.static(__dirname + '/../../client'));
        app.server.express.use(express.static(__dirname + '/../../debug'));
		
		app.server.express.use(express.logger());
		
	});
	
};
