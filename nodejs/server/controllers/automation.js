﻿var helpers     = require('../helpers'),
    mongoose    =  require('mongoose'),
    Automation  =  mongoose.model('Automation'),
    app;

var delayedActions = [];


var init = function() {

    helpers.initCrudTemplate(
        app,
        Automation,
        'automation',
        'automation',
        'automation'
    );

    // time event for schedule and periodical triggers
    setInterval(function() {
        fireEvent('time');
    }, 60000);

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
                return (trigger.type === 'rfid' && trigger.value === value);

                break;

            /*
             * WLAN device
             * {action: login/logout, address: ...}
             */
            case 'wlan':
                return (trigger.type === 'wlan' && helpers.equals(trigger.value, value));

                break;

            /*
             * speech command
             * command string
             */
            case 'speech':
                return (triger.type === 'speech' && trigger.value.indexOf(value) > -1);

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
                    return (date.getHours() === trigger.value.hours && date.getMinutes() === trigger.value.minutes);
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
    var i = automation.conditions.length,
        cond;

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

    return (automation.allConditionsNeeded ? true : false);
};

/**
 * Evaluate single condition
 * @param condition
 * @return {bool} condition is true
 */
var evaluateSingleCondition = function(condition) {
    var i, j;

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

                var hasState = false;

                var compareLightState = function(lightId, state) {
                    var light = app.state.lights[lightId],
                        i;

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
                            if(state[i] !== null && state[i] !== light.state[i]) {
                                return false;
                            }
                        }
                    }

                    return true;
                };

                switch(condition.value.type) {

                    // state of single light
                    case 'light':

                        hasState = compareLightState(condition.value.id, condition.value.state);

                        break;

                    // state of all lights
                    case 'all':

                        for(i in app.state.lights) {
                            if(app.state.lights.hasOwnProperty(i)) {
                                if(!compareLightState(i, condition.value.state)) {
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
                                if(app.state.lights[i].state.on && !compareLightState(i, condition.value.state)) {
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
                            if(!compareLightState(group.lights[i], condition.value.state)) {
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


            // TODO add rfid, wlan


        }
    }
    catch(e) {
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
                app.controllers.hue.setLightState(action.value.id, action.value.state, true);
            };

            break;

        // change group state
        case 'group':

            actionFn = function() {
                app.controllers.hue.setGroupLightState(action.value.id, action.value.state, true);
            };

            break;

        // apply scene
        case 'scene':

            actionFn = function() {
                app.controllers.scenes.applyScene(action.value.id, action.value.transition);
            };

            break;

        // fire custom event
        case 'custom':

            actionFn = function() {
                fireEvent(action.value);
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
            delayedActions.shift();
            actionFn();
        }, action.delay*1000);
        delayedActions.push(timeout);
    }

};



module.exports = function(globalApp) {

    app = globalApp;

    app.events.once('ready', function() {
        init();
    });


    return {
        fireEvent: fireEvent
    };

};
