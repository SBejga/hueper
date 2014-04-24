var app;

var init = function() {
    app.controllers.socket.addSocketListener(socketListeners);
};


var socketListeners = function(socket) {

    // change light state
    socket.on('light.state', function(data) {
        console.log('[lights] Change light state for ' + data.id, data.state);

        app.controllers.hue.setLightState(
            data.id,
            data.state,
            app.controllers.socket.getOtherSockets(socket)
        );
    });

    // change state of all lights
    socket.on('light.stateAll', function(data) {
        console.log('[lights] Change state of all lights: ', data);

        app.controllers.hue.setLightStateAll(
            data,
            app.controllers.socket.getOtherSockets(socket)
        );
    });

    // search for new lights
    socket.on('light.search', function() {
        console.log('[lights] Search for new lights initiated');

        app.controllers.hue.makeApiCall(function(api) {
            api.searchForNewLights();
        });
    });

    // rename light
    socket.on('light.name', function(data) {
        console.log('[lights] Renaming light ' + data.id + ' to ' + data.name);

        app.controllers.hue.makeApiCall(function(api) {
            api.setLightName(data.id, data.name);
        });

        app.state.lights[data.id].name = data.name;

        app.controllers.socket.refreshStateOfOthers(
            socket,
            ['lights.' + data.id + '.name']
        );
    });

};

module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });

};
