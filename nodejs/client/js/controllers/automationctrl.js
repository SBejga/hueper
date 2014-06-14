angular.module('hueApp.controllers').
    controller('AutomationCtrl', ['$scope', '$location', 'socket', 'stateManager', function($scope, $location, socket, stateManager) {

        stateManager($scope);

        // automation control

        $scope.automation = {
            selectedAutomationId:0,
            selectedPropertyIndex:0,
            saveChanges:false,

            selectedProperty:{
                type:'',
                value:undefined
            },

            selectedPropertyIsArray:{
                array:[]
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
               if($scope.automation.testValueContent()){
                   $scope.state.automation[$scope.automation.selectedAutomationId].triggers.push(trigger);
                   socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                   $scope.automation.resetSelectedProperty();
                   $scope.sharedScope.submenu.closeSubmenu();
               }
               else{
                   $scope.sharedScope.submenu.openSubmenu(['notificationValueIncomplete', 'trigger', 'createTrigger']);
               }
            },
            createCondition: function(condition, conditionArray){
                if(condition.type === 'weekdays'){
                    condition.value = conditionArray.array;
                }
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
                if($scope.automation.testValueContent()){
                    $scope.state.automation[$scope.automation.selectedAutomationId].triggers[$scope.automation.selectedPropertyIndex] = $scope.automation.selectedProperty;
                    socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                    $scope.automation.resetSelectedProperty();
                    $scope.sharedScope.submenu.closeSubmenu();
                }
                else{
                    $scope.sharedScope.submenu.openSubmenu(['notificationValueIncomplete', 'trigger', 'editTrigger']);
                }
            },
            updateCondition: function(){
                if($scope.automation.selectedProperty.type === 'weekdays'){
                    $scope.automation.selectedProperty.value = $scope.automation.selectedPropertyIsArray.array;
                }
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

            removeTrigger: function(){
                $scope.state.automation[$scope.automation.selectedAutomationId].triggers.splice($scope.automation.selectedPropertyIndex, 1);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },
            removeCondition: function(){
                $scope.state.automation[$scope.automation.selectedAutomationId].conditions.splice($scope.automation.selectedPropertyIndex, 1);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },
            removeAction: function(){
                $scope.state.automation[$scope.automation.selectedAutomationId].actions.splice($scope.automation.selectedPropertyIndex, 1);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
            },


            resetTriggerValue: function(t) {
                t.value = undefined;
                switch(t.type){
                    case 'light':
                        t.value = {'relation': '>'};
                        break;
                    case 'device':
                        t.value = {'action': 'login'};
                        break;
                }
            },
            resetConditionValue: function(t) {
                if(t.type === 'state') {
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

            resetSelectedProperty: function(initiator){
                if((initiator === 'trigger') || (initiator === 'condition') ){
                    $scope.automation.selectedProperty = {
                        type:'light',
                        value: {
                            relation:'>',
                            threshold: undefined
                        }
                    };
                    $scope.automation.selectedPropertyIsArray = {
                        array: []
                    };
                }else if(initiator === 'action'){
                    $scope.automation.selectedProperty = {
                        type:'light',
                        value: undefined
                    };
                    $scope.automation.selectedPropertyIsArray = {
                        array: []
                    };
                }

            },

            setSelectedAutomationId: function(id){
                $scope.automation.selectedAutomationId = id;
            },

            initializeProperty: function(submenu, index, type, value){
                $scope.sharedScope.submenu.openSubmenu(submenu);
                $scope.automation.setSelectedAutomationId($scope.helpers.urlId);
                $scope.automation.setSelectedPropertyIndex(index);
                $scope.automation.setSelectedProperty({'type': type, 'value' : value});
            },

            testValueContentForTrigger: function(){
                var p = $scope.automation.selectedProperty;
                switch(p.type){
                    case 'light':
                        if(p.value === undefined){
                            return false;
                        }else if((p.value.relation != undefined) && (p.value.threshold != undefined)){
                            if(p.value.threshold < 0){
                                p.value.threshold = 0;
                            }else if(p.value.threshold > 100){
                                p.value.threshold = 100;
                            }
                            return true;
                        }else{
                            return false;
                        }
                        break;
                    case 'motion':
                        return true;
                        break;

                    case 'speech':
                        if(p.value === undefined){
                            return false;
                        }else if(p.value.length > 0){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'schedule':
                        if(p.value === undefined){
                            return false;
                        }else if((p.value.hour != undefined) && (p.value.minute != undefined)){
                            if((p.value.hour < 0) || (p.value.hour > 23)){
                                p.value.hour = 8;
                            }
                            if((p.value.minute < 0) || (p.value.minute > 59)){
                                p.value.minute = 0;
                            }
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'periodical':
                        if(p.value === undefined){
                            return false;
                        }else{
                            return true;
                        }
                        break;

                    case 'rfid':
                        if(p.value === undefined){
                            return false;
                        }else{
                            return true;
                        }
                        break;

                    case 'device':
                        if((p.value.action != undefined) && (p.value.address != undefined)){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'custom':
                        if(p.value === undefined){
                            return false;
                        }else if(p.value.length > 0){
                            return true;
                        }else{
                            return false;
                        }
                        break;
                }
            },

            testValueContent: function(){
                var p = $scope.automation.selectedProperty;
                switch(p.type){
                    case 'light':
                        if(p.value === undefined){
                            return false;
                        }else if((p.value.relation != undefined) && (p.value.threshold != undefined)){
                            if(p.value.threshold < 0){
                                p.value.threshold = 0;
                            }else if(p.value.threshold > 100){
                                p.value.threshold = 100;
                            }
                            return true;
                        }else{
                            return false;
                        }
                        break;
                    case 'motion':
                        return true;
                        break;

                    case 'speech':
                        if(p.value === undefined){
                            return false;
                        }else if(p.value.length > 0){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'schedule':
                        if(p.value === undefined){
                            return false;
                        }else if((p.value.hour != undefined) && (p.value.minute != undefined)){
                            if((p.value.hour < 0) || (p.value.hour > 23)){
                                p.value.hour = 8;
                            }
                            if((p.value.minute < 0) || (p.value.minute > 59)){
                                p.value.minute = 0;
                            }
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'periodical':
                        if(p.value === undefined){
                            return false;
                        }else{
                            return true;
                        }
                        break;

                    case 'rfid':
                        if(p.value === undefined){
                            return false;
                        }else{
                            return true;
                        }
                        break;

                    case 'device':
                        if((p.value.action != undefined) && (p.value.address != undefined)){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'custom':
                        if(p.value === undefined){
                            return false;
                        }else if(p.value.length > 0){
                            return true;
                        }else{
                            return false;
                        }
                        break;
                }
            }



        };


    }]);