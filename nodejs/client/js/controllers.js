angular.module('hueApp.controllers', []).
controller('MainCtrl', ['$scope', '$rootScope', '$location', 'socket', '$timeout', 'stateManager', '$window',
        function($scope, $rootScope, $location, socket, $timeout, stateManager, $window) {

    stateManager($scope);

    // bridge configuration control

    $scope.config = {

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
        changePassword: function() {
            var form = $scope.user.forms.password;

            form.error = false;
            form.success = false;

            if(form.newPassword !== form.newPassword2) {
                form.error = 'match';
                return;
            }

            if(!$scope.state.user.loginRequired) {
                form.oldPassword = '';
            }

            socket.emit('config.password', {
                oldPassword: form.oldPassword,
                newPassword: form.newPassword
            });
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
        },

        /*
         *Turns the speech recognition on/off.
         */
        changeSpeechRecognitionState: function(){
            $scope.state.appConfig.speechRecognition = !$scope.state.appConfig.speechRecognition;
            $scope.config.change($scope.state.appConfig);
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

    $rootScope.helpers = {

        urlId: 0,
        transitionTime: 0,

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
        },

        /**
         *  If the Url contains an ID (for example GroupID or LightID)
         *  this functions sets the global urlId to this ID.
         *
         */
        getIdFromUrl: function(){
            var url = $location.absUrl().toString();
            if(url.indexOf("id") != -1){
                $scope.helpers.urlId = $location.search().id;
            }
        },

        cancelEvent: function($event) {
            $event.preventDefault();
            $event.stopPropagation();
        },

        objectLength: function(o) {
            var i, sum = 0;

            for(i in o) {
                if(o.hasOwnProperty(i)) {
                    sum++;
                }
            }

            return sum;
        }

    };



    //Submenu functions
    $scope.submenu = {
        visible:{},
        openSubmenu: function(menuname){
            $scope.submenu.visible = {};
            if(angular.isArray(menuname)){
                angular.forEach(menuname, function(value){
                    $scope.submenu.visible[value] = true;
                });
            }else{
                $scope.submenu.visible[menuname] = true;
            }
        },

        closeSubmenu: function(){
            $scope.submenu.visible = {};
        }
    };



    $scope.$on("$locationChangeSuccess", function(){
            $rootScope.helpers.getIdFromUrl();
            $scope.submenu.closeSubmenu();
    });

    /*
    $scope.$watch('state.connect', function(){
        if($scope.state.connect.hue === undefined){
            return;
        }
        var i = $location.absUrl().toString().indexOf("connection");
        var connectstate = (!$scope.state.connect.hue || !$scope.state.connect.hueRegistered || !$scope.state.connect.mongodb );
        if((i < 0) && connectstate){
            $.mobile.changePage( "connection.html", {changeHash: false});
        }
        else if((i > 0) && !connectstate){
            $.mobile.changePage( "index.html", {changeHash: false});
        }
    }, true);
    */

}]).



controller('IndexCtrl', [function() {
    if(window.innerWidth > 1100){
        $.mobile.changePage( "lightandgroup.html", {changeHash: false});
    }
}]).

controller('SettingsCtrl', [function() {
    if(window.innerWidth > 1100){
        $.mobile.changePage( "account.html", {changeHash: false});
    }
}]);


