angular.module('hueApp.controllers').
controller('SceneCtrl', ['$scope', '$location', 'socket', 'stateManager', function($scope, $location, socket, stateManager) {

        stateManager($scope);

        //scenes

    $scope.scenes = {

        selectedSceneId:0,
        selectedArrayId:0,
        selectedLightId:0,
        activatedSceneId:0,

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

        update: function(scene) {
            socket.emit('scene.update', scene);
        },

        remove: function(id) {
            socket.emit('scene.delete', id);
            delete $scope.state.scenes[id];
            $scope.sharedScope.submenu.closeSubmenu();
            $scope.sharedScope.submenu.openSubmenu("notificationSceneDeleted");
            $scope.helpers.redirect("scenes.html");
        },

        setSelectedSceneId: function(sceneId){
            $scope.scenes.selectedSceneId = sceneId;
        },
        setSelectedArrayId: function(sceneId){
            $scope.scenes.selectedArrayId = sceneId;
        },
        setSelectedLightId: function(lightId){
            $scope.scenes.selectedLightId = lightId;
        },
        setActivatedSceneId: function(sceneId){
            $scope.scenes.activatedSceneId = sceneId;
        },

        activeScene: function(sceneId){
          if(sceneId === $scope.scenes.activatedSceneId){
              return true;
          }
          return false;
        },

        /**
         * guide which opens the required submenu
         * @param sceneId
         * @param lightId
         * @param menu
         */
        openDeleteMenuScene: function(sceneId, lightId, menu){
            $scope.scenes.setSelectedSceneId(sceneId);
            if(menu === 'sceneoverview'){
                $scope.sharedScope.submenu.openSubmenu('deleteScene');
            }
            else{
                $scope.scenes.setSelectedLightId(lightId);
                if($scope.state.scenes[$scope.scenes.selectedSceneId].lights.length === 1){
                    $scope.sharedScope.submenu.openSubmenu(['openScene','deleteLastLightFromScene']);
                }
                else{
                    $scope.sharedScope.submenu.openSubmenu(['openScene', 'deleteLightFromScene']);
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

                // deactivate colorloop when changing colors
                if(scene.lights[i].state.effect !== 'colorloop' && (typeof(scene.lights[i].state.hue) !== 'undefined' || typeof(scene.lights[i].state.sat) !== 'undefined' || typeof(scene.lights[i].state.ct) !== 'undefined')) {
                    $scope.state.lights[scene.lights[i].light].state.effect = 'none';
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
                    isOn: true,
                    bri: 254,
                    ct: 359
                }
            });
        },

        /**
         * Remove light from scene
         * @param scene
         * @param lightId
         */
        removeLight: function(scene, lightId, submenu) {
            $scope.sharedScope.submenu.closeSubmenu();
            if(submenu === 'deleteLastLightFromScene'){
                $scope.scenes.remove($scope.scenes.selectedSceneId);
                $scope.helpers.redirect("scenes.html");

                $scope.sharedScope.submenu.openSubmenu('notificationSceneDeleted');
            }else{
                var i;
                console.log(scene.lights);
                for(i in scene.lights) {
                    if(scene.lights.hasOwnProperty(i) && scene.lights[i].light == lightId) {
                        scene.lights.splice(i, 1);

                    }
                }
                $scope.scenes.update($scope.state.scenes[$scope.scenes.selectedSceneId]);
                $scope.sharedScope.submenu.openSubmenu(['openScene','notificationLightRemoved']);
            }
        },



        /**
         * Filter global state.lights object to the lights not contained in the parameter scene.lights array
         * @param {array} lights { light: ..., state: { ... } }
         * @returns {object}
         */
        filterUnused: function(lights, submenu) {
            var emptyObject = true;
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

            if((submenu === 'addLightToScene')){
                for(var j in result){
                    emptyObject = false;
                }
                if(emptyObject){
                    $scope.sharedScope.submenu.closeSubmenu();
                    $scope.sharedScope.submenu.openSubmenu(['openScene','notificationNoLightToAdd']);
                }
            }
            return result;
        }






    };

    $scope.$watch('state.lights', function(){
        $scope.scenes.setActivatedSceneId(0);
        angular.forEach($scope.state.scenes, function(value, key){
            var active = true;
            angular.forEach($scope.state.scenes[key].lights ,function(sceneValue){
                /*
                    console.log("[SZENE] name: ",value.name, "state: ", sceneValue.state);
                    console.log("[LIGHT] name: ", $scope.state.lights[sceneValue.light].name, "state: ", $scope.state.lights[sceneValue.light].state);
                */

                if(($scope.state.lights[sceneValue.light].state.on === sceneValue.state.isOn)){
                     if(($scope.state.lights[sceneValue.light].state.effect === sceneValue.state.effect) && ($scope.state.lights[sceneValue.light].state.effect === "colorloop")){
                        <!-- colorloop is active -->

                     }else if($scope.state.lights[sceneValue.light].state.bri === sceneValue.state.bri){
                        if(($scope.state.lights[sceneValue.light].state.colormode === 'ct') && ($scope.state.lights[sceneValue.light].state.ct === sceneValue.state.ct)){
                             <!-- bri and ct is the same -->
                        }else if(($scope.state.lights[sceneValue.light].state.colormode === 'hs') &&
                                    ($scope.state.lights[sceneValue.light].state.hue === sceneValue.state.hue) &&
                                    ($scope.state.lights[sceneValue.light].state.sat === sceneValue.state.sat)){
                            <!-- bri and hue and sat is the same -->
                        }
                        else{
                            active = false;
                        }
                     }else{
                        active = false;
                     }
                }else{
                    active = false;
                }
            });

            if(active){
                $scope.scenes.setActivatedSceneId(key);
            }
            /*
                console.log("[Result] Szene: ", value.name, active)
            */
        });
    }, true);

}]);