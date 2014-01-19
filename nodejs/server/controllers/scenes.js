var helpers	    = require('../helpers'),
    mongoose =  require('mongoose'),
    Scene =  mongoose.model('Scene'),
    app;


var init = function() {

    helpers.initCrudTemplate(
        app,
        Scene,
        'scenes',
        'scene',
        'scene'
    );

    app.controllers.socket.addSocketListener(socketListeners);

};


var socketListeners = function(socket) {

    // apply scene
    socket.on('scene.apply', function(id) {
        var scene, i;

        if(typeof(app.state.scenes[id]) === 'undefined') {
            return;
        }

        scene = app.state.scenes[id];

        console.log('[scenes] Apply scene ' + id);

        for(i = 0; i < scene.lights.length; i++) {

            // filter out nonexistant or unreachable lights
            if(typeof(app.state.lights[scene.lights[i].light]) === 'undefined'
                || !app.state.lights[scene.lights[i].light].state.reachable) {
                continue;
            }

            app.controllers.hue.setLightState(scene.lights[i].light, scene.lights[i].state, false);

        }

        app.controllers.socket.refreshState(
            app.controllers.socket.getBroadcastSocket(socket),
            ['lights']
        );

    });

};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.once('ready', function() {
        init();
    });

};
