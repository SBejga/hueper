var	mongoose	= require('mongoose'),
	db			= mongoose.connection;

//
// import models (globally available through mongoose module)
//

require('../models/scene');
require('../models/config');


var Scene = mongoose.model('Scene');
var Config = mongoose.model('Config');


module.exports = function(app) {

    //
    // Connection management
    //

	mongoose.connect(app.config.mongoDBHost);


    var setConnectedState = function(state) {
        console.log('MongoDB ' + (state ? '' : 'dis') + 'connected');
        app.state.connect.mongodb = state;
        app.controllers.socket.refreshState(false, ['connect']);
    };

    db.on('connected', function() {
        setConnectedState(true);
    });

    db.on('disconnected', function() {

        // close db and connection to prevent connection flood when trying to connect again
        mongoose.connection.db.close();
        mongoose.connection.close();

        setTimeout(function() {
            mongoose.connect(app.config.mongoDBHost);
        }, 5000);
    });

    // wait for closed event to determine connection loss as disconnected event is fired multiple times
    db.on('close', function() {
        setConnectedState(false);
    });

	db.on('error', console.error.bind(console, 'MongoDB connection error'));


    //
    // load models into cache
    //

	db.once('open', function() {

        // config (app.config)

        Config.find(function(err, entries) {
            var i, c;

            for(i = 0; i < entries.length; i++) {
                c = entries[i];

                if(c.name) {
                    app.config[c.name] = c.value;
                }
            }
        });

        // scenes (app.state.scenes)

		Scene.find(function(err, scenes) {
			app.state.scenes = scenes;
		});

	});

};
