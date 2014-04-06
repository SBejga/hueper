angular.module('hueApp.controllers').
controller('LightAndGroupCtrl', ['$scope', '$location', 'stateManager', function($scope, $location, stateManager) {

    stateManager($scope);

    // light control
    $scope.lights = {

        selectedLight: 0,
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
        },

        getLightFromUrl: function(){
            $scope.lights.selectedLight = $location.search();
        },

        saveColorAsFavorite: function(){
            numberOfFavorites=0;
            angular.forEach($scope.state.favorites, function(value){
                numberOfFavorites = numberOfFavorites + 1;
            });

            if(numberOfFavorites < 6){
                return true;
            }
            else {
                return false;
            }

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

    $scope.$on('$locationChangeSuccess', $scope.lights.getLightFromUrl);

    }]);