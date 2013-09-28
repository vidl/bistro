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


function CashboxController($scope) {
    $scope.articles = [
        { id: 1, name: 'Menü 1', price: { chf: 510, eur: 340}, available: 2, ordered: 0},
        { id: 2, name: 'Menü 2', price: { chf: 780, eur: 530}, available: -1, ordered: 0},
        { id: 3, name: 'Menü 3', price: { chf: 1230, eur: 890}, available: -1, ordered: 0},
        { id: 4, name: 'Menü 4', price: { chf: 940, eur: 780}, available: -1, ordered: 0}
    ];
    $scope.total = { chf: 0, eur: 0};

    $scope.add = function(article) {
        if ($scope.isAvailable(article)) {
            article.ordered++;
            article.available--;
            $scope.total.chf += article.price.chf;
            $scope.total.eur += article.price.eur;
        }
    };

    $scope.remove = function(article) {
        article.ordered--;
        article.available++;
        $scope.total.chf -= article.price.chf;
        $scope.total.eur -= article.price.eur;
    };

    $scope.isOrdered = function(article) {
        return article.ordered > 0;
    };


    $scope.isAvailable = function(article) {
        return article.available != 0;
    };
}