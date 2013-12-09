var module = angular.module('hueApp', []);

module.factory('socket', function ($rootScope) {
    var socket = io.connect('/');
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});

module.controller('MainCtrl', ['$scope', 'socket', function($scope, socket) {

    //
    // local data model
    //
    $scope.state = {
        lights: {},
        groups: {},
        scenes: []
    };

    //
    // event handlers
    //

    // refresh state

    socket.on('state', function(data) {
        var i, j, statePart, path;

        for(i in data) {
            if(i === '') {
                $scope.state = data[i];
            }
            else {
                path = i.split('.');
                statePart = $scope.state;

                for(j = 0; j < path.length-1; j++) {
                    statePart = statePart[path[j]];
                }

                statePart[path[path.length-1]] = data[i];
            }
        }
    });

    //
    // methods
    //

    // light control

    $scope.lights = {

        state: function(id, key, value) {
            var data = {
                id: id,
                state: {}
            };
            
            data.state[key] = value;
            
            socket.emit('light.state', data);
        }
    
    };

    // scene control
    // TODO dummy

    $scope.scenes = {

        save: function() {

            socket.emit('scene.save', {
                name: "meine Scene",
                lights: [
                    {
                        light: 1,
                        state: {
                            on: true,
                            bri: 85,
                            hue: 1,
                            sat: 255
                        }
                    }
                ]
            });
        },

        remove: function(id) {
            socket.emit('scene.remove', id);
        }

    };
    
}]);
