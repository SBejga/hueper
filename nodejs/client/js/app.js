angular.module('hueApp', [
    'hueApp.services',
    'hueApp.filters',
    'hueApp.controllers'
]).

config(['$routeProvider', function($routeProvider){

    $routeProvider.when('lampsandgroups.html', {templateUrl:'lampsandgroups.html', controller: 'LampsAndGroups'});
    $routeProvider.when('lamp.html:lampname', {templateUrl:'lamp.html', controller: 'Lamp'});

}]);

