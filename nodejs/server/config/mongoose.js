module.exports = function(app) {

    app.config.mongoDBHost = 'mongodb://localhost/hue';


    // import mongoose models

    require('../models/scene');
    require('../models/config');

};