var hue		= require('node-hue-api')
	helpers	= require('./helpers');

var app,
	api;

/**
 * Error Handler for the Hue API connection
 * schedules new search
 */
var errorHandler = function(err) {
	
	console.log('Hue error', err);
	console.log('retry in 10 seconds');
	
	// TODO emit error on socket, write in state
	
	app.state.connect.hue = false;
	
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
	
	// TODO register at bridge
	// TODO use config user / save in MongoDB
	
	api = new hue.HueApi(data[0].ipaddress, "testmichael");
	
	app.state.connect.hue = true;
	
	refreshState(true);
};

var refreshState = function(refreshConnect) {
	
	console.log('refreshing hue state');
	
	api.getFullState()
		.then(function(data) {
			var areas = [];
			
			if(!helpers.equals(data.lights, app.state.lights)) {
				areas.push('lights');
				app.state.lights = data.lights;
			}
			if(!helpers.equals(data.groups, app.state.groups)) {
				areas.push('groups');
				app.state.groups = data.groups;
			}
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



//
// Exported functions
//

var setLightState = function(data) {
	
	for(var i in data.state) {
		app.state.lights[data.id].state[i] = data.state[i];
	}
	
	api.setLightState(data.id, data.state);
};


module.exports = function(globalApp) {
	
	app = globalApp;
	
	findBridge();
	
	return {
		setLightState: setLightState
	};
};