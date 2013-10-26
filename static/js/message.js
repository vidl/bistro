/**
 * Created by dnyffenegger on 26.10.13.
 */

function MessageController($scope, $timeout, messageService) {

    messageService.listen($scope, function(type, msg){
       $scope.type = type || 'info';
       $scope.msg = msg;
       $timeout($scope.dismiss, 2000);
    });

    $scope.dismiss = function() {
        $scope.msg = undefined;
        $scope.type = undefined;
    };
}

MessageController.$inject = ['$scope', '$timeout', 'messageService'];
