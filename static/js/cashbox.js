/* Author: YOUR NAME HERE
*/

function CashboxController($scope, $http, messageService) {
    $scope.articles = [];
    $scope.articleGroups = [];
    $scope.selectedGroups = [];

    $scope.total = { chf: 0, eur: 0};
    $scope.voucherCurrency = 'chf';

    var clearOrder = function() {
        angular.forEach($scope.articles, function(article){
            article.ordered = 0;
        });
        $scope.total.chf = 0;
        $scope.total.eur = 0;

    };

    $http.get('/articles').success(function(data){
        $scope.articles = data;
        $scope.articleGroups = _.uniq(_.pluck(data, 'group').sort(), true);
        $scope.selectedGroups = $scope.articleGroups.slice(0);
        clearOrder();
    });


    var resetGiven = function() {
        $scope.lastOrder = undefined;
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

    $scope.order = function(currency, voucher) {
        voucher = voucher || false;
        $http.post('/orders', {
            articles: getOrderedArticles(),
            currency: currency,
            total: $scope.total[currency],
            voucher: voucher,
            kitchenNotes: $scope.kitchenNotes
        }).success(function(data){
            if (data.no) {
                messageService.info('Bestellung ' + data.no + ' erfolgreich abgeschickt');
            }
            $scope.lastOrder = {
                amount: $scope.total[currency],
                currency: currency,
                voucher: voucher
            };
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

    $scope.isGroupSelected = function(group) {
        return $scope.selectedGroups.indexOf(group) >= 0;
    };

    $scope.toggleGroup = function(group) {
        var index = $scope.selectedGroups.indexOf(group);
        if (index >= 0) {
            $scope.selectedGroups.splice(index, 1);
        } else {
            $scope.selectedGroups.push(group);
        }
    };
}

CashboxController.$inject = ['$scope', '$http', 'messageService'];