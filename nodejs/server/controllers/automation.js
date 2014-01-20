var helpers     = require('../helpers'),
    mongoose    =  require('mongoose'),
    Automation  =  mongoose.model('Automation'),
    app;


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

    console.log('[automation] event fired:', event, value);

    for(i in app.state.automation) {
        if(app.state.automation.hasOwnProperty(i)) {
            if(app.state.automation[i].active && evaluateTriggers(app.state.automation[i], event, value) && evaluateConditions(app.state.automation[i])) {
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

            case 'light':
                if(trigger.type !== 'light') {
                    return false;
                }

                if(trigger.value.relation === '<') {
                    return (trigger.value.threshold < value);
                }
                else {
                    return (trigger.value.threshold >= value);
                }

                break;

            case 'motion':
                return (trigger.type === 'motion');

                break;


            // TODO add triggers

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
    // TODO
    return true;
};

/**
 * Perform action from automation entry
 * @param action
 */
var performAction = function(action) {

    // TODO delay

    switch(action.type) {

        case 'light':

            app.controllers.hue.setLightState(action.value.id, action.value.state, true);

            break;

        case 'group':

            app.controllers.hue.setGroupLightState(action.value.id, action.value.state, true);

            break;

        case 'scene':

            app.controllers.scenes.applyScene(action.value.id, action.value.transition);

            break;


        // TODO add more actions

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
