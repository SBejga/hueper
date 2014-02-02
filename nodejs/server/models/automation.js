﻿var mongoose	= require('mongoose'),
    Schema		= mongoose.Schema;

var AutomationSchema = new Schema({
    name:   String,

    triggers: [{
        type: {
            type:   String,
            enum:   ['light', 'motion', 'rfid', 'device', 'speech', 'schedule', 'periodical', 'custom']
        },
        value:  Schema.Types.Mixed
    }],

    conditions: [{
        type: {
            type:   String,
            enum:   ['light', 'motion', 'rfid', 'device', 'time', 'weekdays', 'connections', 'state']
        },
        value:  Schema.Types.Mixed
    }],

    allConditionsNeeded: Boolean,

    actions: [{
        type: {
            type:   String,
            enum:   ['light', 'group', 'scene', 'custom', 'cancelDelay']
        },
        value:  Schema.Types.Mixed,
        delay:  Number
    }],

    active: Boolean,

    single: Boolean
});

AutomationSchema.statics.getAsMap = function(callback) {

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

mongoose.model('Automation', AutomationSchema);