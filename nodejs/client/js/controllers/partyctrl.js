angular.module('hueApp.controllers').
controller('PartyCtrl', ['$scope', 'stateManager', 'socket', function($scope, stateManager, socket) {

    stateManager($scope);

    $scope.party = {

        forms: {
            edit: false
        },

        selectedPartyId: false,

        openCreateMenu: function() {
                // apply template for new party mode
                $scope.party.forms.edit = {
                    name: '',
                    trigger: 'sound',

                    soundSettings: {
                        maxBpm: 120
                    },

                    timeSettings: {
                        min: 10,
                        max: 20
                    },

                    lights: [],

                    fadeTime: {
                        min: 4,
                        max: 4
                    },

                    states: [{
                        bri: {
                            min: 0,
                            max: 254
                        },
                        hue: {
                            min: 0,
                            max: 65535
                        },
                        sat: {
                            min: 0,
                            max: 254
                        }
                    }],

                    lightsPerStep: {
                        min: 1,
                        max: $scope.sharedScope.helpers.objectLength($scope.state.lights) || 1
                    },

                    randomLightOrder: false,
                    randomStateOrder: false,
                    sameState: false
                };
                $scope.sharedScope.submenu.openSubmenu(['party', 'createParty']);

        },

        openEditMenu: function(party) {
            $scope.party.forms.edit = angular.copy(party);
            $scope.party.selectedPartyId = party['_id'];
            $scope.sharedScope.submenu.openSubmenu(['party','editParty']);
        },

        /**
         * create or edit party (depending on _id property)
         * @param party
         */
        save: function(party) {

            if(($scope.party.forms.edit.name) && ($scope.party.forms.edit.states != undefined) && ($scope.party.forms.edit.states.length > 0)&&
                ($scope.party.forms.edit.lights != undefined) && ($scope.party.forms.edit.lights.length > 0)){

                // existing party - edit
                if(party['_id']) {
                    $scope.state.party[party['_id']] = angular.copy(party);
                    socket.emit('party.update', party);
                }
                // non-existent party - create
                else {
                    socket.emit('party.create', party);
                }

                $scope.sharedScope.submenu.closeSubmenu();

            }
            else{
                $scope.sharedScope.submenu.openSubmenu(notificationValueIncomplete);
            }

        },

        openDeleteMenu: function(id) {
            $scope.party.selectedPartyId = id;
            $scope.sharedScope.submenu.openSubmenu('deleteParty');
        },

        remove: function(id) {
            socket.emit('party.delete', id);
            delete $scope.state.party[id];
            $scope.sharedScope.submenu.closeSubmenu();
        },

        addState: function(party) {
            party.states.push({
                bri: {
                    min: 0,
                    max: 254
                },
                hue: {
                    min: 0,
                    max: 65535
                },
                sat: {
                    min: 0,
                    max: 254
                }
            });
        },

        removeState: function(party, index) {
            party.states.splice(index, 1);
        },

        /**
         * Start party mode with selected setting
         * @param id
         */
        start: function(id) {
            socket.emit('config.change', {
                partyMode: id
            });
            $scope.state.appConfig.partyMode = id;
        },

        /**
         * stop currently active party mode
         */
        stop: function() {
            socket.emit('config.change', {
                partyMode: false
            });

            $scope.state.appConfig.partyMode = false;
        }



    };

}]);