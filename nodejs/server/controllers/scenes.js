var helpers	    = require('../helpers'),
    mongoose =  require('mongoose'),
    Scene =  mongoose.model('Scene'),
    app;

var socketListeners = function(socket) {

    // create scene
    socket.on('scene.create', function(data) {
        console.log('[scenes] Create new scene: ', data);

        new Scene(data).save(function(err, scene) {
            if(err) {
                console.log('[scenes] Mongoose error: ', err);
                return;
            }

            var id = scene['_id'];
            app.state.scenes[id] = scene;
            app.controllers.socket.refreshState(
                false,
                ['scenes.' + id]
            );
        });
    });

    // update scene
    socket.on('scene.update', function(data) {
        var id = data['_id'];

        helpers.cleanMongooseProperties(data);

        console.log('[scenes] Update scene ' + id);

        Scene.findByIdAndUpdate(id, data, function(err, scene) {
            if(err) {
                console.log('[scenes] Mongoose error: ', err);

                // revert client to original state
                app.controllers.socket.refreshState(
                    socket,
                    ['scenes.' + id]
                );

                return;
            }

            app.state.scenes[id] = scene;
            app.controllers.socket.refreshState(
                app.controllers.socket.getBroadcastSocket(socket),
                ['scenes.' + id]
            );
        });

    });

    // delete scene
    socket.on('scene.delete', function(id) {
        console.log('[scenes] Delete scene ' + id);

        Scene.findByIdAndRemove(id).exec();

        delete app.state.scenes[id];
        app.controllers.socket.deleteFromState(
            app.controllers.socket.getBroadcastSocket(socket),
            ['scenes.' + id]
        );
    });

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

            app.controllers.hue.setLightState(scene.lights[i].light, scene.lights[i].state);

        }

        app.controllers.socket.refreshState(
            app.controllers.socket.getBroadcastSocket(socket),
            ['lights']
        );

    });

};

module.exports = function(globalApp) {

    app = globalApp;

    app.controllers.socket.addSocketListener(socketListeners);

};
