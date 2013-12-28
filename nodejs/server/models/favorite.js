var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;

var FavoriteSchema = new Schema({
	
	name:	String,
	
	state:	{
		
		// "on" as key not allowed by mongoose
		isOn:		Boolean,
		
		bri: {
			type:	Number,
			min:	0,
			max:	254
		},
		
		hue: {
			type:	Number,
			min:	0,
			max:	65535
		},
		
		sat: {
			type:	Number,
			min:	0,
			max:	254
		},
		
		ct: {
			type:	Number,
			min:	153,
			max:	500
		},
		
		effect: {
            type: String,
            enum: ['none', 'colorloop']
        }
		
	}
	
});

FavoriteSchema.statics.getAsMap = function(callback) {

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

mongoose.model('Favorite', FavoriteSchema);
