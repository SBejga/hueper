angular.module('hueApp.controllers').
controller('SceneCtrl', ['$scope', function($scope) {

    $scope.speech = {

        testTimeout: 60,

        activateTestMode: function() {
            if($scope.state.speech.testMode) {
                return;
            }

            socket.emit('speech.testMode', $scope.speech.testTimeout);

            $scope.state.speech.testMode = true;
        }

    };

}]);