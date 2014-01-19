module.exports = function(app) {

    app.config.mongoDBHost = 'mongodb://localhost/hue';


    // import mongoose models

    require('../models/config');
    require('../models/favorite');
    require('../models/scene');
    require('../models/automation');

};
