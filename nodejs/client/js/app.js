var module = angular.module('hueApp', []),
    scope;

/*
 * Services
 */

/**
 * Socket.IO service
 */
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

/*
 * Filters
 */

/**
 * Filter for associative Array-like Objects
 * usage:
 * - filterObj:<value>
 * 		find the value recursively in any of the childrens' properties (case insensitive)
 * - filterObj:{ <string:path>: <value>, ... }
 * 		find the values recursively inside the given paths
 * 		example: filterObj:{'user.name': 'Michael', 'title': 'test'}
 * - filterObj:<...>:true
 * 		property has to match completely (case sensitive)
 */
module.filter('filterObj', function() {
    return function(list, filter, strict) {
        var result = {};

        if(filter === undefined || filter === '') {
            return list;
        }

        var searchObject = function(obj, search) {
            var i;

            // recursive object search
            if(angular.isObject(obj)) {
                for(i in obj) {
                    if(obj.hasOwnProperty(i)) {
                        if(searchObject(obj[i], search)) {
                            return true;
                        }
                    }
                }
            }
            // recursive array search
            else if(angular.isArray(obj)) {
                i = obj.length;

                while(i--) {
                    if(searchObject(obj[i], search)) {
                        return true;
                    }
                }
            }
            // functions cannot be compared
            else if(angular.isFunction(obj)) {
                return false;
            }
            // partial comparison
            else if(obj !== undefined && obj.indexOf !== undefined && !strict) {
                return (obj.toLowerCase().indexOf(search.toLowerCase()) > -1);
            }
            // complete comparison
            else {
                return (obj === search);
            }

            return false;
        };


        angular.forEach(list, function(obj, key) {
            var i, len, objPart, pathString, path;

            try {
                // multiple search filters based on object property paths
                if(angular.isObject(filter)) {
                    for(pathString in filter) {
                        if(filter.hasOwnProperty(pathString)) {
                            path = pathString.split('.');
                            len = path.length;
                            objPart = obj;

                            for(i = 0; i < len; i++) {
                                objPart = objPart[path[i]];
                            }

                            if(!searchObject(objPart, filter[pathString])) {
                                return;
                            }
                        }
                    }
                }
                // simple recursive search through all properties
                else {
                    if(!searchObject(obj, filter)) {
                        return;
                    }
                }
            }
            // catch errors caused by invalid object paths
            catch(e) {
                return;
            }

            // add object to result
            result[key] = obj;
        });

        return result;
    };
});

/*
 * Controllers
 */

module.controller('MainCtrl', ['$scope', 'socket', '$timeout', function($scope, socket, $timeout) {

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
            wasConnected: false,
            connectionFailed: false
        },

        connect: {},
        config: {},
        appConfig: {},
        lights: {},
        groups: {},
        sensors: {},
        favorites: {},
        scenes: {},
        automation: {},
        rfid: {},
        rfidUnknown: [],
        devices: {}
    };

    $scope.notifications = [];

    $scope.clientConfig = {
        notificationTimeout: 5000
    };

    $scope.client = {
        address: false  // MAC address of the client's device
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

    socket.on('connect_failed', function() {
        $scope.state.socket.connectionFailed = true;
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

    // notification / error message handler
    socket.on('notification', function(notification) {
        $scope.notifications.push(notification);

        $timeout(function() {
            $scope.notifications.shift();
        }, $scope.clientConfig.notificationTimeout);
    });

    // login attempt answer
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

    // configuration

    // password change answer
    socket.on('config.password', function(data) {
        var form = $scope.config.forms.password;

        // error
        if(data === false) {
            form.error = true;
        }
        else {
            form.error = false;
            form.success = true;
            form.oldPassword = '';
            form.newPassword = '';

            if(data.password === null) {
                localStorage.removeItem('huePassword');
            }
            else {
                localStorage.huePassword = data.password;
            }
        }
    });

    // get client MAC address
    socket.on('device.address', function(address) {
        $scope.client.address = address;
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

    // bridge configuration control

    $scope.config = {

        // container for form data
        forms: {
            // change password
            password: {
                oldPassword: '',
                newPassword: '',
                error: false,
                success: false
            }
        },

        /**
         * Delete user from Hue bridge
         * @param {string} id
         */
        deleteUser: function(id) {
            socket.emit('config.deleteUser', {
                id: id
            });
            delete $scope.state.config.whitelist[id];
        },

        /**
         * programmatically press link button on the Hue bridge
         */
        pressLinkButton: function() {
            socket.emit('config.pressLinkButton', true);
            $scope.state.config.linkbutton = true;
        },

        /**
         * change application password
         * @param {string} oldPassword
         * @param {string} newPassword
         */
        changePassword: function(oldPassword, newPassword) {
            socket.emit('config.password', {
                oldPassword: oldPassword,
                newPassword: newPassword
            });
            $scope.config.forms.password.error = false;
            $scope.config.forms.password.success = false;
        },

        /**
         * change application configuration
         * @param {object} data
         */
        change: function(data) {
            socket.emit('config.change', data);
        },

        /**
         * Apply Hue bridge firmware update
         */
        updateFirmware: function() {
            socket.emit('config.firmware', true);
            $scope.state.config.swupdate.updatestate = 3;
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
            var i;

            if(typeof($scope.state.lights[id]) === 'undefined') {
                return;
            }

            socket.emit('light.state', {
                id: id,
                state: state
            });

            for(i in state) {
                if(state.hasOwnProperty(i) && i !== 'transitiontime') {
                    $scope.state.lights[id].state[i] = state[i];
                }
            }

            // turn on when changing other properties
            if(typeof(state.on) === 'undefined') {
                $scope.state.lights[id].state.on = true;
            }

            // change colormode
            $scope.helpers.setColorMode(state, $scope.state.lights[id].state);
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
            var i, j;

            socket.emit('light.stateAll', state);

            for(i in $scope.state.lights) {
                if($scope.state.lights.hasOwnProperty(i) && $scope.state.lights[i].state.reachable) {
                    for(j in state) {
                        if(state.hasOwnProperty(j) && j !== 'transitiontime') {
                            $scope.state.lights[i].state[j] = state[j];
                        }
                    }

                    // turn on when changing other properties
                    if(typeof(state.on) === 'undefined') {
                        $scope.state.lights[i].state.on = true;
                    }

                    // change colormode
                    $scope.helpers.setColorMode(state, $scope.state.lights[i].state);
                }
            }
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

            if(typeof($scope.state.lights[id]) == 'undefined') {
                return;
            }

            socket.emit('light.name', {
                id: id,
                name: name
            });

            $scope.state.lights[id].name = name;
        },

        /**
         *
         *
         * @param id of the specified light
         */

        getGroups: function(id){

            var groupsOfLamp = [];

            id = id.toString();
            angular.forEach($scope.state.groups, function(value, key){
                if(value.lights.indexOf(id) > -1){
                    groupsOfLamp.push(key);
                }
            });
            return groupsOfLamp;
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
            var i, j;

            if(typeof($scope.state.groups[id]) == 'undefined') {
                return;
            }

            socket.emit('group.state', {
                id: id,
                state: state
            });

            // change group state

            if(typeof($scope.state.groups[id].action) === 'undefined') {
                $scope.state.groups[id].action = {};
            }

            for(j in state) {
                if(state.hasOwnProperty(j) && j !== 'transitiontime') {
                    $scope.state.groups[id].action[j] = state[j];
                }
            }

            // change group action colormode
            $scope.helpers.setColorMode(state, $scope.state.groups[id].action);

            // change lights state

            for(i = 0; i < $scope.state.groups[id].lights.length; i++) {
                for(j in state) {
                    if(state.hasOwnProperty(j) && j !== 'transitiontime') {
                        $scope.state.lights[$scope.state.groups[id].lights[i]].state[j] = state[j];
                    }
                }

                // turn light on when changing other properties
                if(typeof(state.on) === 'undefined') {
                    $scope.state.lights[$scope.state.groups[id].lights[i]].state.on = true;
                }

                // change light colormode
                $scope.helpers.setColorMode(state, $scope.state.lights[$scope.state.groups[id].lights[i]].state);
            }
        },

        /**
         * Create new group and reset create form
         * @param {object} group light IDs as integers!
         */
        create: function(group) {
            socket.emit('group.create', group);

            // reset form
            $scope.groups.forms.create.name = '';
            $scope.groups.forms.create.lights = [];
        },

        /**
         * update group
         * @param id
         * @param {object} group light IDs as strings!
         */
        update: function(id, group) {
            socket.emit('group.update', {
                id: id,
                name: group.name,
                lights: group.lights
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

    // favorite control

    $scope.favorites = {

        // placeholder for form data
        forms: {
            create: {
                name: '',
                state: {
                    isOn: true
                }
            }
        },

        create: function(favorite) {
            socket.emit('favorite.create', favorite);
            $scope.favorites.forms.create.name = '';
            $scope.favorites.forms.create.state = {
                isOn: true
            };
        },

        update: function(favorite) {
            socket.emit('favorite.update', favorite);
        },

        remove: function(id) {
            socket.emit('favorite.delete', id);
            delete $scope.state.favorites[id];
        }

    };

    // scene control

    $scope.scenes = {

        // placeholder for form data
        forms: {
            create: {
                name: '',
                lights: []
            }
        },

        create: function(scene) {
            socket.emit('scene.create', scene);
            $scope.scenes.forms.create.name = '';
            $scope.scenes.forms.create.lights = [];
        },

        update: function(scene) {
            socket.emit('scene.update', scene);
        },

        remove: function(id) {
            socket.emit('scene.delete', id);
            delete $scope.state.scenes[id];
        },

        /**
         * Apply scene and change light state accordingly
         * @param id
         */
        apply: function(id) {
            var scene = $scope.state.scenes[id],
                i, j, k;

            if(typeof($scope.state.scenes[id]) === 'undefined') {
                return;
            }

            socket.emit('scene.apply', id);

            for(i = 0; i < scene.lights.length; i++) {

                // filter out nonexistant or unreachable lights
                if(typeof($scope.state.lights[scene.lights[i].light]) === 'undefined'
                        || !$scope.state.lights[scene.lights[i].light].state.reachable) {
                    continue;
                }

                for(j in scene.lights[i].state) {
                    if(scene.lights[i].state.hasOwnProperty(j)) {

                        // rename isOn to on
                        k = (j === 'isOn') ? 'on' : j;

                        $scope.state.lights[scene.lights[i].light].state[k] = scene.lights[i].state[j];
                    }
                }

                // turn light on when changing other properties
                if(typeof(scene.lights[i].state.on) === 'undefined') {
                    $scope.state.lights[scene.lights[i].light].state.on = true;
                }

                // change colormode
                if(typeof(scene.lights[i].state.ct) !== 'undefined') {
                    $scope.state.lights[scene.lights[i].light].colormode = 'ct';
                }
                else if(typeof(scene.lights[i].state.hs) !== 'undefined') {
                    $scope.state.lights[scene.lights[i].light].colormode = 'hs';
                }

            }

        },

        /**
         * Add light to scene
         * @param scene
         * @param id
         */
        addLight: function(scene, id) {
            var i;

            // check if scene already contains this light
            for(i in scene.lights) {
                if(scene.lights.hasOwnProperty(i) && scene.lights[i].light == id) {
                    return;
                }
            }

            scene.lights.push({
                light: id,
                state: {
                    isOn: true
                }
            });
        },

        /**
         * Remove light from scene
         * @param scene
         * @param id
         */
        removeLight: function(scene, id) {
            var i;

            // check if scene already contains this light
            for(i in scene.lights) {
                if(scene.lights.hasOwnProperty(i) && scene.lights[i].light == id) {
                    scene.lights.splice(i, 1);
                    return;
                }
            }
        },

        /**
         * Filter global state.lights object to the lights not contained in the parameter scene.lights array
         * @param {array} lights { light: ..., state: { ... } }
         * @returns {object}
         */
        filterUnused: function(lights) {
            var i,
                result = {};

            var contained = function(id) {
                var i;

                for(i = 0; i < lights.length; i++) {
                    if(lights[i].light == id) {
                        return true;
                    }
                }

                return false;
            };

            for(i in $scope.state.lights) {
                if($scope.state.lights.hasOwnProperty(i) && !contained(i)) {
                    result[i] = $scope.state.lights[i];
                }
            }

            return result;
        }

    };

    // automation control

    $scope.automation = {

        // placeholder for form data
        forms: {
            create: {
                name: '',
                triggers: [],
                conditions: [],
                allConditionsNeeded: true,
                actions: [],
                active: true
            }
        },

        create: function(automation) {
            socket.emit('automation.create', automation);

            $scope.automation.forms.create = {
                name: '',
                triggers: [],
                conditions: [],
                allConditionsNeeded: true,
                actions: [],
                active: true
            };
        },

        update: function(automation) {
            socket.emit('automation.update', automation);
        },

        remove: function(id) {
            socket.emit('automation.delete', id);
            delete $scope.state.automation[id];
        },

        resetTriggerValue: function(t) {
            t.value = undefined;
        },

        resetConditionValue: function(t) {
            if(t.type === 'weekdays') {
                t.value = [];
            }
            else if(t.type === 'state') {
                t.value = {
                    state: {}
                };
            }
            else {
                t.value = undefined;
            }
        },

        resetActionValue: function(t) {
            if(t.type === 'custom') {
                t.value = '';
            }
            else if(t.type === 'cancelDelay') {
                t.value = undefined;
            }
            else {
                t.value = { state: {} }
            }
        }

    };

    // rfid/nfc tags

    $scope.rfid = {

        create: function(rfid) {
            socket.emit('rfid.create', rfid);
        },

        update: function(rfid) {
            socket.emit('rfid.update', rfid);
        },

        remove: function(id) {
            socket.emit('rfid.delete', id);
            delete $scope.state.rfid[id];
        }

    };

    // network devices

    $scope.devices = {

        create: function(device) {
            socket.emit('device.create', device);
        },

        update: function(device) {
            socket.emit('device.update', device);
        },

        remove: function(id) {
            socket.emit('device.delete', id);
            delete $scope.state.devices[id];
        },

        isOwnRegistered: function() {
            var i;

            if(!$scope.client.address) {
                return undefined;
            }

            for(i in $scope.state.devices) {
                if($scope.state.devices.hasOwnProperty(i)) {
                    if($scope.state.devices[i].address === $scope.client.address) {
                        return true;
                    }
                }
            }

            return false;
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

            if(arr === undefined) {
                arr = [];
            }

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

            if(arr === undefined) {
                arr = [];
            }

            if(numeric) {
                el = parseInt(el);
            }

            return (arr.indexOf(el) !== -1);
        },

        setColorMode: function(state, lightState) {

            // ct: remove hue/sat
            if(typeof(state.ct) !== 'undefined') {
                lightState.colormode = 'ct';

                delete lightState.hue;
                delete lightState.sat;
            }
            // hue/sat: remove ct
            else if(typeof(state.hue) !== 'undefined' || typeof(state.sat) !== 'undefined') {
                lightState.colormode = 'hs';

                delete lightState.ct;

                // fill in dummies for missing values
                if(typeof(lightState.hue) === 'undefined') {
                    lightState.hue = 0;
                }
                if(typeof(lightState.sat) === 'undefined') {
                    lightState.sat = 254;
                }
            }

        },

        removeFromArray: function(arr, index) {
            arr.splice(index, 1);
        }

    };

}]);



