var helpers  = require('../helpers'),
    mongoose = require('mongoose'),
    Favorite = mongoose.model('Favorite'),

    model,
    app;


var init = function() {
    model = helpers.initCrudTemplate(
        app,
        Favorite,
        'favorites',
        'favorite'
    );
};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });

};
