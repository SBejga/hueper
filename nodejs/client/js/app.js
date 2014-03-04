angular.module('hueApp', [
    'hueApp.services',
    'hueApp.filters',
    'hueApp.controllers'
]).

config(['$routeProvider', function($routeProvider){

    $routeProvider.when('lampssandgroups.html', {templateUrl:'lampsandgroups.html', controller: 'LightAndGroupsCtrl'});
    $routeProvider.when('lamp.html:lampname', {templateUrl:'lamp.html', controller: 'MainCtrl'});
+

    $routeProvider.otherwise({redirectTo: 'index.html'});
}]);

