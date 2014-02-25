module.exports = function(app) {

    app.config.mongoDBHost = 'mongodb://localhost/hue';


    // import mongoose models
    require('fs').readdirSync(__dirname + '/../models').forEach(function(file) {
        if(file.match(/\.js$/) !== null) {
            require('../models/' + file.replace(/\.js$/, ''));
        }
    });

};
