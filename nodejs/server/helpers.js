/**
 * determine the amount of properties in an object
 * @param {object} o
 * @return {number}
 */
var objectSize = function(o) {
	
	// array
	if(Object.prototype.toString.call(o) === '[object Array]') {
		return o.length;
	}
	
	var c = 0;
	
	for(var i in o) {
		if(o.hasOwnProperty(i)) {
			c++;
		}
	}
	
	return c;
};

/**
 * deep-comparison of two objects
 * @param {object} a
 * @param {object} b
 * @return {boolean}
 */
var equals = function(a, b) {
	if(typeof(a) !== typeof(b)) {
		return false;
	}
	else if(typeof(a) !== 'object') {
		return (a === b);
	}
	else if(objectSize(a) !== objectSize(b)) {
		return false;
	}
	
	for(var i in a) {
		if(a.hasOwnProperty(i) !== b.hasOwnProperty(i)) {
			return false;
		}
		// recursive call
		if(a.hasOwnProperty(i) && !equals(a[i], b[i])) {
			return false;
		}
	}
	
	return true;
};

/**
 * Compares two objects only based on a set of root-level properties
 * @param a
 * @param b
 * @param {array} props
 * @returns {boolean}
 */
var equalsProperties = function(a, b, props) {
    var len = props.length,
        i;

    if(typeof(a) !== 'object' || typeof(props) !== 'object' || typeof(a) !== typeof(b)) {
        return false;
    }

    for(i = 0; i < len; i++) {
        if(a[i] !== b[i]) {
            return false;
        }
    }

    return true;
};

/**
 * Removes all root-level properties from an object that start with an underscore
 * @param o
 */
var cleanMongooseProperties = function(o) {
    var i;

    for(i in o) {
        if(o.hasOwnProperty(i) && i.indexOf('_') === 0) {
            delete o[i];
        }
    }
};

var copy = function(el) {
    return JSON.parse(JSON.stringify(el));
};

/**
 * Initialize basic functionality for CRUD controller
 * - load data from MongoDB into application state object
 * - add Socket.IO listeners
 * - create, update and delete in MongoDB and handle errors
 * @param app global app object
 * @param Model Mongoose data model which has to implement the getAsMap() function
 * @param name Name in app.state
 * @param socketPrefix prefix for Socket.IO messages
 *          used messages: <prefix>.create, <prefix>.update, <prefix>.delete
 * @param errorPrefix prefix for Socket.IO error notifications
 *          used notifications: <prefix>.create, <prefix>.update
 */
var initCrudTemplate = function(app, Model, name, socketPrefix, errorPrefix) {

    //
    // Fetch and cache data
    //

    app.controllers.mongoose.addQueryListener(function(callback) {
        console.log('[' + name + ' / helpers] Fetch ' + name + ' from database');

        Model.getAsMap(function(map) {
            app.state[name] = map;

            // fire callback for Mongoose remaining events counter
            callback();
        });

    });

    //
    // Add socket listeners
    //

    app.controllers.socket.addSocketListener(function(socket) {

        // create entry
        socket.on(socketPrefix + '.create', function(data) {
            console.log('[' + name + ' / helpers] Create new ' + name + ': ', data);

            new Model(data).save(function(err, entry) {
                if(err) {
                    (app.controllers.mongoose.handleError(
                        socket,
                        false,
                        false,
                        errorPrefix + '.create'
                    ))(err);
                    return;
                }

                var id = entry['_id'];
                app.state[name][id] = entry;
                app.controllers.socket.refreshState(
                    false,
                    [name + '.' + id]
                );
            });
        });

        // update entry
        socket.on(socketPrefix + '.update', function(data) {
            var id = data['_id'];

            cleanMongooseProperties(data);

            console.log('[' + name + ' / helpers] Update ' + name + ': ', data);

            Model.findByIdAndUpdate(id, data, function(err, entry) {
                if(err) {
                    (app.controllers.mongoose.handleError(
                        socket,
                        name + '.' + id,
                        app.state[name][id],
                        errorPrefix + '.update'
                    ))(err);
                    return;
                }

                app.state[name][id] = entry;
                app.controllers.socket.refreshState(
                    app.controllers.socket.getBroadcastSocket(socket),
                    [name + '.' + id]
                );
            });

        });

        // delete entry
        socket.on(socketPrefix + '.delete', function(id) {
            console.log('[' + name  + ' / helpers] Delete ' + name + ': ', id);

            Model.findByIdAndRemove(id).exec();

            delete app.state[name][id];
            app.controllers.socket.deleteFromState(
                app.controllers.socket.getBroadcastSocket(socket),
                [name + '.' + id]
            );
        });

    });

};


module.exports.equals = equals;
module.exports.equalsProperties = equalsProperties;
module.exports.cleanMongooseProperties = cleanMongooseProperties;
module.exports.initCrudTemplate = initCrudTemplate;
module.exports.copy = copy;