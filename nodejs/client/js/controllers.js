angular.module('hueApp.controllers', []).
controller('MainCtrl', ['$scope', 'socket', '$timeout', function($scope, socket, $timeout) {

    // TODO remove
    scope = $scope;
    //
    // local data model
    //

    $scope.test = "TestSuccessfull";

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
        devices: {},
        speech: {},
        party: {}
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



    // methods

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
            },

            reset: function() {
                socket.emit('rfid.reset');
                $scope.state.rfidUnknown = [];
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



