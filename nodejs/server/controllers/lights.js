var app;

var socketListeners = function(socket) {

    // change light state
    socket.on('light.state', function(data) {
        var areas = [],
            i, j;

        console.log('change light state for ' + data.id, data.state);

        // change all lights
        if(data.id == 0) {

            // in hue api all lights are controlled through default group 0
            app.controllers.hue.getApi().setGroupLightState(0, data.state);

            for(i in app.state.lights) {
                if(app.state.lights.hasOwnProperty(i)) {

                    for(j in data.state) {
                        if(data.state.hasOwnProperty(j)) {
                            app.state.lights[i].state[j] = data.state[j];
                        }
                    }

                    areas.push('lights.' + i + '.state');
                }
            }

            app.controllers.socket.refreshState(false, areas);

        }

        // change single light
        else {
            app.controllers.hue.setLightState(data.id, data.state);
            app.controllers.socket.refreshState(app.controllers.socket.getBroadcastSocket(socket), ['lights.' + data.id + '.state']);
        }
    });

    // search for new lights
    socket.on('light.search', function() {
        console.log('Search for new lights initiated');
        app.controllers.hue.getApi().searchForNewLights();
    });

    // rename light
    socket.on('light.name', function(data) {
        console.log('renaming light ' + data.id + ' to ' + data.name);
        app.controllers.hue.getApi().setLightName(data.id, data.name);
        app.state.lights[data.id].name = data.name;
        app.controllers.socket.refreshState(app.controllers.socket.getBroadcastSocket(socket), ['lights.' + data.id + '.name']);
    });

};

module.exports = function(globalApp) {

    app = globalApp;

    app.controllers.socket.addSocketListener(socketListeners);

};
