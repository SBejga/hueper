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

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [rev. #1]

var shuffle = function(v){
    for(var j, x, i = v.length; i; j = parseInt(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
    return v;
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

/**
 * Creates a deep copy of a passed object or array
 * @param el
 * @returns {*}
 */
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
 * @param prefix prefix for Socket.IO messages, error notifications and fired events
 *          used messages: <prefix>.create, <prefix>.update, <prefix>.delete
 *          used error notifications: <prefix>.create, <prefix>.update
 *          used events: <prefix>.ready
 * @param loadCallback function that is executed when the data is loaded
 */
var initCrudTemplate = function(app, Model, name, prefix, loadCallback) {

    var createListeners = [],
        updateListeners = [],
        deleteListeners = [];

    //
    // Fetch and cache data
    //

    app.events.on('mongodb.ready', function() {
        console.log('[' + name + ' / helpers] Fetch ' + name + ' from database');

        Model.getAsMap(function(map) {
            app.state[name] = map;
            app.events.fire(prefix + '.ready');

            if(loadCallback) {
                loadCallback();
            }

            // broadcast state refresh in case MongoDB starts after clients are already connected
            app.controllers.socket.refreshState(false, name);
        });

    });

    //
    // Add socket listeners
    //

    app.controllers.socket.addSocketListener(function(socket) {

        // create entry
        socket.on(prefix + '.create', function(data) {
            console.log('[' + name + ' / helpers] Create new ' + name + ': ', data);

            new Model(data).save(function(err, entry) {
                if(err) {
                    (app.controllers.mongoose.handleError(
                        socket,
                        false,
                        false,
                        prefix + '.create'
                    ))(err);
                    return;
                }

                var id = entry['_id'];
                app.state[name][id] = entry;
                app.controllers.socket.refreshState(
                    false,
                    [name + '.' + id]
                );

                createListeners.forEach(function(listener) {
                   listener(entry);
                });
            });
        });

        // update entry
        socket.on(prefix + '.update', function(data) {
            var id = data['_id'];

            cleanMongooseProperties(data);

            console.log('[' + name + ' / helpers] Update ' + name + ' ' + id + ': ', data);

            Model.findByIdAndUpdate(id, data, function(err, entry) {
                if(err) {
                    (app.controllers.mongoose.handleError(
                        socket,
                        name + '.' + id,
                        app.state[name][id],
                        prefix + '.update'
                    ))(err);
                    return;
                }

                app.state[name][id] = entry;
                app.controllers.socket.refreshStateOfOthers(
                    socket,
                    [name + '.' + id]
                );

                updateListeners.forEach(function(listener) {
                    listener(entry);
                });
            });

        });

        // delete entry
        socket.on(prefix + '.delete', function(id) {
            console.log('[' + name  + ' / helpers] Delete ' + name + ': ', id);

            Model.findByIdAndRemove(id).exec();

            var data = copy(app.state[name][id]);

            delete app.state[name][id];
            app.controllers.socket.deleteFromStateOfOthers(
                socket,
                [name + '.' + id]
            );

            deleteListeners.forEach(function(listener) {
                listener(id, data);
            });
        });

    });


    // publish model listeners

    var returnChain = {
        on: function(event, listener) {

            switch(event) {

                case 'create':
                    createListeners.push(listener);
                    break;

                case 'update':
                    updateListeners.push(listener);
                    break;

                case 'save':
                    createListeners.push(listener);
                    updateListeners.push(listener);
                    break;

                case 'delete':
                    deleteListeners.push(listener);
                    break;

                default:
                    console.log('[' + name + ' / helpers] Invalid model listener type "' + event + '"!');

            }

            return returnChain;
        }
    };

    return returnChain;

};


module.exports.objectSize = objectSize;
module.exports.equals = equals;
module.exports.equalsProperties = equalsProperties;
module.exports.cleanMongooseProperties = cleanMongooseProperties;
module.exports.initCrudTemplate = initCrudTemplate;
module.exports.copy = copy;
module.exports.shuffle = shuffle;