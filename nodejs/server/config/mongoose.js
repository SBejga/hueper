var	mongoose	= require('mongoose'),
	db			= mongoose.connection;

//
// import models (globally available through mongoose module)
//

require('../models/scene');


var Scene = mongoose.model('Scene');


//
// connect and cache data
//

module.exports = function(app) {
	
	// TODO repeat connect in loop / timeout
	
	// TODO move to config
	mongoose.connect('mongodb://localhost/hue');

	// TODO emit error on socket
	db.on('error', console.error.bind(console, 'connection error'));

	db.once('open', function() {
		console.log('MongoDB connection established');
		
		app.state.connect.mongodb = true;
		
		// load models into cache
		
		Scene.find(function(err, scenes) {
			app.state.scenes = scenes;
		});
	});
	
};
