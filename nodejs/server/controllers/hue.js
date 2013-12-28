var hue		    = require('node-hue-api'),
	helpers	    = require('./../helpers'),
    mongoose	= require('mongoose'),
    Config		= mongoose.model('Config');

var app,
    host,
	api = new hue.HueApi();

/**
 * Error Handler for the Hue API connection
 * schedules new search
 */
var errorHandler = function(err) {

    // TODO filter out specific errors

	console.log('[hue] Hue error, resetting connection', err);
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
			console.log('[hue] Hue Bridge not found with Internet API, switching to network scan');
			
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
		console.log('[hue] No Hue Bridge found, retry in 10 seconds');
		setTimeout(findBridge, 10000);
		return;
	}
	
	console.log('[hue] Hue Bridge found:', data);

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

        console.log('[hue] Registering new user on the Hue bridge');

        api = new hue.HueApi();

        api.createUser(host, null, null, function(err, user) {

            // registration error (link button not pressed)
            if(err) {
                console.log('[hue] Hue register error:', err);
                setTimeout(registerToBridge, 2000);
            }

            // registration successful
            else {
                console.log('[hue] Hue registration successful:', user);

                // first registration
                if(typeof(app.config.hueUser) === 'undefined') {
                    new Config({ name: 'hueUser', value: user, hidden: true }).save();
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
	
	console.log('[hue] Refreshing hue state');
	
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
				console.log('[hue] Hue state changed, emitting to sockets');
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

    // remove xy from groups.action
    for(i in state.groups) {
        if(state.groups.hasOwnProperty(i)) {
            if(state.groups[i].action) {
                delete state.groups[i].action.xy;
            }
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

/**
 * modify state of single light
 * @param id
 * @param state
 * @param {boolean} broadcast broadcast changes to all users
 */
var setLightState = function(id, state, broadcast) {
    var i;

    // insert default transition time
    // don't insert when turning off as then the brightness would change to 1 (bug?)
    if(typeof(state.transitiontime) === 'undefined' && state.on !== false) {
        state.transitiontime = app.state.appConfig.transition;
    }

    api.setLightState(id, state);

	for(i in state) {
        if(state.hasOwnProperty(i) && i !== 'transitiontime') {
            app.state.lights[id].state[i] = state[i];
        }
	}

    if(broadcast) {
        app.controllers.socket.refreshState(false, ['lights.' + id + '.state']);
    }
};

/**
 * modify group light state
 * @param id
 * @param state
 * @param {boolean} broadcast broadcast changes to all users
 */
var setGroupLightState = function(id, state, broadcast) {
    var areas = ['groups.' + id + '.action'],
        i, j;

    if(typeof(app.state.groups[id]) === 'undefined') {
        return;
    }

    // insert default transition time
    // don't insert when turning off as then the brightness would change to 1 (bug?)
    if(typeof(state.transitiontime) === 'undefined' && state.on !== false) {
        state.transitiontime = app.state.appConfig.transition;
    }

    api.setGroupLightState(id, state);


    // change group state

    if(typeof(app.state.groups[id].action) === 'undefined') {
        app.state.groups[id].action = {};
    }

    for(j in state) {
        if(state.hasOwnProperty(j) && j !== 'transitiontime') {
            app.state.groups[id].action[j] = state[j];
        }
    }

    // change lights state

    for(i = 0; i < app.state.groups[id].lights.length; i++) {
        for(j in state) {
            if(state.hasOwnProperty(j) && j !== 'transitiontime') {
                app.state.lights[app.state.groups[id].lights[i]].state[j] = state[j];
            }
        }

        areas.push('lights.' + app.state.groups[id].lights[i] + '.state');
    }

    if(broadcast) {
        app.controllers.socket.refreshState(false, areas);
    }
};

/**
 * Custom call to Hue bridge REST API
 * @param {string} path path after username, beginning with /
 * @param {string} method HTTP method
 * @param {object} body [optional]
 * @param {function} callback [optional]
 * @returns {boolean} false when Hue API not available
 */
var customApiCall = function(path, method, body, callback) {
    var http = require('http'),
        options,
        request;

    if(!api) {
        return false;
    }

    console.log('[hue] Custom Hue API call:', path, body);

    if(!method) {
        method = body ? 'POST' : 'GET';
    }

    if(typeof(body) === 'object') {
        body = JSON.stringify(body);
    }

    options = {
        host: api.host,
        path: '/api/' + app.config.hueUser + path,
        method: method
    };

    if(body) {
        options.headers = {
            'Content-Type': 'application/json',
            'Content-Length': body.length
        };
    }

    request = http.request(options, callback);

    if(body) {
        request.write(body);
    }

    request.end();

    return true;
};


module.exports = function(globalApp) {
	
	app = globalApp;

	findBridge();
	
	return {
        getApi: function() {
            return api;
        },
        errorHandler: errorHandler,
		setLightState: setLightState,
        setGroupLightState: setGroupLightState,
        customApiCall: customApiCall
	};
};