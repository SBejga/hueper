var helpers	    = require('../helpers'),
    mongoose =  require('mongoose'),
    Favorite =  mongoose.model('Favorite');


module.exports = function(app) {

    app.events.once('ready', function() {
        helpers.initCrudTemplate(
            app,
            Favorite,
            'favorites',
            'favorite',
            'favorite'
        );
    });

};
