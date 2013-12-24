var app;

module.exports = function(globalApp) {

    app = globalApp;

    app.config.mongoDBHost = 'mongodb://localhost/hue';

};