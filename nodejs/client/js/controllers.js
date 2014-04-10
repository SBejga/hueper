angular.module('hueApp.controllers', []).
controller('MainCtrl', ['$scope', '$rootScope', 'socket', '$timeout', 'stateManager', function($scope, $rootScope, socket, $timeout, stateManager) {

    stateManager($scope);

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

    $rootScope.helpers = {

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


    //Submenu functions
    $scope.submenu = {

        visibleReplaceFavorite: false,
        visibleChangeLightColor: false,

        openSubmenu: function(menuname){
            if(menuname === "replaceFavorite"){
                $scope.submenu.visibleReplaceFavorite = true;
            }
            else if(menuname === "changeLightColor"){
                $scope.submenu.visibleChangeLightColor = true;
            }
        },

        closeSubmenu: function(){
            $scope.submenu.visibleReplaceFavorite = false;
            $scope.submenu.visibleChangeLightColor = false;
        }

    };
}]);



