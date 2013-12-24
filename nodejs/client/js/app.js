var module = angular.module('hueApp', []),
    scope;

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

    // TODO remove
    scope = $scope;

    //
    // local data model
    //
    $scope.state = {
        user: {
            loginPromptReceived: false,
            loginRequired: false,
            loginWaiting: false,
            login: false,
            loginError: false
        },

        socket: {
            connected: false,
            wasConnected: false
        },

        lights: {},
        groups: {},
        scenes: []
    };

    //
    // event handlers
    //

    // socket connection and errors

    socket.on('connect', function() {
        $scope.state.socket.connected = true;
        $scope.state.socket.wasConnected = true;
    });

    socket.on('disconnect', function() {
        $scope.state.socket.connected = false;
    });

    // user login control

    socket.on('login.required', function(required) {
        $scope.state.user.loginPromptReceived = true;
        $scope.state.user.loginRequired = required;
        $scope.state.user.login = !required;

        if(required && localStorage.huePassword !== undefined) {
            $scope.user.password = localStorage.huePassword;
            $scope.user.login();
        }
    });

    socket.on('login', function(login) {
        $scope.state.user.login = login;
        $scope.state.user.loginError = !login;
        $scope.state.user.loginWaiting = false;

        // persist password
        if(login) {
            localStorage.huePassword = $scope.user.password;
        }
    });

    // refresh state

    socket.on('state', function(data) {
        var i, j, statePart, path;

        for(i in data) {
            if(data.hasOwnProperty(i)) {
                if(i === '') {
                    for(j in data[i]) {
                        if(data[i].hasOwnProperty(j)) {
                            $scope.state[j] = data[i][j];
                        }
                    }
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

    // user and login control

    $scope.user = {

        password: '',

        login: function() {
            $scope.state.user.loginWaiting = true;
            $scope.state.user.loginError = false;
            socket.emit('login', {
                password: $scope.user.password
            });
        },

        logout: function() {
            localStorage.removeItem('huePassword');
            window.location.reload();
        }

    };

    // scene control
    // TODO dummy

    /*
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
    */
}]);
