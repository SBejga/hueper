var hue		    = require('node-hue-api'),
	helpers	    = require('./../helpers'),
    mongoose	= require('mongoose'),
    Config		= mongoose.model('Config');

var app,
    host,
	api;

/**
 * Error Handler for the Hue API connection
 * schedules new search
 */
var errorHandler = function(err) {
	
	console.log('Hue error', err);
	console.log('retry in 10 seconds');

	app.state.connect.hue = false;
    app.state.connect.hueRegistered = false;
	
	app.controllers.socket.refreshState(false, ['connect']);
	
	setTimeout(findBridge, 10000);
};

/**
 * find the Hue Bridge in the local network
 */
var findBridge = function() {
	
	// try to find the bridge over Philips' Internet API
	hue.locateBridges(function(err, data) {
		
		// switch to network scan if that doesn't work
		if(err || !data || !data.length) {
			console.log('Hue Bridge not found with Internet API, switching to network scan');
			
			hue.searchForBridges(2000)
				.then(bridgeLocated)
				.done();
		}
		else {
			bridgeLocated(data);
		}
		
	});
	
};

/**
 * Hue Bridge search completed
 * If nothing found (data empty), schedule new search
 * @param {array} data
 *			[{id: String, ipaddress: String}]
 */
var bridgeLocated = function(data) {
	
	if(!data.length) {
		console.log('No Hue Bridge found, retry in 10 seconds');
		setTimeout(findBridge, 10000);
		return;
	}
	
	console.log('Hue Bridge found:', data);

    host = data[0].ipaddress;

    app.state.connect.hue = true;

    // first start - register to bridge
	if(typeof(app.config.hueUser) === 'undefined') {
        registerToBridge();
    }
	else {
        connectToBridge();
    }

};

/**
 * Register new user to bridge
 * Executed periodically until connection was successful
 */
var registerToBridge = function() {

    if(app.state.connect.hue && !app.state.connect.hueRegistered) {

        console.log('Registering new user on the Hue bridge');

        api = new hue.HueApi();

        api.createUser(host, null, null, function(err, user) {

            // registration error (link button not pressed)
            if(err) {
                console.log('Hue register error:', err);
                setTimeout(registerToBridge, 2000);
            }

            // registration successful
            else {
                console.log('Hue registration successful:', user);

                // first registration
                if(typeof(app.config.hueUser) === 'undefined') {
                    new Config({ name: 'hueUser', value: user }).save();
                }
                else {
                    Config.update({ name: 'hueUser' }, { value: user }).exec();
                }

                app.config.hueUser = user;
                app.state.connect.hueRegistered = true;

                connectToBridge();
            }

        });

    }

};

/**
 * Connect to Hue bridge and check if configurated user is still valid
 */
var connectToBridge = function() {
    api = new hue.HueApi(host, app.config.hueUser);

    api.connect()
        .then(function(data) {

            // valid user
            if(typeof(data.linkbutton) !== 'undefined') {
                app.state.connect.hueRegistered = true;
                refreshState(true);
            }
            // invalid user -> try to register
            else {
                registerToBridge();
            }

        })
        .fail(errorHandler)
        .done();

};

/**
 * Periodical refresh of complete Hue bridge state
 * @param {boolean} refreshConnect also refresh connect state to socket after connecting to bridge
 */
var refreshState = function(refreshConnect) {
	
	console.log('refreshing hue state');
	
	api.getFullState()
		.then(function(data) {
			var areas = [],
                i;

            // remove unused properties
            cleanHueState(data);


            // look for changes

            for(i in data.lights) {
                if(data.lights.hasOwnProperty(i)) {

                    // new or changed light
                    if(!helpers.equalsProperties(data.lights[i], app.state.lights[i], ['type', 'name', 'modelid', 'swversion'])) {
                        areas.push('lights.' + i);
                        app.state.lights[i] = data.lights[i];
                    }

                    // light state changed
                    else if(!helpers.equals(data.lights[i].state, app.state.lights[i].state)) {
                        areas.push('lights.' + i + '.state');
                        app.state.lights[i].state = data.lights[i].state;
                    }

                }
            }

			if(!helpers.equals(data.groups, app.state.groups)) {
				areas.push('groups');
				app.state.groups = data.groups;
			}

            if(!helpers.equals(data.config, app.state.config)) {
                areas.push('config');
                app.state.config = data.config;
            }

            // also push connected state when bridge has connected
			if(refreshConnect) {
				areas.push('connect');
			}
			
			
			if(areas.length) {
				console.log('hue state changed, emitting to sockets');
				app.controllers.socket.refreshState(false, areas);
			}
			
			setTimeout(refreshState, 10000);
		})
		.fail(errorHandler)
		.done();
};

/**
 * remove unused values from obtained Hue bridge state
 * @param state
 */
var cleanHueState = function(state) {

    var i;

    // remove xy and pointsymbol from lights
    for(i in state.lights) {
        if(state.lights.hasOwnProperty(i)) {
            delete state.lights[i].state.xy;
            delete state.lights[i].pointsymbol;
        }
    }

    // prevent config from always being recognized as changed
    // remove UTC and last used of current user
    delete state.config.UTC;
    delete state.config.whitelist[app.config.hueUser]['last use date'];

};



//
// Exported functions
//

var setLightState = function(id, state) {
    var i;

	for(i in state) {
        if(state.hasOwnProperty(i)) {
            app.state.lights[id].state[i] = state[i];
        }
	}

	api.setLightState(id, state);
};


module.exports = function(globalApp) {
	
	app = globalApp;

	findBridge();
	
	return {
        getApi: function() {
            return api;
        },
		setLightState: setLightState
	};
};