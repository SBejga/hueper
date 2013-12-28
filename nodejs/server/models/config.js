var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;

var ConfigSchema = new Schema({

    name:   String,
    value:  Schema.Types.Mixed,
    hidden: Boolean

});


mongoose.model('Config', ConfigSchema);
