var hue		    = require('node-hue-api'),
	helpers	    = require('../helpers'),
    mongoose	= require('mongoose'),
    Config		= mongoose.model('Config'),

    app,

    host,
    api,
    initialConnectionTryInterval = 10000,
    connectionTryInterval = 10000,
    connectionTryAdd = 10000,
    maxConnectionTryIntrerval = 60000,
    refreshTimeout,
    waitingApiCalls = [];


var init = function() {
    findBridge();
};


/**
 * Error Handler for the Hue API connection
 * schedules new search
 */
var errorHandler = function(err) {
	console.log('[hue] Hue error, resetting connection', err);
	console.log('[huer] Retry in ' + (connectionTryInterval/1000) + ' seconds');

	app.state.connect.hue = false;
    app.state.connect.hueRegistered = false;
	
	app.controllers.socket.refreshState(false, ['connect']);
	
	setTimeout(findBridge, connectionTryInterval);
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
		console.log('[hue] No Hue Bridge found, retry in ' + (connectionTryInterval/1000) + ' seconds');
		setTimeout(findBridge, connectionTryInterval);

        if(connectionTryInterval < maxConnectionTryIntrerval) {
            connectionTryInterval += connectionTryAdd;
        }

		return;
	}
	
	console.log('[hue] Hue Bridge found:', data);

    host = data[0].ipaddress;

    app.state.connect.hue = true;
    connectionTryInterval = initialConnectionTryInterval;

    // sign in to bridge when config is present
    app.events.on('config.ready', function() {

        // first start - register to bridge
        if(typeof(app.config.hueUser) === 'undefined') {
            registerToBridge();
        }
        else {
            connectToBridge();
        }

    });

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
                setTimeout(registerToBridge, 5000);
            }

            // registration successful
            else {
                console.log('[hue] Hue registration successful:', user);

                // first registration
                if(typeof(app.config.hueUser) === 'undefined') {
                    new Config({
                        name: 'hueUser',
                        value: user,
                        hidden: true
                    }).save();
                }
                else {
                    Config.update(
                        { name: 'hueUser' },
                        { value: user }
                    ).exec();
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
                executeWaitingApiCalls();
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

            // lamp count changed: do complete refresh
            if(helpers.objectSize(data.lights) !== helpers.objectSize(app.state.lights)) {
                app.state.lights = data.lights;
                areas.push('lights');
            }
            // check state change for each lamp
            else {
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
				console.log('[hue] Hue state changed, emitting to sockets:', areas);
				app.controllers.socket.refreshState(false, areas);
			}
			
			refreshTimeout = setTimeout(refreshState, 10000);
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

    var cleanColormode = function(s) {

        // remove xy
        delete s.xy;

        // remove hue/sat or ct based on colormode

        if(s.colormode === 'ct') {
            delete s.hue;
            delete s.sat;
        }
        // also delete ct when in xy mode as it is best resembled in hue/sat mode
        else {
            delete s.ct;
        }

    };

    // clean lights

    for(i in state.lights) {
        if(state.lights.hasOwnProperty(i)) {

            // pointsymbol it not used yet
            delete state.lights[i].pointsymbol;

            cleanColormode(state.lights[i].state);
        }
    }

    // clean groups

    for(i in state.groups) {
        if(state.groups.hasOwnProperty(i) && state.groups[i].action) {
            cleanColormode(state.groups[i].action);
        }
    }

    // clean configuration to prevent it from always being recognized as changed

    // remove timestamps
    delete state.config.UTC;
    delete state.config.localtime;

    // remove time from last use date
    for (i in state.config.whitelist) {
        if(state.config.whitelist.hasOwnProperty(i)) {
            state.config.whitelist[i]['last use date'] = state.config.whitelist[i]['last use date'].substring(0, 17) + '00';

            if(i === app.config.hueUser) {
                state.config.whitelist[i].currentUser = true;
                state.config.whitelist[i]['last use date'] = state.config.whitelist[i]['last use date'].substring(0, 14) + '00:00';
            }
        }
    }

};

var cleanClientState = function(state) {

    // rename isOn to on (mongoose forbids use of "on" as attribute)
    if(typeof(state.isOn) !== 'undefined') {
        state.on = state.isOn;
        delete state.isOn;
    }

    // turn light on when changing other properties
    if(typeof(state.on) === 'undefined') {
        state.on = true;
    }

    // insert default transition time
    // don't insert when turning off as then the brightness would change to 1 (bug?)
    if(typeof(state.transitiontime) === 'undefined' && state.on !== false) {
        state.transitiontime = app.state.appConfig.transition;
    }

};

/**
 * Broadcast light state changes
 * @param broadcast socket to broadcast to, true for all sockets, false for no broadcast
 * @param areas
 */
var broadcastChanges = function(broadcast, areas) {
    if(broadcast) {

        // to broadcast to all users, change socket to false
        if(broadcast === true) {
            broadcast = false;
        }

        app.controllers.socket.refreshState(broadcast, areas);
    }
};


//
// Exported functions
//

/**
 * modify state of single light
 * @param id
 * @param state
 * @param broadcast socket to broadcast changes to, true for all sockets
 */
var setLightState = function(id, state, broadcast) {

    makeApiCall(function(api) {
        var i;

        if(typeof(app.state.lights[id]) === 'undefined') {
            return;
        }

        cleanClientState(state);

        // deactivate colorloop when changing colors
        if(app.state.lights[id].state.effect === 'colorloop' && state.effect !== 'colorloop' && (typeof(state.hue) !== 'undefined' || typeof(state.sat) !== 'undefined' || typeof(state.ct) !== 'undefined')) {
            api.setLightState(id, {
                effect: 'none'
            });
            state.effect = 'none';
        }

        api.setLightState(id, state);

        for(i in state) {
            if(state.hasOwnProperty(i) && i !== 'transitiontime') {
                app.state.lights[id].state[i] = state[i];
            }
        }

        setColorMode(state, app.state.lights[id].state);

        broadcastChanges(broadcast, ['lights.' + id + '.state']);
    });

};

/**
 * modify state of all lights
 * @param state
 * @param broadcast socket to broadcast changes to, true for all sockets
 */
var setLightStateAll = function(state, broadcast) {

    makeApiCall(function(api) {
        var areas = [],
            i, j;

        cleanClientState(state);

        // deactivate colorloop when changing colors
        if(state.effect !== 'colorloop' && (typeof(state.hue) !== 'undefined' || typeof(state.sat) !== 'undefined' || typeof(state.ct) !== 'undefined')) {
            for(i in app.state.lights) {
                if(app.state.lights.hasOwnProperty(i) && app.state.lights[i].state.reachable && app.state.lights[i].state.effect === 'colorloop') {
                    api.setGroupLightState(0, {
                        effect: 'none'
                    });
                    state.effect = 'none';
                    break;
                }
            }
        }

        api.setGroupLightState(0, state);

        for(i in app.state.lights) {
            if(app.state.lights.hasOwnProperty(i) && app.state.lights[i].state.reachable) {
                for(j in state) {
                    if(state.hasOwnProperty(j) && j !== 'transitiontime') {
                        app.state.lights[i].state[j] = state[j];
                    }
                }

                setColorMode(state, app.state.lights[i].state);

                areas.push('lights.' + i + '.state');
            }
        }

        // set state for all groups
        for(i in app.state.groups) {
            if(app.state.groups.hasOwnProperty(i)) {

                for(j in state) {
                    if(state.hasOwnProperty(j) && j !== 'transitiontime') {
                        app.state.groups[i].action[j] = state[j];
                    }
                }

                areas.push('groups.' + i + '.action');
            }
        }

        broadcastChanges(broadcast, areas);
    });

};

/**
 * modify group light state
 * @param id
 * @param state
 * @param broadcast socket to broadcast changes to, true for all sockets
 */
var setGroupLightState = function(id, state, broadcast) {

    makeApiCall(function(api) {
        var areas = ['groups.' + id + '.action'],
            i, j;

        if(typeof(app.state.groups[id]) === 'undefined') {
            return;
        }

        cleanClientState(state);

        // deactivate colorloop when changing colors
        if(state.effect !== 'colorloop' && (typeof(state.hue) !== 'undefined' || typeof(state.sat) !== 'undefined' || typeof(state.ct) !== 'undefined')) {
            for(i = 0; i < app.state.groups[id].lights.length; i++) {
                if(app.state.lights[app.state.groups[id].lights[i]].state.reachable && app.state.lights[app.state.groups[id].lights[i]].state.effect === 'colorloop') {
                    api.setGroupLightState(id, {
                        effect: 'none'
                    });
                    state.effect = 'none';
                    break;
                }
            }
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

        setColorMode(state, app.state.groups[id].action);

        // change lights state

        for(i = 0; i < app.state.groups[id].lights.length; i++) {
            for(j in state) {
                if(state.hasOwnProperty(j) && j !== 'transitiontime') {
                    app.state.lights[app.state.groups[id].lights[i]].state[j] = state[j];
                }
            }

            setColorMode(state, app.state.lights[app.state.groups[id].lights[i]].state);

            areas.push('lights.' + app.state.groups[id].lights[i] + '.state');
        }

        broadcastChanges(broadcast, areas);
    });

};

/**
 * Change colormode and remove other color mode values based on state changes
 * @param {object} state state changes
 * @param {object} lightState current state of the light where the colormode change has to be applied
 */
var setColorMode = function(state, lightState) {

    // ct: remove hue/sat
    if(typeof(state.ct) !== 'undefined') {
        lightState.colormode = 'ct';

        delete lightState.hue;
        delete lightState.sat;
    }
    // hue/sat: remove ct
    else if(typeof(state.hue) !== 'undefined' || typeof(state.sat) !== 'undefined') {
        lightState.colormode = 'hs';

        delete lightState.ct;

        // fill in dummies for missing values
        if(typeof(lightState.hue) === 'undefined') {
            lightState.hue = 0;
        }
        if(typeof(lightState.sat) === 'undefined') {
            lightState.sat = 254;
        }
    }

};

/**
 * Custom call to Hue bridge REST API
 * @param {string} path path after username, beginning with /
 * @param {string} method HTTP method
 * @param {object} body [optional]
 * @param {function} callback [optional]
 */
var customApiCall = function(path, method, body, callback) {

    makeApiCall(function(api) {
        var http = require('http'),
            options,
            request;

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
    });

};

/**
 * Hue Api call wrapper to ensure execution only when connection to Hue bridge is established
 * @param {function} callback gets node-hue-api as argument
 */
var makeApiCall = function(callback) {

    if(app.state.connect.hue && app.state.connect.hueRegistered) {

        // reset refresh timeout on incoming API calls to prevent receiving transitioning values
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(refreshState, 10000);


        try {
            callback(api);
        }
        catch(e) {
            errorHandler(e);
        }
    }
    else {
        waitingApiCalls.push(callback);

        // limit number of waiting calls
        if(waitingApiCalls.length > 10) {
            waitingApiCalls = waitingApiCalls.slice(-10);
        }
    }

};

/**
 * Execute callbacks given to makeApiCall() when there was no connection to the Hue bridge
 */
var executeWaitingApiCalls = function() {
    var i;

    console.log('[hue] Executing ' + waitingApiCalls.length + ' waiting Hue API calls');

    for(i = 0; i < waitingApiCalls.length; i++) {
        try {
            waitingApiCalls[i](api);
        }
        catch(e) {
            errorHandler(e);
        }
    }

    waitingApiCalls = [];
};


module.exports = function(globalApp) {
	
	app = globalApp;

    app.events.on('ready', function() {
        init();
    });


    return {
        makeApiCall: makeApiCall,
		setLightState: setLightState,
        setLightStateAll: setLightStateAll,
        setGroupLightState: setGroupLightState,
        customApiCall: customApiCall
	};

};
