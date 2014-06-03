angular.module('hueApp.controllers').
    controller('AutomationCtrl', ['$scope', '$location', 'socket', 'stateManager', function($scope, $location, socket, stateManager) {

        stateManager($scope);

        // automation control

        $scope.automation = {
            selectedProperty:{
                type:'',
                value:[]
            },




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

            setSelectedProperty: function(property){
                $scope.automation.selectedProperty = property;
                console.log($scope.automation.selectedProperty);
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
            },

            toggleActive: function(id){
                $scope.state.automation[id].active = !$scope.state.automation[id].active;
                $scope.automation.update($scope.state.automation[id]);
            },

            toggleSingle: function(id){
                $scope.state.automation[id].single = !$scope.state.automation[id].single;
                $scope.automation.update($scope.state.automation[id]);
            },

            toggleAllConditionsNeeded: function(id){
                $scope.state.automation[id].allConditionsNeeded = !$scope.state.automation[id].allConditionsNeeded;
                $scope.automation.update($scope.state.automation[id]);
            }



        };


    }]);