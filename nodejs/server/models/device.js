var mongoose	= require('mongoose'),
    Schema		= mongoose.Schema;

var DeviceSchema = new Schema({

    address: String,

    name: String,

    lastActivity: Date

});

DeviceSchema.statics.getAsMap = function(callback) {

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

mongoose.model('Device', DeviceSchema);
