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

};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.once('ready', function() {
        init();
    });


    return {

    };

};
