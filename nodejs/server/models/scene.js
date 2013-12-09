var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;

var LightStateSchema = new Schema({
	
	light:	Number,
	
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

var SceneSchema = new Schema({
	name: 	String,
	lights:	[LightStateSchema]
});

mongoose.model('Scene', SceneSchema);
