angular.module('hueApp.filters', []).

/**
 * Filter for associative Array-like Objects
 * usage:
 * - filterObj:<value>
 * 		find the value recursively in any of the childrens' properties (case insensitive)
 * - filterObj:{ <string:path>: <value>, ... }
 * 		find the values recursively inside the given paths
 * 		example: filterObj:{'user.name': 'Michael', 'title': 'test'}
 * - filterObj:<...>:true
 * 		property has to match completely (case sensitive)
 */
filter('filterObj', function() {
   return function(list, filter, strict) {
       var result = {};
       if(filter === undefined || filter === '') {
           return list;
       }

       var searchObject = function(obj, search) {
            var i;
            // recursive object search
            if(angular.isObject(obj)) {
                for(i in obj) {
                    if(obj.hasOwnProperty(i)) {
                        if(searchObject(obj[i], search)) {
                            return true;
                        }
                    }
                }
            }
            // recursive array search
            else if(angular.isArray(obj)) {
                i = obj.length;
                while(i--) {
                    if(searchObject(obj[i], search)) {
                        return true;
                    }
                }
            }
            // functions cannot be compared
            else if(angular.isFunction(obj)) {
                return false;
            }
            // partial comparison
            else if(obj !== undefined && obj.indexOf !== undefined && !strict) {
                return (obj.toLowerCase().indexOf(search.toLowerCase()) > -1);
            }
            // complete comparison
            else {
                return (obj === search);
            }
            return false;
       };

        angular.forEach(list, function(obj, key) {
            var i, len, objPart, pathString, path;
            try {
                // multiple search filters based on object property paths
                if(angular.isObject(filter)) {
                    for(pathString in filter) {
                        if(filter.hasOwnProperty(pathString)) {
                            path = pathString.split('.');
                            len = path.length;
                            objPart = obj;
                            for(i = 0; i < len; i++) {
                                objPart = objPart[path[i]];
                            }

                            if(!searchObject(objPart, filter[pathString])) {
                                return;
                            }
                        }
                    }
                }
                // simple recursive search through all properties
                else {
                    if(!searchObject(obj, filter)) {
                        return;
                    }
                }
            }
            // catch errors caused by invalid object paths
            catch(e) {
                return;
            }

            // add object to result
            result[key] = obj;
        });

        return result;
   }
});

