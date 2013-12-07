/**
 * Created by dnyffenegger on 26.10.13.
 */


function OrdersController($scope, $http, messageService) {

    var calcTotal = function() {
        $scope.total = {
            cash: {},
            voucher: {
                amount: 0,
                currency: '',
                count: 0
            },
            volume: {},
            kitchenOrderCount: 0,
            orderCount: 0,
            articleCounts: {}
        };

        angular.forEach($scope.orders, function(order){
            $scope.total.orderCount++;
            if (order.kitchen){
                $scope.total.kitchenOrderCount++;
            }
            if (order.voucher) {
                $scope.total.voucher.amount += order.total;
                $scope.total.voucher.currency = order.currency;
                $scope.total.voucher.count++;
            } else {
                var cash = $scope.total.cash[order.currency] || 0;
                cash += order.total;
                $scope.total.cash[order.currency] = cash;
            }

            angular.forEach(order.articles, function(article){
                var articleCount = $scope.total.articleCounts[article.name] || 0;
                articleCount += article.ordered;
                $scope.total.articleCounts[article.name] = articleCount;
                angular.forEach(article.price, function(price, currency){
                    var volume = $scope.total.volume[currency] || 0;
                    volume += price * article.ordered;
                    $scope.total.volume[currency] = volume;
                });
            });
        })
    }

    $http.get('/orders')
        .success(function(orders){
           $scope.orders = orders;
            calcTotal();
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
    };


}

OrdersController.$inject = ['$scope', '$http', 'messageService'];
