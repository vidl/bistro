/* Author: YOUR NAME HERE
*/

/*$(document).ready(function() {

  var socket = io.connect();

  $('#sender').bind('click', function() {
   socket.emit('message', 'Message Sent on ' + new Date());     
  });

  socket.on('server_message', function(data){
   $('#receiver').append('<li>' + data + '</li>');  
  });
});*/


function CashboxController($scope, $http) {
    $scope.articles = [];

    $scope.total = { chf: 0, eur: 0};

    var clearOrder = function() {
        angular.forEach($scope.articles, function(article){
            article.ordered = 0;
        });
        $scope.total.chf = 0;
        $scope.total.eur = 0;

    };

    $http.get('/articles').success(function(data){
        $scope.articles = data;
        clearOrder();
    });


    var resetGiven = function() {
        $scope.lastOrderAmount = undefined;
        $scope.given = '';
    };

    $scope.add = function(article) {
        if ($scope.isAvailable(article)) {
            resetGiven();
            article.ordered++;
            article.available--;
            $scope.total.chf += article.price.chf;
            $scope.total.eur += article.price.eur;
        }
    };

    $scope.remove = function(article) {
        resetGiven();
        article.ordered--;
        article.available++;
        $scope.total.chf -= article.price.chf;
        $scope.total.eur -= article.price.eur;
    };


    $scope.order = function(currency) {
        // todo: send order to server
        $scope.lastOrderAmount = $scope.total[currency];
        $scope.lastOrderCurrency = currency;
        clearOrder();
    };

    $scope.isOrdered = function(article) {
        return article.ordered > 0;
    };

    $scope.isAvailable = function(article) {
        return article.available != 0;
    };

}

CashboxController.$inject = ['$scope', '$http'];