var mongoose	= require('mongoose'),
    Schema		= mongoose.Schema;

var RfidSchema = new Schema({

    tag: String,

    name: String,

    lastUsed: Date

});

RfidSchema.statics.getAsMap = function(callback) {

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

mongoose.model('Rfid', RfidSchema);
