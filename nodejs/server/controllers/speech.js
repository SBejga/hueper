var speechGoogle = require('../modules/speech_google'),
    speechJulius = require('../modules/speech_julius'),

    speakable,
    julius,

    speechActive = false,
    speechEngine = 'julius',

    app;


var init = function() {

    speechActive = app.state.appConfig.speechRecognition;
    speechEngine = app.state.appConfig.speechRecognitionEngine;


    app.controllers.socket.addSocketListener(socketListener);
    app.controllers.app_configuration.addConfigurationChangeListener(configurationChangeListener);


    // initialize google
    speakable = new speechGoogle(app);

    speakable.on('error', function(err) {
        console.log('[speech] Speakable error:', err);

        if(speechActive && speechEngine === 'google') {
            setTimeout(function() {
                speakable.start();
            }, 5000);
        }

    });

    speakable.on('speechResult', function(recognizedWords) {
        recognized(recognizedWords);
    });


    // initialize julius
    julius = new speechJulius();

    julius.on('recognize', function(recognizedWords) {
        recognized(recognizedWords);
    });


    // start speech recognition

    if(app.state.appConfig.speechRecognition) {
        console.log('[speech] Starting speech recognition');

        if(app.state.appConfig.speechRecognitionEngine === 'google') {
            speakable.start();
        }
        else {
            julius.start();
        }
    }

};

var socketListener = function(socket) {

    socket.on('speech.testMode', function(seconds) {
        var mseconds = (parseInt(seconds) || 30) * 1000;

        // prevent multiple timeouts
        if(app.state.speech.testMode) {
            return;
        }

        console.log('[speech] Activate test mode for ' + mseconds + 'ms');

        app.state.speech.testMode = true;
        app.controllers.socket.refreshStateOfOthers(
            socket,
            ['speech']
        );

        setTimeout(function() {
            app.state.speech.testMode = false;
            app.controllers.socket.refreshState(false, ['speech']);
        }, mseconds);

    });

};

var configurationChangeListener = function(key) {

    if(key === 'speechRecognition') {
        setActive(app.state.appConfig.speechRecognition);
    }

    else if(key === 'speechRecognitionEngine') {
        setEngine(app.state.appConfig.speechRecognitionEngine);
    }

};


/**
 * Gets called when the selected recognition engine returns a result
 * @param {string} recognizedWords
 */
var recognized = function(recognizedWords) {
    console.log('[speech] Recognized:', recognizedWords);

    if(recognizedWords) {
        app.controllers.automation.fireEvent('speech', recognizedWords);
    }

    app.state.speech.recognized = recognizedWords;

    if(app.state.speech.testMode) {
        app.controllers.socket.refreshState(false, ['speech.recognized']);
    }
};

/**
 * Turn speech recognition on or off
 * @param {boolean} active
 */
var setActive = function(active) {
    console.log('[speech] Set speech recognition to ' + active);

    if(!active && speechActive) {
        if(speechEngine === 'google') {
            speakable.stop();
        }
        else {
            julius.stop();
        }
    }
    else if(active && !speechActive) {
        if(speechEngine === 'google') {
            speakable.start();
        }
        else {
            julius.start();
        }
    }

    speechActive = active;
};

/**
 * choose the engine used for speech recognition
 * @param {string} engine google or julius
 */
var setEngine = function(engine) {
    console.log('[speech] Set speech engine to ' + engine);

    if(engine === speechEngine || !speechActive) {
        speechEngine = engine;
        return;
    }

    // stop google, start julius
    if(speechEngine === 'google') {
        speakable.stop();

        setTimeout(function() {
            julius.start();
        }, 1000);

    }

    // stop julius, start google
    else {
        julius.stop();

        setTimeout(function() {
            speakable.start();
        }, 1000);
    }

    speechEngine = engine;

};



module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('config.ready', function() {
        init();
    });

};
