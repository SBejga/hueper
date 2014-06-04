angular.module('hueApp.controllers').
controller('LightAndGroupCtrl', ['$scope', 'socket', '$location', 'stateManager', '$timeout',
        function($scope, socket, $location, stateManager, $timeout) {

    stateManager($scope);

    // light control
    $scope.lights = {

        selectedLightId:0,

        /**
         * Change state attributes of a light
         * @param {integer} lightId 0 for all lights
         * @param {object} state
         */
        state: function(lightId, state) {
            var i;

            if(typeof($scope.state.lights[lightId]) === 'undefined') {
                return;
            }

            socket.emit('light.state', {
                id: lightId,
                state: state
            });

            for(i in state) {
                if(state.hasOwnProperty(i) && i !== 'transitiontime') {
                    $scope.state.lights[lightId].state[i] = state[i];
                }
            }

            // turn on when changing other properties
            if(typeof(state.on) === 'undefined') {
                $scope.state.lights[lightId].state.on = true;
            }

            // deactivate colorloop when changing colors
            if(typeof(state.hue) !== 'undefined' || typeof(state.sat) !== 'undefined' || typeof(state.ct) !== 'undefined') {
                $scope.state.lights[lightId].state.effect = 'none';
            }

            // change colormode
            $scope.helpers.setColorMode(state, $scope.state.lights[lightId].state);
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

                    // deactivate colorloop when changing colors
                    if(typeof(state.hue) !== 'undefined' || typeof(state.sat) !== 'undefined' || typeof(state.ct) !== 'undefined') {
                        $scope.state.lights[i].state.effect = 'none';
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
            console.log("search()");


        },

        /**
         * Rename a light
         * @param lightId
         * @param name
         */
        setName: function(lightId, name) {

            if(typeof($scope.state.lights[lightId]) == 'undefined') {
                return;
            }

            socket.emit('light.name', {
                id: lightId,
                name: name
            });

            $scope.state.lights[lightId].name = name;
        },

        setSelectedLightId: function(lightId){
            $scope.lights.selectedLightId = lightId;
            console.log(lightId);
        },

        /**
         * gets the groups which contain the lightId
         * @param lightId
         * @returns Array of groupIds
         */
        getGroups: function(lightId){
            var groupsOfLamp = [];

           lightId = lightId.toString();
            angular.forEach($scope.state.groups, function(value, key){
                if(value.lights.indexOf(lightId) > -1){
                    groupsOfLamp.push(key);
                }
            });
            return groupsOfLamp;
        },

        /**
         * get the groups which are not containing the lightId
         * @param lightId
         * @returns {Array} of groupIDs
         */
        getGroupsInverse: function(lightId){
          var groupsOfLampInverse = [];
            lightId = lightId.toString();
            angular.forEach($scope.state.groups, function(value, key){
                if(value.lights.indexOf(lightId) === -1){
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

        /**
         * counts the faorites and starts the replacing if it's required
         * @param lightId
         */
        checkNumberOfFavorites: function(lightId){
            var numberOfFavorites=0;
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

        /**
         * gets the current state of the lamp and saves it as a favorite object
         * @param   lightId
         * @returns {*} favorite object
         */
        getCurrentStateForFavorite: function(lightId){
            var fav;
            if($scope.state.lights[lightId].state.colormode === "ct"){
                fav = {
                    state: {
                        bri: $scope.state.lights[lightId].state.bri,
                        ct: $scope.state.lights[lightId].state.ct,
                        effect: $scope.state.lights[lightId].state.effect
                    }
                }
            }else{
                fav = {
                    state: {
                        bri: $scope.state.lights[lightId].state.bri,
                        hue: $scope.state.lights[lightId].state.hue,
                        sat: $scope.state.lights[lightId].state.sat,
                        effect: $scope.state.lights[lightId].state.effect
                    }
                }
            }
            return fav;
        },

        /**
         * Updates a favorite
         * @param favId
         * @param lightId
         */
        updateFavorite: function(favId, lightId){
            console.log("updatefav");
            $scope.state.favorites[favId].state = $scope.lights.getCurrentStateForFavorite(lightId).state;
            $scope.favorites.update($scope.state.favorites[favId]);

            $scope.sharedScope.submenu.closeSubmenu();
        },

        /**
         * guide to different functions, depends on type to which one
         * @param favId
         * @param changeId can be lightId or GroupId
         * @param type can be 'light' or 'group'
         */
        changeLightColorToFavorite: function(favId, changeId, type){
            if(type === 'group'){
                $scope.groups.state(changeId, $scope.state.favorites[favId].state);
            }else{
                $scope.lights.state(changeId, $scope.state.favorites[favId].state);
            }


        },

        /**
         * turns one light on or off
         * @param lightId
         */
        turnLightOnOff: function(lightId){
            if($scope.state.lights[lightId].state.on === true){
                $scope.lights.state(lightId, {on: false});
            }else{
                $scope.lights.state(lightId, {on: true});
            }
        },

        /**
         * turns all lights on or off (if one light is on, everylight will be turned off)
         */
        turnAllLightsOnOff: function(){
            var statusOfLights = false;
            angular.forEach($scope.state.lights, function(light){
                if(light.state.on === true){
                    statusOfLights = true;
                }
            });
            $scope.lights.stateAll({on: !statusOfLights});
        },

        adjustAll: {
            display: false,
            separate: false,

            dummyState: {
                on: true,
                bri: 254,
                ct: 359
            },

            toggle: function() {

                $scope.lights.adjustAll.display = !$scope.lights.adjustAll.display;
            }
        }

    };

    // group control

    $scope.groups = {

        selectedGroupId:0,
        selectedLightId:0,

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
         * @param groupId
         * @param {array} state
         */
        state: function(groupId, state) {
            var i, j;

            if(typeof($scope.state.groups[groupId]) == 'undefined') {
                return;
            }

            socket.emit('group.state', {
                id: groupId,
                state: state
            });

            // change group state

            if(typeof($scope.state.groups[groupId].action) === 'undefined') {
                $scope.state.groups[groupId].action = {};
            }

            for(j in state) {
                if(state.hasOwnProperty(j) && j !== 'transitiontime') {
                    $scope.state.groups[groupId].action[j] = state[j];
                }
            }

            // change group action colormode
            $scope.helpers.setColorMode(state, $scope.state.groups[groupId].action);

            // change lights state

            for(i = 0; i < $scope.state.groups[groupId].lights.length; i++) {
                for(j in state) {
                    if(state.hasOwnProperty(j) && j !== 'transitiontime') {
                        $scope.state.lights[$scope.state.groups[groupId].lights[i]].state[j] = state[j];
                    }
                }

                // turn light on when changing other properties
                if(typeof(state.on) === 'undefined') {
                    $scope.state.lights[$scope.state.groups[groupId].lights[i]].state.on = true;
                }

                // deactivate colorloop when changing colors
                if(typeof(state.hue) !== 'undefined' || typeof(state.sat) !== 'undefined' || typeof(state.ct) !== 'undefined') {
                    $scope.state.lights[$scope.state.groups[groupId].lights[i]].state.effect = 'none';
                }

                // change light colormode
                $scope.helpers.setColorMode(state, $scope.state.lights[$scope.state.groups[groupId].lights[i]].state);
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
            $scope.sharedScope.submenu.closeSubmenu();
        },

        /**
         * update group
         * @param groupId
         * @param {object} group light IDs as strings!
         */
        update: function(groupId, group) {
            socket.emit('group.update', {
                id: groupId,
                name: group.name,
                lights: group.lights
            });
        },

        /**
         * delete group
         * @param groupId
         */
        remove: function(groupId) {
            socket.emit('group.remove', groupId);
            delete $scope.state.groups[groupId];
            $scope.sharedScope.submenu.closeSubmenu();
            $scope.sharedScope.submenu.openSubmenu("notificationGroupDeleted");

        },

        /**
         * guide which open the required submenu
         * @param groupId
         * @param submenuName
         */
        openDeleteMenuGroup: function(groupId, lightId, menu){
            $scope.groups.setSelectedGroupId(groupId);
            if(menu === 'lightandgroup'){
                $scope.sharedScope.submenu.openSubmenu('deleteGroup');
            }
            else{
                $scope.groups.setSelectedLightId(lightId);
                if($scope.state.groups[$scope.groups.selectedGroupId].lights.length === 1){
                    $scope.sharedScope.submenu.openSubmenu('deleteLastLightFromGroup');
                }
                else{
                    $scope.sharedScope.submenu.openSubmenu('deleteLightFromGroup');
                }
            }
        },

        /**
         * sets the local variable selectedGroupId
         * @param groupId
         */
        setSelectedGroupId: function(groupId){
            $scope.groups.selectedGroupId = groupId;
        },
        setSelectedLightId: function(lightId){
          $scope.groups.selectedLightId = lightId;
        },

        /**
         * removes a light from a group (from its array)
         * @param groupId
         * @param lightId
         */
        removeLight: function(menu, submenu){
            $scope.sharedScope.submenu.closeSubmenu();
            if(submenu === 'deleteLastLightFromGroup'){
                $scope.groups.remove($scope.groups.selectedGroupId);
                if(menu === 'groupmenu'){
                   $.mobile.changePage( "lightandgroup.html", {changeHash: false});
                }
                $scope.sharedScope.submenu.openSubmenu("notificationGroupDeleted");
            }
            else{
                $scope.state.groups[$scope.groups.selectedGroupId].lights.splice($scope.state.groups[$scope.groups.selectedGroupId].lights.indexOf($scope.groups.selectedLightId), 1);
                $scope.groups.update($scope.groups.selectedGroupId, $scope.state.groups[$scope.groups.selectedGroupId]);
                $scope.sharedScope.submenu.openSubmenu(["notificationGroupRemoved", "notificationLightRemoved"]);
            }
        },

        /**
         * adds light to a group (to its array)
         * @param groupId
         * @param lightId
         */
        addLight: function(groupId, lightId){
            $scope.state.groups[groupId].lights.push(lightId);
            $scope.groups.update(groupId, $scope.state.groups[groupId]);
            if($scope.lights.getGroupsInverse(groupId).length === 0){
                $scope.sharedScope.submenu.closeSubmenu();
                $scope.sharedScope.submenu.openSubmenu("notificationNoGroupToAdd");
            }
        },

        /**
         * turns a group of lights on or off
         * @param groupId
         */
        turnGroupOnOff: function(groupId){
            var statusOfGroup = false;
            angular.forEach($scope.state.groups[groupId].lights, function(lightId){
                if($scope.state.lights[lightId].state.on === true){
                    statusOfGroup = true;
                }
            });
            $scope.groups.state(groupId, {on: !statusOfGroup});
        },

        /**
         * gets all lights which are not part of group
         * @param groupId
         * @returns {Array} contains lightIDs
         */
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