/*
 * Light controller
 */

var app;

var socketListeners = function(socket) {

    // change light state

    socket.on('light.state', function(data) {
        app.controllers.hue.setLightState(data);
        app.controllers.socket.refreshState(socket.broadcast, ['lights.' + data.id + '.state']);
    });

};

module.exports = function(globalApp) {

    app = globalApp;

    app.controllers.socket.addSocketListener(socketListeners);

};