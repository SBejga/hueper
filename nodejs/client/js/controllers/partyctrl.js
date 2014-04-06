angular.module('hueApp.controllers').
controller('PartyCtrl', ['$scope', 'stateManager', function($scope, stateManager) {

        stateManager($scope);

        $scope.party = {

        forms: {
            create: {
                trigger: 'sound',
                lights: [],
                states: []
            }
        },

        selected: false,

        create: function(party) {
            socket.emit('party.create', party);

            $scope.party.forms.create = {
                trigger: 'sound',
                lights: [],
                states: []
            };
        },

        update: function(party) {
            socket.emit('party.update', party);
        },

        remove: function(id) {
            socket.emit('party.delete', id);
            delete $scope.state.party[id];
        },

        addState: function(states) {
            states.push({
                bri: {},
                hue: {},
                sat: {},
                ct: {}
            });
        },

        removeState: function(states, index) {
            states.splice(index, 1);
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
        },

        /**
         * Determines if a light is controlled by the currently active party mode
         * @param id light ID
         * @returns {boolean}
         */
        lightContainedInActive: function(id) {
            if(!$scope.state.appConfig.partyMode) {
                return false;
            }

            var p = $scope.state.party[$scope.state.appConfig.partyMode];

            return (p && p.lights && p.lights.indexOf(parseInt(id)) !== -1);
        }

    };

}]);