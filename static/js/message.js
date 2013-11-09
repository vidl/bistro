/**
 * Created by dnyffenegger on 26.10.13.
 */

function MessageController($scope, $timeout, messageService, socketIo) {


    var setMessage = function (type, msg) {
        $scope.type = type || 'info';
        $scope.msg = msg;
        $timeout($scope.dismiss, 2000);
    };
    messageService.listen($scope, setMessage);

    socketIo.on('message', $scope, function(data){
        setMessage(data.type, data.msg);
    });

    $scope.dismiss = function() {
        $scope.msg = undefined;
        $scope.type = undefined;
    };
}

MessageController.$inject = ['$scope', '$timeout', 'messageService', 'socketIo'];
