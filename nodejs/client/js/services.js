angular.module('hueApp.services',[]).


/**
 * Socket.IO service
 */
factory('socket', ['$rootScope', function ($rootScope) {
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
}]).



/**
 * Creates application state and synchronizes it with the server
 * Manages Notifications
 * Adds the following properties to a given (scope) object: state, notifications, clientConfig, client, user
 */
factory('stateManager', ['socket', '$timeout', '$window', '$location', function(socket, $timeout, $window, $location) {

    var $scope = {};

    //
    // local data model
    //
    $scope.state = {

        ready: false,

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

    // user and login control

    $scope.user = {

        // container for form data
        forms: {
            // change password
            password: {
                oldPassword: '',
                newPassword: '',
                newPassword2: '',
                error: false,
                success: false
            }
        },

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
        else {
            if($location.absUrl().toString().indexOf("login") === -1){
                $window.location.href = 'login.html';
            }
            $scope.state.ready = true;
        }
    });

    // password change answer
    socket.on('config.password', function(data) {
        var form = $scope.user.forms.password;

        // error
        if(data === false) {
            form.error = true;
        }
        else {
            form.error = false;
            form.success = true;
            form.oldPassword = '';
            form.newPassword = '';
            form.newPassword2 = '';

            if(data.password === null) {
                localStorage.removeItem('huePassword');
                $scope.state.user.loginRequired = false;
            }
            else {
                localStorage.huePassword = data.password;
                $scope.state.user.loginRequired = true;
            }
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
        $scope.state.ready = true;
        $scope.state.user.login = login;
        $scope.state.user.loginError = !login;
        $scope.state.user.loginWaiting = false;

        // persist password
        if(login) {
            localStorage.huePassword = $scope.user.password;
            if($location.absUrl().toString().indexOf("login") > -1){
                $window.location.href = 'index.html';
            }
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

        // set ready flag after first state flush
        $scope.state.ready = true;
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

    // get client MAC address
    socket.on('device.address', function(address) {
        $scope.client.address = address;
    });



    /*
     * Inject managed state into a controller scope
     */

    return function($ctrlScope) {
        var i;

        for(i in $scope) {
            if($scope.hasOwnProperty(i)) {
                $ctrlScope[i] = $scope[i];
            }
        }
    }
}]);