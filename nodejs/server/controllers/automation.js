var helpers     = require('../helpers'),
    mongoose    = require('mongoose'),
    Automation  = mongoose.model('Automation'),

    model,
    app,

    delayedActions = [];


var init = function() {

    model = helpers.initCrudTemplate(
        app,
        Automation,
        'automation',
        'automation'
    );

    model.on('delete', function(id, automation) {

        removeSubEntries(
            false,
            false,
            function(action) {
                return (action.type === 'automation' && action.value.id === id);
            }
        );

    });


    // time event for schedule and periodical triggers
    setTimeout(function() {
        fireEvent('time', new Date());

        setInterval(function() {
            fireEvent('time', new Date());
        }, 60000);
    }, (60 - new Date().getSeconds()) * 1000);

};

/**
 * Handle occuring events
 * @param event
 * @param value
 */
var fireEvent = function(event, value) {
    var i;

    console.log('[automation] Event fired:', event, value);

    for(i in app.state.automation) {
        if(app.state.automation.hasOwnProperty(i)) {
            if(app.state.automation[i].active && evaluateTriggers(app.state.automation[i], event, value) && evaluateConditions(app.state.automation[i])) {
                console.log('[automation] Executing automation ' + app.state.automation[i].name + '(' + i + ')');

                app.state.automation[i].actions.forEach(function(action) {
                    performAction(action);
                });

                // remove entry after execution
                if(app.state.automation[i].single) {
                    Automation.findByIdAndRemove(i).exec();
                    delete app.state.automation[i];
                    app.controllers.socket.deleteFromState(false, ['automation.'+i]);
                }

            }
        }
    }

};

/**
 * Find automation entries with a trigger associated to the current event
 * @param automation
 * @param event
 * @param value
 * @return true if the automation entry has at least one matching trigger, false otherwise
 */
var evaluateTriggers = function(automation, event, value) {
    var i = automation.triggers.length;


    while(i--) {
        if(evaluateSingleTrigger(automation.triggers[i], event, value)) {
            console.log('[automation] Trigger match found', automation.triggers[i]);
            return true;
        }
    }

    return false;
};

/**
 * Evaluate if a trigger matches to the current event
 * @param trigger
 * @param event
 * @param value
 * @return {bool}
 */
var evaluateSingleTrigger = function(trigger, event, value) {

    try {
        switch(event) {

            /*
             * light sensor
             * {relation: < / >, threshold: 0-100}
             */
            case 'light':
                if(trigger.type !== 'light') {
                    return false;
                }

                if(trigger.value.relation === '<') {
                    return (value < trigger.value.threshold);
                }
                else {
                    return (value >= trigger.value.threshold);
                }

                break;

            /*
             * motion sensor
             */
            case 'motion':
                return (trigger.type === 'motion');

                break;

            /*
             * RFID/NFC tag
             * Tag-ID
             */
            case 'rfid':
                return (trigger.type === 'rfid' && (!trigger.value || trigger.value === value));

                break;

            /*
             * network device
             * {action: login/logout, address: ... (optional)}
             */
            case 'device':
                if(trigger.type !== 'device' || value.action !== trigger.value.action) {
                    return false;
                }

                if(!trigger.value.address || value.address === trigger.value.address) {
                    return true;
                }

                return false;

                break;

            /*
             * speech command
             * command string
             */
            case 'speech':
                return (trigger.type === 'speech' && trigger.value && value.toLowerCase().indexOf(trigger.value.toLowerCase()) > -1);

                break;

            /*
             * time event: check periodical and scheduled events
             *
             * periodical: minutes
             * schedule: {hour: ..., minute: ...}
             *
             */
            case 'time':
                if(trigger.type === 'periodical') {
                    return ((Math.round(new Date().getTime()/60000) % trigger.value) === 0);
                }
                else if(trigger.type === 'schedule') {
                    var date = new Date();
                    return (date.getHours() === trigger.value.hour && date.getMinutes() === trigger.value.minute);
                }

                return false;

                break;

            /*
             * custom command
             * command
             */
            case 'custom':
                return (trigger.type === 'custom' && trigger.value === value);

                break;
        }
    }
    catch(e) {
        console.log('[automation] Invalid trigger!', trigger);
        return false;
    }

    return false;
};

/**
 * Evaluate conditions for an automation entry
 * based on allConditionsNeeded setting
 * @param automation
 * @return {bool} conditions are true
 */
var evaluateConditions = function(automation) {
    var i,
        cond;

    if(!automation.conditions || !automation.conditions.length) {
        return true;
    }

    i = automation.conditions.length;

    while(i--) {
        cond = evaluateSingleCondition(automation.conditions[i]);
        console.log('[automation] Condition evaluated to ' + (cond ? 'TRUE' : 'FALSE'), automation.conditions[i]);

        if(!cond && automation.allConditionsNeeded) {
            return false;
        }
        else if(cond && !automation.allConditionsNeeded) {
            return true;
        }
    }

    return true;
};

/**
 * Evaluate single condition
 * @param condition
 * @return {bool} condition is true
 */
var evaluateSingleCondition = function(condition) {
    var i;

    try {
        switch(condition.type) {

            /*
             * light sensor value
             * {relation: < / >, threshold: 0-100}
             */
            case 'light':

                if(typeof(app.state.sensors.light) === 'undefined') {
                    return false;
                }

                if(condition.value.relation === '<') {
                    return (app.state.sensors.light < condition.value.threshold);
                }
                else {
                    return (app.state.sensors.light >= condition.value.threshold);
                }

                break;

            /*
             * motion sensor time period
             * {relation: < / >, time: seconds}
             */
            case 'motion':
                var motionSeconds = app.controllers.arduino_sensors.getSecondsSinceLastMotion();

                // the other way around because we have seconds instead of timestamps here!
                if(condition.value.relation === '<') {
                    return (motionSeconds >= condition.value.time);
                }
                else {
                    return (motionSeconds < condition.value.time);
                }

                break;

            /*
             * time of day
             * {relation: < / >, hour: ..., minute ...}
             */
            case 'time':
                var currentDate = new Date(),
                    currentTime = currentDate.getHours()*60 + currentDate.getMinutes(),
                    conditionTime = condition.value.hour*60 + condition.value.minute;

                if(condition.value.relation === '<') {
                    return (currentTime < conditionTime);
                }
                else {
                    return (currentTime >= conditionTime);
                }

                break;

            /*
             * current day of week
             * [days] 0-6, 0 is Sunday!
             */
            case 'weekdays':
                return (condition.value.indexOf(new Date().getDay()) > -1);

                break;

            /*
             * check if there are active client connections
             * boolean
             */
            case 'connections':
                var connected = !!app.controllers.socket.getConnectedUserCount();

                return (condition.value ? connected : !connected);

                break;

            /*
             * current state of light, group or scene
             * {type: light/all/active/group/scene, id: (light, group, scene), state: { ... } invert: boolean}
             */
            case 'state':

                var hasState = true;

                var compareLightState = function(lightId, state, acceptSimilar) {
                    var light = app.state.lights[lightId],

                        similarDeltas = {
                            bri: 20,
                            ct: 20,
                            hue: 3000,
                            sat: 20
                        },

                        i;

                    // convert Mongoose object to standard object
                    state = helpers.copy(state);

                    // convert scene isOn to bridge on propertry
                    if(state.isOn !== undefined) {
                        state['on'] = state.isOn;
                        delete state.isOn;
                    }

                    // reject unknown or unreachable lights
                    if(typeof(light) === 'undefined' || !light.state.reachable) {
                        return false;
                    }

                    // reject turned off lights if state depends only on other properties
                    if(typeof(state.on) === 'undefined' && !light.state.on) {
                        return false;
                    }

                    for(i in state) {
                        if(state.hasOwnProperty(i)) {

                            // check for similar value
                            if(acceptSimilar && similarDeltas[i] !== undefined) {
                                if(Math.abs(state[i] - light.state[i]) > similarDeltas[i]) {
                                    return false;
                                }
                            }
                            // check for exact value
                            else if(state[i] !== null && state[i] !== light.state[i]) {
                                return false;
                            }

                        }
                    }

                    return true;
                };

                switch(condition.value.type) {

                    // state of single light
                    case 'light':

                        hasState = compareLightState(condition.value.id, condition.value.state, true);

                        break;

                    // state of all lights
                    case 'all':

                        for(i in app.state.lights) {
                            if(app.state.lights.hasOwnProperty(i)) {
                                if(!compareLightState(i, condition.value.state, true)) {
                                    hasState = false;
                                    break;
                                }
                            }
                        }

                        break;

                    // state of all lights that are turned on
                    case 'active':

                        for(i in app.state.lights) {
                            if(app.state.lights.hasOwnProperty(i)) {
                                if(app.state.lights[i].state.on && !compareLightState(i, condition.value.state, true)) {
                                    hasState = false;
                                    break;
                                }
                            }
                        }

                        break;

                    // state of all lights in a group
                    case 'group':
                        var group = app.state.groups[condition.value.id];

                        if(typeof(group) === 'undefined') {
                            hasState = false;
                            break;
                        }

                        i = group.lights.length;

                        while(i--) {
                            if(!compareLightState(group.lights[i], condition.value.state, true)) {
                                hasState = false;
                                break;
                            }
                        }

                        break;

                    // state that equals a scene
                    case 'scene':
                        var scene = app.state.scenes[condition.value.id];

                        if(typeof(scene) === 'undefined') {
                            hasState = false;
                            break;
                        }

                        i = scene.lights.length;

                        while(i--) {
                            if(!compareLightState(scene.lights[i].light, scene.lights[i].state)) {
                                hasState = false;
                                break;
                            }
                        }

                        break;

                }

                return (condition.value.invert ? !hasState : hasState);

                break;

            /*
             * last time a RFID/NFC tag was used
             */
            case 'rfid':
                // if value.id is falsy, the last use of any tag is returned
                var rfidSeconds = app.controllers.rfid.getSecondsSinceLastUse(condition.value.id);

                // the other way around because we have seconds instead of timestamps here!
                if(condition.value.relation === '<') {
                    return (rfidSeconds >= condition.value.time);
                }
                else {
                    return (rfidSeconds < condition.value.time);
                }

                break;

            /*
             * network device currently active
             * or last activity
             */
            case 'device':

                // check current activity
                if(condition.value.active !== undefined) {

                    // single device
                    if(condition.value.address) {
                        return (!!app.controllers.devices.getStatus(condition.value.address) === condition.value.active);
                    }
                    // any device
                    else {
                        return (app.controllers.devices.isOneActive() === condition.value.active)
                    }

                }
                // check time since last actitvity
                else {

                    // if value.id is falsy, the last use of any device is returned
                    var deviceMinutes = app.controllers.devices.getMinutesSinceLastActivity(condition.value.address);

                    // the other way around because we have minutes instead of timestamps here!
                    if(condition.value.relation === '<') {
                        return (deviceMinutes >= condition.value.time);
                    }
                    else {
                        return (deviceMinutes < condition.value.time);
                    }

                }

                break;

            /**
             * Party mode currently active
             */
            case 'party':
                var isPartyModeRunning = !!app.state.appConfig.partyMode;

                if(condition.value.id) {
                    isPartyModeRunning = (app.state.appConfig.partyMode === condition.value.id);
                }
                // no party mode running
                else {
                    isPartyModeRunning = !isPartyModeRunning;
                }

                return (condition.value.invert ? !isPartyModeRunning : isPartyModeRunning);

        }
    }
    catch(e) {
        console.log('[automation] Condition error', e);
        console.log('[automation] Invalid condition!', condition);
        return false;
    }

    return false;
};

/**
 * Perform action from automation entry
 * @param action
 */
var performAction = function(action) {
    var actionFn = function() {},
        timeout;

    console.log('[automation] Executing action:', action);

    switch(action.type) {

        // change light state
        case 'light':

            actionFn = function() {
                // all lights
                if(!action.value.id || action.value.id == '0') {
                    app.controllers.hue.setLightStateAll(action.value.state, true);
                }
                // single light
                else {
                    app.controllers.hue.setLightState(action.value.id, action.value.state, true);
                }
            };

            break;

        // change group state
        case 'group':

            actionFn = function() {
                app.controllers.hue.setGroupLightState(action.value.id, action.value.state, true);
            };

            break;

        // change state for all lights
        case 'all':

            actionFn = function() {
                app.controllers.hue.setLightStateAll(action.value.state, true);
            };

            break;

        // apply scene
        case 'scene':

            actionFn = function() {
                app.controllers.scenes.applyScene(action.value.id, action.value.transition);
            };

            break;

        // start/stop party mode
        case 'party':

            actionFn = function() {
                if(action.value) {
                    app.controllers.party.start(action.value);
                }
                else {
                    app.controllers.party.stop();
                }
            };

            break;

        // (de)activate automation entry
        case 'automation':

            actionFn = function() {
                if(!action.value.id) {
                    return;
                }

                var automation = app.state.automation[action.value.id];

                if(!automation) {
                    return;
                }

                // simply invert active flag
                var newActive = !automation.active;

                // alternatively set active flag to a given value
                if(action.value.active === true || action.value.active === false) {
                    newActive = action.value.active;
                }

                automation.active = newActive;

                automation.save(function(err) {
                   app.controllers.socket.refreshState(false, 'automation.' + action.value.id + '.active');
                });

            };

            break;

        // fire custom event
        case 'custom':

            actionFn = function() {
                fireEvent('custom', action.value);
            };

            break;

        // cancel all pending delayed events
        case 'cancelDelay':

            actionFn = function() {
                delayedActions.forEach(function(a) {
                    clearTimeout(a);
                });
                delayedActions = [];
            };

            break;

    }

    // execute immediately or add to delay queue

    if(!action.delay) {
        actionFn();
    }
    else {
        timeout = setTimeout(function() {
            console.log('[automation] Executing delayed action:', action);
            actionFn();
            delayedActions.shift();
        }, action.delay*1000);
        delayedActions.push(timeout);
    }

};

/**
 * removes triggers, conditions and actions from all automation entries that pass given evaluation functions
 * if all triggers of an entry are deleted, the entry itself will also be deleted
 * @param {function} triggerEvaluation gets a trigger as parameter
 * @param {function} conditionEvaluation gets a condition as parameter
 * @param {function} actionEvaluation gets an action as parameter
 */
var removeSubEntries = function(triggerEvaluation, conditionEvaluation, actionEvaluation) {
    var i, j, modified, remove,
        refreshState = [],
        deleteState = [];

    for(i in app.state.automation) {
        if(app.state.automation.hasOwnProperty(i)) {
            modified = false;
            remove = false;

            // triggers
            j = app.state.automation[i].triggers.length;

            while(j--) {
                if(triggerEvaluation && triggerEvaluation(app.state.automation[i].triggers[j])) {
                    app.state.automation[i].triggers.splice(j, 1);
                    modified = true;
                }
            }

            // conditions
            j = app.state.automation[i].conditions.length;

            while(j--) {
                if(conditionEvaluation && conditionEvaluation(app.state.automation[i].conditions[j])) {
                    app.state.automation[i].conditions.splice(j, 1);
                    modified = true;
                }
            }

            // actions
            j = app.state.automation[i].actions.length;

            while(j--) {
                if(actionEvaluation && actionEvaluation(app.state.automation[i].actions[j])) {
                    app.state.automation[i].actions.splice(j, 1);
                    modified = true;
                }
            }


            // remove automation if it was the only trigger or action
            if(!app.state.automation[i].triggers.length || !app.state.automation[i].actions.length) {
                remove = true;
            }


            if(remove) {
                Automation.findByIdAndRemove(i).exec();
                delete app.state.automation[i];
                deleteState.push('automation.' + i);
            }
            else if(modified) {
                app.state.automation[i].save();
                refreshState.push('automation.' + i);
            }
        }
    }

    // synchronize to sockets
    if(deleteState.length) {
        app.controllers.socket.deleteFromState(false, deleteState);
    }
    if(refreshState.length) {
        app.controllers.socket.refreshState(false, refreshState);
    }
};



module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });


    return {
        fireEvent: fireEvent,
        removeSubEntries: removeSubEntries
    };

};
