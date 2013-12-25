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

    // state management

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

    socket.on('state.delete', function(data) {
        var i, j, el, statePart, path;

        for(i = 0; i < data.length; i++) {
            el = data[i];

            path = el.split('.');
            statePart = $scope.state;

            for(j = 0; j < path.length-1; j++) {
                statePart = statePart[path[j]];
            }

            delete statePart[path[path.length-1]];
        }
    });

    //
    // methods
    //

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

    // light control

    $scope.lights = {

        /**
         * Change state attributes of a light
         * @param {integer} id 0 for all lights
         * @param {object} state
         */
        state: function(id, state) {
            socket.emit('light.state', {
                id: id,
                state: state
            });
        },

        /**
         * Change single state attribute of a light
         * @param id
         * @param key
         * @param val
         */
        stateAttribute: function(id, key, val) {
            var state = {};
            state[key] = val;

            $scope.lights.state(id, state);
        },

        /**
         * Change state attributes of all lights
         * @param {object} state
         */
        stateAll: function(state) {
            $scope.lights.state(0, state);
        },

        /**
         * Search for new lights
         */
        search: function() {
            socket.emit('light.search', true);
        },

        /**
         * Rename a light
         * @param id
         * @param name
         */
        setName: function(id, name) {
            socket.emit('light.name', {
                id: id,
                name: name
            });
        }
    
    };

    // group control

    $scope.groups = {

        // placeholder for form data
        forms: {

            // create group form
            create: {
                name: '',
                lights: []
            }
        },

        /**
         * change state for group
         * @param id
         * @param {array} state
         */
        state: function(id, state) {
            socket.emit('group.state', {
                id: id,
                state: state
            });
        },

        /**
         * Create new group and reset create form
         * @param name
         * @param {array} lights IDs as integers!
         */
        create: function(name, lights) {

            socket.emit('group.create', {
                name: name,
                lights: lights
            });

            // reset form
            $scope.groups.forms.create.name = '';
            $scope.groups.forms.create.lights = [];
        },

        /**
         * update group
         * @param id
         * @param name
         * @param {array} lights IDs as strings!
         */
        update: function(id, name, lights) {
            socket.emit('group.update', {
                id: id,
                name: name,
                lights: lights
            });
        },

        /**
         * delete group
         * @param id
         */
        remove: function(id) {
            socket.emit('group.remove', id);
            delete $scope.state.groups[id];
        }

    };

    // helper functions
    // checkbox list to array conversion

    $scope.helpers = {

        /**
         * toggle add/remove element to array
         * @param arr
         * @param el
         * @param {boolean} numeric convert element to integer
         */
        toggleList: function(arr, el, numeric) {

            if(numeric) {
                el = parseInt(el);
            }

            if(arr.indexOf(el) === -1) {
                arr.push(el);
            }
            else {
                arr.splice(arr.indexOf(el), 1);
            }
        },

        /**
         * Check if array contains element
         * @param arr
         * @param el
         * @param {boolean} numeric convert element to integer
         * @returns {boolean}
         */
        listChecked: function(arr, el, numeric) {

            if(numeric) {
                el = parseInt(el);
            }

            return (arr.indexOf(el) !== -1);
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
