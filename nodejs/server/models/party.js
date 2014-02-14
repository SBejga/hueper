var mongoose	= require('mongoose'),
    Schema		= mongoose.Schema;

var PartySchema = new Schema({
    name:   String,

    trigger: {
        type: String,
        enum: ['sound', 'time']
    },

    timeSettings: {
        min: Number,
        max: Number
    },

    soundSettings: {
        maxBpm: Number
    },

    lights: [Number],

    fadeTime: {
        min: Number,
        max: Number
    },

    states: [{
        bri: {
            min: Number,
            max: Number
        },
        hue: {
            min: Number,
            max: Number
        },
        sat: {
            min: Number,
            max: Number
        },
        ct: {
            min: Number,
            max: Number
        }
    }],

    lightsPerStep: {
        min: Number,
        max: Number
    },

    randomLightOrder: Boolean,
    randomStateOrder: Boolean,
    sameState: Boolean
});

PartySchema.statics.getAsMap = function(callback) {

    this.find(function(err, entries) {
        var map = {},
            len = entries.length,
            i;

        for(i = 0; i < len; i++) {
            map[entries[i]['_id']] = entries[i];
        }

        callback(map);
    });

};

mongoose.model('Party', PartySchema);
