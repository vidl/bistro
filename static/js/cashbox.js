/* Author: YOUR NAME HERE
*/

function CashboxController($scope, $http, messageService) {
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

    var getOrderedArticles = function() {
        var articles = [];
        angular.forEach($scope.articles, function(article){
           if ($scope.isOrdered(article)) {
               articles.push(article);
           }
        });
        return articles;
    };

    $scope.order = function(currency) {
        $http.post('/orders', {
            articles: getOrderedArticles(),
            currency: currency,
            total: $scope.total[currency],
            kitchenNotes: $scope.kitchenNotes
        }).success(function(data){
            if (data.no) {
                messageService.info('Bestellung ' + data.no + ' erfolgreich abgeschickt');
            }
            $scope.lastOrderAmount = $scope.total[currency];
            $scope.lastOrderCurrency = currency;
            $scope.kitchenNotes = undefined;
            clearOrder();
        });
    };

    $scope.isOrdered = function(article) {
        return article.ordered > 0;
    };

    $scope.isAvailable = function(article) {
        return article.available != 0;
    };

}

CashboxController.$inject = ['$scope', '$http', 'messageService'];