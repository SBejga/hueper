angular.module('hueApp.controllers').
controller('SceneCtrl', ['$scope', 'socket', 'stateManager', function($scope, socket, stateManager) {

        stateManager($scope);

        //scenes

    $scope.scenes = {

        selectedSceneId:0,
        selectedLightId:0,
        activatedScene:0,

        // placeholder for form data
        forms: {
            create: {
                name: '',
                lights: []
            }
        },

        create: function(scene) {
            socket.emit('scene.create', scene);
            $scope.scenes.forms.create.name = '';
            $scope.scenes.forms.create.lights = [];
            $scope.sharedScope.submenu.closeSubmenu();
        },

        update: function(sceneId, scene) {
            socket.emit('scene.update', {
                id: sceneId,
                name: scene.name,
                lights: scene.lights
            });
        },

        remove: function(id) {
            socket.emit('scene.delete', id);
            delete $scope.state.scenes[id];
            $scope.sharedScope.submenu.closeSubmenu();
            $scope.sharedScope.submenu.openSubmenu("notificationSceneDeleted");
        },

        setSelectedSceneId: function(sceneId){
            $scope.scenes.selectedSceneId = sceneId;
        },
        setSelectedLightId: function(lightId){
            $scope.scenes.selectedLightId = lightId;
        },

        openDeleteMenuScene: function(sceneId, lightId, menu){
            $scope.scenes.setSelectedSceneId(sceneId);
            if(menu === 'sceneoverview'){
                $scope.sharedScope.submenu.openSubmenu('deleteScene');
            }
            else{
                $scope.scenes.setSelectedLightId(lightId);
                if($scope.state.scenes[$scope.scenes.selectedSceneId].lights.length === 1){
                    $scope.sharedScope.submenu.openSubmenu('deleteLastLightFromScene');
                }
                else{
                    $scope.sharedScope.submenu.openSubmenu('deleteLightFromScene');
                }
            }





        },

        /**
         * Apply scene and change light state accordingly
         * @param id
         */
        apply: function(id) {
            var scene = $scope.state.scenes[id],
                i, j, k;

            if(typeof($scope.state.scenes[id]) === 'undefined') {
                return;
            }

            socket.emit('scene.apply', id);

            $scope.scenes.activatedScene = id;
            console.log("Scene activated Id: " + id);

            for(i = 0; i < scene.lights.length; i++) {

                // filter out nonexistant or unreachable lights
                if(typeof($scope.state.lights[scene.lights[i].light]) === 'undefined'
                    || !$scope.state.lights[scene.lights[i].light].state.reachable) {
                    continue;
                }

                for(j in scene.lights[i].state) {
                    if(scene.lights[i].state.hasOwnProperty(j)) {

                        // rename isOn to on
                        k = (j === 'isOn') ? 'on' : j;

                        $scope.state.lights[scene.lights[i].light].state[k] = scene.lights[i].state[j];
                    }
                }

                // turn light on when changing other properties
                if(typeof(scene.lights[i].state.isOn) === 'undefined') {
                    $scope.state.lights[scene.lights[i].light].state.on = true;
                }

                // change colormode
                if(typeof(scene.lights[i].state.ct) !== 'undefined') {
                    $scope.state.lights[scene.lights[i].light].state.colormode = 'ct';
                }
                else if(typeof(scene.lights[i].state.hue) !== 'undefined') {
                    $scope.state.lights[scene.lights[i].light].state.colormode = 'hs';
                }

            }

        },

        /*
         * Return true if incoming SceneId is the active Scene Id.
         *
         */
        activeScene: function(sceneId){
            if(sceneId === $scope.scenes.activatedScene){
                return true;
            }
            else{
                 return false;
             }
        },

        /**
         * Add light to scene
         * @param scene
         * @param id
         */
        addLight: function(scene, id) {
            var i;

            // check if scene already contains this light
            for(i in scene.lights) {
                if(scene.lights.hasOwnProperty(i) && scene.lights[i].light == id) {
                    return;
                }
            }

            scene.lights.push({
                light: id,
                state: {
                    isOn: true
                }
            });
        },

        /**
         * Remove light from scene
         * @param scene
         * @param id
         */
        removeLight: function(scene, id, submenu) {
            $scope.sharedScope.submenu.closeSubmenu();
            if(submenu === 'deleteLastLightFromGroup'){
                $scope.scenes.remove($scope.scenes.selectedSceneId);
                window.location.href = 'lightandgroup.html';
                $scope.sharedScope.submenu.openSubmenu("notificationSceneDeleted");
            }else{
                var i;
                // check if scene already contains this light
                for(i in scene.lights) {
                    if(scene.lights.hasOwnProperty(i) && scene.lights[i].light == id) {
                        scene.lights.splice(i, 1);
                    }
                }
                $scope.scenes.update($scope.scenes.selectedSceneId, $scope.state.scenes[$scope.scenes.selectedSceneId]);
                $scope.sharedScope.submenu.openSubmenu(["notificationSceneRemoved"]);
            }
        },






        /**
         * Filter global state.lights object to the lights not contained in the parameter scene.lights array
         * @param {array} lights { light: ..., state: { ... } }
         * @returns {object}
         */
        filterUnused: function(lights) {
            var i,
                result = {};

            var contained = function(id) {
                var i;

                for(i = 0; i < lights.length; i++) {
                    if(lights[i].light == id) {
                        return true;
                    }
                }

                return false;
            };

            for(i in $scope.state.lights) {
                if($scope.state.lights.hasOwnProperty(i) && !contained(i)) {
                    result[i] = $scope.state.lights[i];
                }
            }

            return result;
        }

    };



    // automation control

    $scope.automation = {

        // placeholder for form data
        forms: {
            create: {
                name: '',
                triggers: [],
                conditions: [],
                allConditionsNeeded: true,
                actions: [],
                active: true
            }
        },

        create: function(automation) {
            socket.emit('automation.create', automation);

            $scope.automation.forms.create = {
                name: '',
                triggers: [],
                conditions: [],
                allConditionsNeeded: true,
                actions: [],
                active: true
            };
        },

        update: function(automation) {
            socket.emit('automation.update', automation);
        },

        remove: function(id) {
            socket.emit('automation.delete', id);
            delete $scope.state.automation[id];
        },

        resetTriggerValue: function(t) {
            t.value = undefined;
        },

        resetConditionValue: function(t) {
            if(t.type === 'weekdays') {
                t.value = [];
            }
            else if(t.type === 'state') {
                t.value = {
                    state: {}
                };
            }
            else {
                t.value = undefined;
            }
        },

        resetActionValue: function(t) {
            if(t.type === 'custom') {
                t.value = '';
            }
            else if(t.type === 'cancelDelay') {
                t.value = undefined;
            }
            else {
                t.value = { state: {} }
            }
        }

    };


}]);