/*
 * Default application configuration
 * Applied after first connection to MongoDB
 */

module.exports = function(app) {

    var	mongoose	= require('mongoose'),
        Config      = mongoose.model('Config'),
        i,

        defaultConfig = [

            // application password
            {
                name: 'password',
                value: null,
                hidden: true
            },

            // Hue lights transition time
            {
                name: 'transition',
                value: 4,
                hidden: false
            }

        ];


    // hidden values are cached in app.config, visible values in app.state.appConfig

    for(i = 0; i < defaultConfig.length; i++) {
        if(defaultConfig[i].hidden) {
            if(typeof(app.config[defaultConfig[i].name]) === 'undefined') {
                console.log('[config/application] Saving default configuration for ' + defaultConfig[i].name);
                app.config[defaultConfig[i].name] = defaultConfig[i].value;
                new Config(defaultConfig[i]).save();
            }
        }
        else {
            if(typeof(app.state.appConfig[defaultConfig[i].name]) === 'undefined') {
                console.log('[config/application] Saving default configuration for ' + defaultConfig[i].name);
                app.state.appConfig[defaultConfig[i].name] = defaultConfig[i].value;
                new Config(defaultConfig[i]).save();
            }
        }
    }

};