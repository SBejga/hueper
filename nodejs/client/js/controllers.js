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
        selectedRfidId:0,
        unknownRfid: false,

        forms: {
            create:{
                name:'',
                tag:'',
                lastUsed:''
            }
        },

        create: function(rfid) {
            $scope.rfid.forms.create.lastUsed = '';
            socket.emit('rfid.create', rfid);
            $scope.rfid.forms.create.name = '';
            $scope.rfid.forms.create.tag = '';
            $scope.rfid.forms.create.lastUsed = '';
            $scope.submenu.closeSubmenu();
        },

        update: function(rfid) {
            socket.emit('rfid.update', rfid);
            $scope.submenu.closeSubmenu();
        },

        remove: function(id) {
            socket.emit('rfid.delete', id);
            delete $scope.state.rfid[id];
        },

        reset: function() {
            socket.emit('rfid.reset');
            $scope.state.rfidUnknown = [];
            $scope.submenu.closeSingleSubmenu('newRfid');
        },

        setFormTag: function(tag){
            $scope.rfid.forms.create.tag = tag;
        },

        setSelectedRfidId: function(id){
            $scope.rfid.selectedRfidId = id;
        }
    };




    // network devices

    $scope.devices = {

        selectedDeviceId:0,

        forms:{
            create:{
                address: '',
                name:'',
                lastActivity:''
            }
        },

        create: function(device) {
            $scope.devices.forms.create.address = $scope.client.address;
            socket.emit('device.create', device);
            $scope.devices.forms.create.address = '';
            $scope.devices.forms.create.name = '';
            $scope.devices.forms.create.lastActivity = '';
            $scope.submenu.closeSubmenu();
        },

        update: function(device) {
            socket.emit('device.update', device);
            $scope.submenu.closeSubmenu();
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
        },

        setSelectedDeviceId: function(id){
            $scope.devices.selectedDeviceId = id;
        }




    };

    // helper functions
    // checkbox list to array conversion

    $rootScope.helpers = {

        urlId: 0,
        transitionTime: 0,
        ready: false,

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

        /**
         * automatic state changes
         * - turn light on when changing other properties
         * - deactivate colorloop when changing colors
         * @param state
         */
        autocorrectState: function(state) {
            // turn on when changing other properties
            if(typeof(state.on) === 'undefined') {
                state.on = true;
            }

            // deactivate colorloop when changing colors
            if(state.effect !== 'colorloop' && (typeof(state.hue) !== 'undefined' || typeof(state.sat) !== 'undefined' || typeof(state.ct) !== 'undefined')) {
                state.effect = 'none';
            }
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
        },

        /**
         * jQuery Mobile redirect abstraction to ensure that a redirect is
         * fired only when the first page has loaded completely
         * @param url
         */
        redirect: function(url) {
            // used to remove the scope's event listener after the redirect
            var listener = function() {};

            console.log("redirect " + url);

            // remove slash from the start
            if(url.indexOf('/') === 0) {
                url = url.slice(1);
            }

            // redirection function modified from the jQuery Mobile Angular adapter
            var redirection = function() {
                var basePath = $location.absUrl().split("/");
                basePath.pop();
                basePath = basePath.join("/") + "/";

                $location.$$parse(basePath + url);
                listener();
            };





            if($rootScope.helpers.ready) {
                redirection();
            }
            else {
                listener = $scope.$on("jqmInit", redirection);
            }
        },

        scrollToSubmenu: function(submenu){
            if((submenu != 'newRfid') && (submenu != undefined)){
                if(window.innerWidth > 550){
                    $timeout(function(){
                        var element = document.getElementById(submenu),
                            vertical;

                        if(element && (vertical = element.offsetTop) !== undefined) {
                            window.scrollTo(0,vertical);
                        }
                    }, 300);
                }
            }
        }

    };



    //Submenu functions
    $scope.submenu = {
        visible:{},
        openSubmenu: function(menuname){
            $scope.submenu.visible = {};
            if(angular.isArray(menuname)){
                $scope.helpers.scrollToSubmenu(menuname[0]);
                angular.forEach(menuname, function(value){
                    $scope.submenu.visible[value] = true;
                });
            }else{
                $scope.submenu.visible[menuname] = true;
                $scope.helpers.scrollToSubmenu(menuname);
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


    var jqmInitListener = $scope.$on("jqmInit", function() {
        $rootScope.helpers.ready = true;
        jqmInitListener();
    });




    $scope.$watch('state.connect', function(){
        if($scope.state.connect.hue === undefined){
            return;
        }
        var i = $location.absUrl().toString().indexOf("connection");
        var connectstate = (!$scope.state.connect.hue || !$scope.state.connect.hueRegistered || !$scope.state.connect.mongodb || !$scope.state.socket.connected );
        if((i < 0) && connectstate){
            $rootScope.helpers.redirect("connection.html");
        }
        else if((i > 0) && !connectstate){
            $rootScope.helpers.redirect("index.html");
        }
    }, true);


    $scope.$watch('state.rfidUnknown', function(){
        if($scope.state.rfidUnknown.length){
            $scope.rfid.unknownRfid = true;
        }
        $timeout(function(){
            $scope.rfid.unknownRfid = false;
        }, 5000);
    }, true);


    $.mobile.defaultPageTransition = 'none';



}]).



controller('IndexCtrl', ['$rootScope', function($rootScope) {
    if(window.innerWidth > 1100){
        $rootScope.helpers.redirect("lightandgroup.html");
    }
}]).

controller('SettingsCtrl', ['$rootScope', function($rootScope) {
    if(window.innerWidth > 1100){
        $rootScope.helpers.redirect("account.html");
    }
}]);


