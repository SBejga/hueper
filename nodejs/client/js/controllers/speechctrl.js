angular.module('hueApp.controllers').
controller('SpeechCtrl', ['$scope','socket', 'stateManager', function($scope, socket, stateManager) {

    stateManager($scope);

    $scope.speech = {

        testTimeout: 60,

        activateTestMode: function() {
            if($scope.state.speech.testMode) {

                $scope.sharedScope.config.change({speechRecognition : true});
                return;
            }

            socket.emit('speech.testMode', $scope.speech.testTimeout);

            $scope.state.speech.testMode = true;
        }

    };

}]);