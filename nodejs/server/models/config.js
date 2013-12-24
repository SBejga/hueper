var mongoose	= require('mongoose');
var Schema		= mongoose.Schema;

var ConfigSchema = new Schema({

    name:   String,
    value:  Schema.Types.Mixed

});


mongoose.model('Config', ConfigSchema);
