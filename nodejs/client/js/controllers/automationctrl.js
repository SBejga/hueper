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
               if($scope.automation.testValueContent('trigger')){
                   $scope.state.automation[$scope.automation.selectedAutomationId].triggers.push(trigger);
                   socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                   $scope.automation.resetSelectedProperty();
                   $scope.sharedScope.submenu.closeSubmenu();
               }
               else{
                   $scope.sharedScope.submenu.openSubmenu(['trigger', 'createTrigger', 'notificationValueIncomplete']);
               }
            },
            createCondition: function(condition, conditionArray){
                    if(condition.type === 'weekdays'){
                        condition.value = conditionArray.array;
                    }
                if($scope.automation.testValueContent('condition')){
                    $scope.state.automation[$scope.automation.selectedAutomationId].conditions.push(condition);
                    socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                    $scope.automation.resetSelectedProperty();
                    $scope.sharedScope.submenu.closeSubmenu();
                }else{
                    $scope.sharedScope.submenu.openSubmenu(['condition', 'createCondition', 'notificationValueIncomplete']);
                }
            },
            createAction: function(action){
                if($scope.automation.testValueContent('action')){
                    $scope.state.automation[$scope.automation.selectedAutomationId].actions.push(action);
                    socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                    $scope.automation.resetSelectedProperty();
                    $scope.sharedScope.submenu.closeSubmenu();
                }
                else{
                    $scope.sharedScope.submenu.openSubmenu(['action', 'createAction', 'notificationValueIncomplete']);
                }
            },


            update: function(automation) {
                socket.emit('automation.update', automation);
                $scope.automation.resetSelectedProperty();
            },

            updateTrigger: function(){
                if($scope.automation.testValueContent('trigger')){
                    $scope.state.automation[$scope.automation.selectedAutomationId].triggers[$scope.automation.selectedPropertyIndex] = $scope.automation.selectedProperty;
                    socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                    $scope.automation.resetSelectedProperty();
                    $scope.sharedScope.submenu.closeSubmenu();
                }
                else{
                    $scope.sharedScope.submenu.openSubmenu(['trigger', 'editTrigger', 'notificationValueIncomplete']);
                }
            },
            updateCondition: function(){
                if($scope.automation.selectedProperty.type === 'weekdays'){
                    $scope.automation.selectedProperty.value = $scope.automation.selectedPropertyIsArray.array;
                }
                if($scope.automation.testValueContent('condition')){
                    $scope.state.automation[$scope.automation.selectedAutomationId].conditions[$scope.automation.selectedPropertyIndex] = $scope.automation.selectedProperty;
                    socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                    $scope.automation.resetSelectedProperty();
                    $scope.sharedScope.submenu.closeSubmenu();
                }else{
                    $scope.sharedScope.submenu.openSubmenu(['condition', 'editCondition', 'notificationValueIncomplete']);
                }
            },
            updateAction: function(){
                if($scope.automation.testValueContent('action')){
                    $scope.state.automation[$scope.automation.selectedAutomationId].actions[$scope.automation.selectedPropertyIndex] = $scope.automation.selectedProperty;
                    socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                    $scope.automation.resetSelectedProperty();
                    $scope.sharedScope.submenu.closeSubmenu();
                }
                else{
                    $scope.sharedScope.submenu.openSubmenu(['action', 'editAction', 'notificationValueIncomplete']);
                }
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
                $scope.sharedScope.submenu.closeSubmenu();
            },
            removeCondition: function(){
                $scope.state.automation[$scope.automation.selectedAutomationId].conditions.splice($scope.automation.selectedPropertyIndex, 1);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
                $scope.sharedScope.submenu.closeSubmenu();
            },
            removeAction: function(){
                $scope.state.automation[$scope.automation.selectedAutomationId].actions.splice($scope.automation.selectedPropertyIndex, 1);
                socket.emit('automation.update', $scope.state.automation[$scope.automation.selectedAutomationId]);
                $scope.automation.resetSelectedProperty();
                $scope.sharedScope.submenu.closeSubmenu();
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
                t.value = undefined;
                switch(t.type){
                    case 'light':
                        t.value = {'relation': '>'};
                        break;
                    case 'motion':
                        t.value = {'relation': '>'};
                        break;
                    case 'time':
                        t.value = {'relation': '>'};
                        break;
                    case 'device':
                        t.value = { 'active': true};
                        break;
                    case 'rfid':
                        t.value = {'relation': '>'};
                        break;
                    case 'state':
                        t.value = {
                            state: {
                                on:true,
                                bri:254,
                                ct:359
                            }
                        };
                        break;
                }
            },
            resetActionValue: function(t) {
                t.value = {
                    state: {
                        on:true,
                        bri:254,
                        ct:359
                    }
                }
                switch(t.type){
                    case 'scene':
                        t.value = {};
                        break;

                    case 'party':
                        t.value = undefined;
                        break;

                    case 'automation':
                        t.value = {
                            active:true
                        };
                        break;

                    case 'custom':
                        t.value = '';
                        break;

                    case 'cancelDelay':
                        t.value = undefined;
                        break;
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
            },

            setSelectedProperty: function(property){
                $scope.automation.selectedProperty = property;
            },

            setSelectedPropertyIsArray: function(array){
                $scope.automation.selectedPropertyIsArray = array;
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
                        value: {
                            state: {
                                on:true,
                                bri:254,
                                ct:359
                            }
                        }
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
                if((type === 'device') && (submenu[0] === 'condition')){
                    submenu.push('deviceAlternative');
                }

                $scope.sharedScope.submenu.openSubmenu(submenu);
                $scope.automation.setSelectedAutomationId($scope.helpers.urlId);
                $scope.automation.setSelectedPropertyIndex(index);
                $scope.automation.setSelectedProperty({'type': type, 'value' : value});


                if(type === 'weekdays'){
                    $scope.automation.setSelectedPropertyIsArray({'array': value});
                }
            },

            testValueContent: function(initiator){
                var p = $scope.automation.selectedProperty;
                switch(p.type){
                    case 'light':
                        if(initiator === 'action'){
                            if((p.value != undefined) && (p.value.id != undefined) && (p.value.state != undefined)){
                                return true;
                            }else{
                                return false;
                            }
                        }else{
                            if((p.value.relation != undefined) && (p.value.threshold != undefined)){
                            if(p.value.threshold < 0){
                                p.value.threshold = 0;
                            }else if(p.value.threshold > 100){
                                p.value.threshold = 100;
                            }
                            return true;
                        }else{
                            return false;
                        }
                        }
                        break;

                    case 'all':
                        if((p.value != undefined) && (p.value.state != undefined)){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'group':
                        if((p.value != undefined) && (p.value.id != undefined) && (p.value.state != undefined)){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'scene':
                        if((p.value != undefined) && (p.value.id != undefined)){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'motion':
                        if(initiator === 'trigger'){
                            return true;
                        }
                        if(initiator === 'condition'){
                            if(p.value.time === undefined){
                                return false;
                            }else{
                                return true;
                            }
                        }
                        break;

                    case 'speech':
                        if((p.value != undefined) && (p.value.length > 0)){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'time':
                        if((p.value != undefined) && (p.value.hour != undefined) && (p.value.minute != undefined) && (p.value.relation != undefined)){
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

                    case 'schedule':
                        if((p.value != undefined) && (p.value.hour != undefined) && (p.value.minute != undefined)){
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

                    case 'weekdays':
                        if((p.value != undefined) && p.value.length > 0){
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

                    case 'connections':
                        if(p.value === undefined){
                            p.value = false;
                            return true;
                        }else{
                            return true;
                        }
                        break;

                    case 'rfid':
                        if(initiator === 'trigger'){
                            if(p.value === undefined){
                                return false;
                            }else{
                                return true;
                            }
                        }
                        if(initiator === 'condition'){
                            if((p.value != undefined) && (p.value.id != (false || undefined)) && (p.value.relation != undefined) && (p.value.time != undefined)){
                                return true;
                            }else{
                                return false;
                            }
                        }
                        break;

                    case 'device':
                        if(initiator === 'trigger'){
                            if((p.value != undefined) && (p.value.action != undefined) && (p.value.address != undefined)){
                                return true;
                            }else{
                                return false;
                            }
                        }
                        if(initiator === 'condition'){
                            if((p.value != undefined) && (p.value.address != undefined) && (!$scope.sharedScope.submenu.visible.deviceAlternative)){
                                if(p.value.active != undefined){
                                    $scope.automation.selectedProperty = {
                                        type: 'device',
                                        value: {
                                            address: p.value.address,
                                            active: p.value.active
                                        }
                                    };
                                    return true;
                                }else{
                                    return false;
                                }
                            }else if((p.value != undefined) && (p.value.address != undefined) && ($scope.sharedScope.submenu.visible.deviceAlternative)){
                                if((p.value.relation != undefined) && (p.value.time != undefined)){
                                    $scope.automation.selectedProperty = {
                                        type: 'device',
                                        value: {
                                            address: p.value.address,
                                            relation: p.value.relation,
                                            time: p.value.time
                                        }
                                    };
                                    return true;
                                }else{
                                    return false;
                                }
                            }else{
                                return false;
                            }
                        }
                        break;

                    case 'custom':
                        if((p.value != undefined) && (p.value.length > 0)){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'state':
                        if((p.value.type != undefined) && (p.value.type != 'scene')){
                            if(((p.value.type === 'light') ||(p.value.type === 'group')) && (p.value.id === undefined)){
                                return false;
                            }else{
                                return true;
                            }
                        }else if((p.value.type != undefined) && (p.value.id != undefined)){
                            <!-- scenes -->
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'party':
                        if((p.value != undefined) && ((p.value.id != undefined) || (initiator === 'action'))){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'automation':
                        if((p.value != undefined) && (p.value.id != undefined) && (p.value.active != undefined)){
                            return true;
                        }else{
                            return false;
                        }
                        break;

                    case 'cancelDelay':
                        return true;
                        break;

                }
            }



        };


    }]);