angular.module('hueApp.controllers').
    controller('AutomationCtrl', ['$scope', '$location', 'socket', 'stateManager', function($scope, $location, socket, stateManager) {

        stateManager($scope);

        // automation control

        $scope.automation = {
            selectedAutomationId:0,
            selectedPropertyIndex:0,

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
                $scope.sharedScope.submenu.closeSubmenu();
            },

            createTrigger: function(trigger){
                $scope.state.automation[$scope.automation.selectedAutomationId].triggers.push(trigger);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },
            createCondition: function(condition){
                $scope.state.automation[$scope.automation.selectedAutomationId].conditions.push(condition);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },
            createAction: function(action){
                $scope.state.automation[$scope.automation.selectedAutomationId].actions.push(action);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },


            update: function(automation) {
                socket.emit('automation.update', automation);
                $scope.automation.resetSelectedProperty();
            },

            updateTrigger: function(){
                $scope.state.automation[$scope.automation.selectedAutomationId].triggers[$scope.automation.selectedPropertyIndex] = $scope.automation.selectedProperty;
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },
            updateCondition: function(){
                $scope.state.automation[$scope.automation.selectedAutomationId].conditions[$scope.automation.selectedPropertyIndex] = $scope.automation.selectedProperty;
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },
            updateAction: function(){
                $scope.state.automation[$scope.automation.selectedAutomationId].actions[$scope.automation.selectedPropertyIndex] = $scope.automation.selectedProperty;
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },


            remove: function(id) {
                socket.emit('automation.delete', id);
                delete $scope.state.automation[id];
                $scope.sharedScope.submenu.closeSubmenu();
                $scope.automation.resetSelectedProperty();
            },

            removeTrigger: function(trigger){
                $scope.state.automation[$scope.automation.selectedAutomationId].triggers.splice($scope.state.automation[$scope.automation.selectedAutomationId].triggers.indexOf(trigger), 1);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },
            removeCondition: function(condition){
                $scope.state.automation[$scope.automation.selectedAutomationId].conditions.splice($scope.state.automation[$scope.automation.selectedAutomationId].conditions.indexOf(condition), 1);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },
            removeAction: function(action){
                $scope.state.automation[$scope.automation.selectedAutomationId].actions.splice($scope.state.automation[$scope.automation.selectedAutomationId].actions.indexOf(action), 1);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
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
            },


            setSelectedPropertyIndex: function(index){
              $scope.automation.selectedPropertyIndex = index;
                console.log($scope.automation.selectedPropertyIndex);
            },

            setSelectedProperty: function(property){
                $scope.automation.selectedProperty = property;
                console.log($scope.automation.selectedProperty);
            },

            resetSelectedProperty: function(){
                $scope.automation.selectedProperty = {
                    type:'',
                    value:[]
                };
            },

            setSelectedAutomationId: function(id){
                $scope.automation.selectedAutomationId = id;
            }
        };


    }]);