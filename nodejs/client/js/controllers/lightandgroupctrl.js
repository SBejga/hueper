angular.module('hueApp.controllers').
controller('LightAndGroupCtrl', ['$scope', 'socket', '$location', 'stateManager', '$timeout', function($scope, socket, $location, stateManager, $timeout) {

    stateManager($scope);

    // light control
    $scope.lights = {

        selectedLightId: 0,

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

        setSelectedLightId: function(lightId){
            $scope.lights.selectedLightId = lightId;
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

        getGroupsInverse: function(id){
          var groupsOfLampInverse = [];
            id = id.toString();
            angular.forEach($scope.state.groups, function(value, key){
                if(value.lights.indexOf(id) === -1){
                    groupsOfLampInverse.push(key);
                }
            });
            console.log(groupsOfLampInverse.toString());
            if(groupsOfLampInverse.length === 0){
                $scope.sharedScope.submenu.closeSubmenu();
                $scope.sharedScope.submenu.openSubmenu("notificationNoGroupToAdd");
            }
            return groupsOfLampInverse;
        },

        openDeleteMenuLight: function(lightId, groupId){
            $scope.lights.setSelectedLightId(lightId);

            if($scope.state.groups[groupId].lights.length === 1){
                $scope.sharedScope.submenu.openSubmenu('deleteLastLightFromGroup');
            }else{
                $scope.sharedScope.submenu.openSubmenu('deleteLightFromGroup');
            }
        },

        checkNumberOfFavorites: function(lightId){
            console.log("checkNumberOfFavorites");
            var numberOfFavorites=0;
            var fav;
            angular.forEach($scope.state.favorites, function(value){
                numberOfFavorites = numberOfFavorites + 1;
            });

            if(numberOfFavorites < 6){
                $scope.favorites.create($scope.lights.getCurrentStateForFavorite(lightId));
            }
            else {
                $scope.sharedScope.submenu.openSubmenu("replaceFavorite");
            }
        },

        getCurrentStateForFavorite: function(id){
            console.log(id);
            var fav;
            if($scope.state.lights[id].state.colormode === "ct"){
                fav = {
                    state: {
                        bri: $scope.state.lights[id].state.bri,
                        ct: $scope.state.lights[id].state.ct,
                        effect: $scope.state.lights[id].state.effect
                    }
                }
            }else{
                fav = {
                    state: {
                        bri: $scope.state.lights[id].state.bri,
                        hue: $scope.state.lights[id].state.hue,
                        sat: $scope.state.lights[id].state.sat,
                        effect: $scope.state.lights[id].state.effect
                    }
                }
            }
            return fav;

        },

        updateFavorite: function(favId, lightId){
            $scope.state.favorites[favId].state = $scope.lights.getCurrentStateForFavorite(lightId).state;
            $scope.favorites.update($scope.state.favorites[favId]);

            $scope.sharedScope.submenu.closeSubmenu();
        },

        changeLightColorToFavorite: function(favId, lightId){
            $scope.lights.state(lightId, $scope.state.favorites[favId].state);
        },

        turnLightOnOff: function(id){
            if($scope.state.lights[id].state.on === true){
                $scope.lights.state(id, {on: false});
            }else{
                $scope.lights.state(id, {on: true});
            }
        },

        turnAllLightsOnOff: function(){
            var statusOfLights = false;
            angular.forEach($scope.state.lights, function(light){
                if(light.state.on === true){
                    statusOfLights = true;
                }
            });
            $scope.lights.stateAll({on: !statusOfLights});
        }

    };

    // group control

    $scope.groups = {

        selectedGroupId:0,
        newGroupName:"",
        newLightsArray: [],


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
            $scope.sharedScope.submenu.closeSubmenu();
            $scope.sharedScope.submenu.openSubmenu("notificationGroupDeleted");

        },

        openDeleteMenuGroup: function(groupId, submenuName){
            $scope.groups.setSelectedGroupId(groupId);
            $scope.sharedScope.submenu.openSubmenu(submenuName);
        },

        setSelectedGroupId: function(groupId){
            $scope.groups.selectedGroupId = groupId;
        },

        removeLight: function(groupId, lightId){
            $scope.state.groups[groupId].lights.splice($scope.state.groups[groupId].lights.indexOf(lightId), 1);
            if($scope.state.groups[groupId].lights.length === 0){
                $scope.groups.remove(groupId);
                $scope.sharedScope.submenu.closeSubmenu();
                window.location.href = 'lightandgroup.html';
            }
            else{
                $scope.groups.update(groupId, $scope.state.groups[groupId]);
                $scope.sharedScope.submenu.closeSubmenu();
            }
        },

        addLight: function(groupId, lightId){
            $scope.state.groups[groupId].lights.push(lightId);
            $scope.groups.update(groupId, $scope.state.groups[groupId]);
            if($scope.lights.getGroupsInverse(groupId).length === 0){
                $scope.sharedScope.submenu.closeSubmenu();
                $scope.sharedScope.submenu.openSubmenu("notificationNoGroupToAdd");
            }
        },

        turnGroupOnOff: function(id){
            var statusOfGroup = false;
            angular.forEach($scope.state.groups[id].lights, function(lightId){
                if($scope.state.lights[lightId].state.on === true){
                    statusOfGroup = true;
                }
            });
            $scope.groups.state(id, {on: !statusOfGroup});
        },

        getLightsInverse: function(groupId){
            var lightsOfGroupInverse = [];
            groupId = groupId.toString();

            angular.forEach($scope.state.lights, function(value, key){
                if($scope.state.groups[groupId].lights.indexOf(key) === -1 ){
                    lightsOfGroupInverse.push(key)
                }
            });

            if(lightsOfGroupInverse.length === 0){
                $scope.sharedScope.submenu.closeSubmenu();
                $scope.sharedScope.submenu.openSubmenu("notificationNoLightToAdd");
            }
            return lightsOfGroupInverse;
        },

        createNewGroup: function(lightId){

            if($scope.groups.newLightsArray.length === 0){
                newGroupName = $scope.groups.forms.create.name;

                console.log("Name: " + newGroupName);






            }


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
}]);