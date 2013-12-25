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

module.exports.equals = equals;
module.exports.equalsProperties = equalsProperties;