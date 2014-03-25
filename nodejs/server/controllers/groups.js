﻿var app;

var init = function() {
    app.controllers.socket.addSocketListener(socketListeners);
};


var socketListeners = function(socket) {

    // change group state
    socket.on('group.state', function(data) {
        console.log('[groups] Change group state: ', data);

        app.controllers.hue.setGroupLightState(
            data.id,
            data.state,
            app.controllers.socket.getBroadcastSocket(socket)
        );
    });

    // create group
    socket.on('group.create', function(data) {
        console.log('[groups] Create group: ', data);

        // prevent creating empty group as it would result in an API error
        if(!data.lights || !data.lights.length) {
            console.log('[groups] Tried to create empty group. Aborting...');
            return;
        }

        app.controllers.hue.makeApiCall(function(api) {
            api.createGroup(data.name, data.lights)
                .then(function(result) {

                    // convert lights to strings for representation
                    // createGroup() function needs integers!

                    var i;

                    for(i = 0; i < data.lights.length; i++) {
                        data.lights[i] = data.lights[i] + "";
                    }

                    app.state.groups[result.id] = data;
                    app.controllers.socket.refreshState(
                        false,
                        ['groups.' + result.id]
                    );
                })
                .fail(app.controllers.hue.errorHandler)
                .done();
        });
    });

    // update group
    socket.on('group.update', function(data) {
        console.log('[groups] Update group: ', data);

        if(typeof(app.state.groups[data.id]) === 'undefined') {
            console.log('group does not exist!');
            return;
        }

        // first update name, then update lights
        // same function in node-hue-api!

        app.controllers.hue.makeApiCall(function(api) {
            api.updateGroup(data.id, data.name)
                .then(function() {

                    api.updateGroup(data.id, data.lights)
                        .then(function() {

                            app.state.groups[data.id] = {
                                name: data.name,
                                lights: data.lights
                            };

                            app.controllers.socket.refreshState(
                                app.controllers.socket.getBroadcastSocket(socket),
                                ['groups.' + data.id]
                            );
                        })
                        .fail(app.controllers.hue.errorHandler)
                        .done();

                })
                .fail(app.controllers.hue.errorHandler)
                .done();
        });
    });

    // remove group
    socket.on('group.remove', function(id) {
        console.log('[groups] Remove group ' + id);

        app.controllers.hue.makeApiCall(function(api) {
            api.deleteGroup(id);
        });

        delete app.state.groups[id];
        app.controllers.socket.deleteFromState(
            app.controllers.socket.getBroadcastSocket(socket),
            ['groups.' + id]
        );
    });

};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });

};
