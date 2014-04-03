var helpers     = require('../helpers'),
    mongoose    = require('mongoose'),
    Party       = mongoose.model('Party'),

    model,
    app,

    lastBeat = false,
    timeout = false,

    lightIndex,
    stateIndex;


var init = function() {

    model = helpers.initCrudTemplate(
        app,
        Party,
        'party',
        'party'
    );

    // detect change of currently active party mode

    model.on('update', function(data) {

        if(!app.state.appConfig.partyMode || app.state.appConfig.partyMode !== data['_id']) {
            return;
        }

        // clear timeout when trigger changed to sound
        if(data.trigger === 'sound' && timeout) {
            clearTimeout(timeout);
            timeout = false;
        }
        // initiate timeout when trigger changed to time
        else if(data.trigger === 'time' && !timeout) {
            // delay a bit so the data is present in app.state
            timeout = setTimeout(startPartyMode, 5000);
        }

    });

    model.on('delete', function(id, party) {

        app.controllers.automation.removeSubEntries(
            false,
            function(condition) {
                return (condition.type === 'party' && condition.value.id === id);
            },
            function(action) {
                return (action.type === 'party' && action.value === id);
            }
        );

        // stop party mode when deleted
        if(app.state.appConfig.partyMode === id) {
            app.state.appConfig.partyMode = false;
            app.controllers.socket.refreshState(false, 'appConfig.partyMode');
        }

    });

    app.controllers.arduino.addListener(arduinoListener);

    app.controllers.app_configuration.addConfigurationChangeListener(configurationChangeListener);

    // start party mode after party settings and configuration was loaded
    app.events.on('config.ready party.ready', startPartyMode);
};

/**
 * Listens for beat messages from the arduino
 * @param message
 */
var arduinoListener = function(message) {
    var maxBpm = false,
        now;

    if(message.action === 'beat' && app.state.appConfig.partyMode && app.state.party[app.state.appConfig.partyMode] && app.state.party[app.state.appConfig.partyMode].trigger === 'sound') {

        now = new Date().getTime();

        // apply max BPM filter
        if(app.state.party[app.state.appConfig.partyMode].soundSettings) {
            maxBpm = app.state.party[app.state.appConfig.partyMode].soundSettings.maxBpm;
        }

        if(lastBeat && now - lastBeat < 60000 / maxBpm) {
            return;
        }

        lastBeat = now;

        applyStep();
    }

};

/**
 * Listens for (de)activation and changes to the selected party mode
 * @param key
 */
var configurationChangeListener = function(key) {
    if(key === 'partyMode') {
        if(timeout) {
            clearTimeout(timeout);
            timeout = false;
        }

        if(app.state.appConfig.partyMode && app.state.party[app.state.appConfig.partyMode] && app.state.party[app.state.appConfig.partyMode].trigger === 'time') {
            startPartyMode();
        }

        // refresh lighs state when party mode stopped
        if(!app.state.appConfig.partyMode) {
            app.controllers.socket.refreshState(false, ['lights']);
        }
    }
};


var startPartyMode = function() {
    if(timeout) {
        clearTimeout(timeout);
        timeout = false;
    }

    lightIndex = 0;
    stateIndex = 0;

    applyStep();
};

var applyStep = function() {
    var partyMode;

    if(!app.state.appConfig.partyMode || !app.state.party[app.state.appConfig.partyMode]) {
        return;
    }

    console.log('[party] Applying step');

    partyMode = app.state.party[app.state.appConfig.partyMode];

    // schedule next step when running on time-triggered mode
    if(partyMode.trigger === 'time') {
        timeout = setTimeout(applyStep, getRandomValue(partyMode.timeSettings, 10)*100);
    }

    // abort when party mode setting is invalid or Hue Bridge is not connected
    if(!partyMode.lights || !partyMode.lights.length || !partyMode.states || !partyMode.states.length) {
        return;
    }

    if(!app.state.connect.hue || !app.state.lights || !helpers.objectSize(app.state.lights)) {
        return;
    }

    // determine affected lights

    var numberOfLights = getRandomValue(partyMode.lightsPerStep, 1),
        allLights = partyMode.lights.slice(0),  // creates a copy of the array
        affectedLights = [];

    if(allLights.length <= numberOfLights) {
        affectedLights = allLights;
    }
    else {
        if(partyMode.randomLightOrder) {
            affectedLights = helpers.shuffle(allLights).slice(0, numberOfLights);
        }
        else {
            while(numberOfLights--) {
                if(lightIndex >= partyMode.lights.length) {
                    lightIndex = 0;
                }

                affectedLights.push(partyMode.lights[lightIndex]);
                lightIndex++;
            }
        }
    }

    // generate affected states

    var firstState = false;

    affectedLights.forEach(function(light) {

        // apply same state to every light
        if(partyMode.sameState && firstState) {
            app.controllers.hue.setLightState(light, firstState, false);
            return;
        }

        var state;

        if(partyMode.randomStateOrder) {
            state = partyMode.states[Math.round(Math.random() * (partyMode.states.length-1))];
        }
        else {
            if(stateIndex >= partyMode.states.length) {
                stateIndex = 0;
            }

            state = partyMode.states[stateIndex];
            stateIndex++;
        }


        var newState = {},
            bri = getRandomValue(state.bri, false),
            hue = getRandomValue(state.hue, false),
            sat = getRandomValue(state.sat, false),
            ct = getRandomValue(state.ct, false),
            transitiontime = getRandomValue(partyMode.fadeTime, false);


        if(bri !== false) {
            newState.bri = bri;
        }
        if(hue !== false) {
            newState.hue = hue;
        }
        if(sat !== false) {
            newState.sat = sat;
        }
        if(ct !== false) {
            newState.sat = false;
        }
        if(transitiontime !== false) {
            newState.transitiontime = transitiontime;
        }

        app.controllers.hue.setLightState(light, newState, false);

        // save first state for other lights
        if(partyMode.sameState && !firstState) {
            firstState = newState;
        }

    });

};

/**
 * get a random value in a range determined by two object properties
 * @param o
 * @param fallbackValue defaults to 0
 * @param min defaults to 'min'
 * @param max defaults to 'max'
 * @returns
 *  if one property is undefined or not a number, the other gets returned
 *  if both are, the fallback value is returned
 *  else a random rounded number between within the range is returned
 */
var getRandomValue = function(o, fallbackValue, min, max) {
    min = min || 'min';
    max = max || 'max';

    if(fallbackValue === undefined) {
        fallbackValue = 0;
    }

    if(!o) {
        return fallbackValue;
    }

    var minValue = parseInt(o[min]),
        maxValue = parseInt(o[max]);

    // only one or no properties valid
    if(isNaN(minValue)) {
        if(isNaN(maxValue)) {
            return fallbackValue;
        }
        return maxValue;
    }
    if(isNaN(maxValue)) {
        if(isNaN(minValue)) {
            return fallbackValue;
        }
        return minValue;
    }

    return Math.round(minValue + Math.random()*(maxValue-minValue));
};




module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });

    return {

        start: function(id) {
            if(!app.state.party[id]) {
                console.log('[party] Party mode ' + id + ' does not exist!');
                return;
            }

            console.log('[party] Starting party mode ' + id);

            app.controllers.app_configuration.change({
                partyMode: id
            });
        },

        stop: function() {
            console.log('[party] Stopping party mode');

            app.controllers.app_configuration.change({
                partyMode: false
            });
        }

    }

};
