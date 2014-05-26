var helpers     = require('../helpers'),
    mongoose    = require('mongoose'),
    Scene       = mongoose.model('Scene'),

    model,
    app;


var init = function() {

    model = helpers.initCrudTemplate(
        app,
        Scene,
        'scenes',
        'scene'
    );

    model.on('delete', function(id, scene) {

        app.controllers.automation.removeSubEntries(
            false,
            function(condition) {
                return (condition.type === 'state' && condition.value.type === 'scene' && condition.value.id === id);
            },
            function(action) {
                return (action.type === 'scene' && action.value.id === id);
            }
        );

    });

    app.controllers.socket.addSocketListener(socketListeners);

};


var socketListeners = function(socket) {

    // apply scene
    socket.on('scene.apply', function(id) {
        applyScene(id, undefined, socket);
    });

};

/**
 * apply scene
 * @param id
 * @param transition
 * @param socket false for broadcast
 */
var applyScene = function(id, transition, socket) {
    var scene, i;

    if(typeof(app.state.scenes[id]) === 'undefined') {
        return;
    }

    if(typeof(transition) === 'undefined' || transition === null || transition === false) {
        transition = app.state.appConfig.transition;
    }

    scene = helpers.copy(app.state.scenes[id]);

    console.log('[scenes] Apply scene ' + id);

    for(i = 0; i < scene.lights.length; i++) {

        // filter out nonexistant or unreachable lights
        if(typeof(app.state.lights[scene.lights[i].light]) === 'undefined'
            || !app.state.lights[scene.lights[i].light].state.reachable) {
            continue;
        }

        scene.lights[i].state.transitiontime = transition;

        app.controllers.hue.setLightState(scene.lights[i].light, scene.lights[i].state, false);

    }

    if(socket) {
        app.controllers.socket.refreshStateOfOthers(
            socket,
            ['lights']
        );
    }
    else {
        app.controllers.socket.refreshState(
            false,
            ['lights']
        );
    }

};



module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });


    return {
        applyScene: applyScene
    };

};
