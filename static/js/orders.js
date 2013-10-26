/**
 * Created by dnyffenegger on 26.10.13.
 */


function OrdersController($scope, $http, messageService) {

    $http.get('/orders')
        .success(function(orders){
           $scope.orders = orders;
        });

    $scope.select = function(order) {
        $scope.selectedOrder = order;
    };

    $scope.isSelected = function(order) {
        return $scope.selectedOrder && $scope.selectedOrder._id == order._id;
    };

    $scope.remove = function() {
        $http.delete('/orders/' + $scope.selectedOrder._id).success(function(){
            messageService.info('Bestellung erfolgreich gelöscht');
            for (var i = 0; i < $scope.orders.length; i++) {
                if ($scope.orders[i]._id == $scope.selectedOrder._id) {
                    $scope.orders.splice(i, 1);
                    break;
                }
            }
            $scope.selectedOrder = undefined;
            $scope.removeEnabled = false;
        })
    }

}

OrdersController.$inject = ['$scope', '$http', 'messageService'];
