/* Author: YOUR NAME HERE
*/

function CashboxController($scope, $http, messageService, sessionStorage) {
    $scope.articles = [];
    $scope.articleGroups = [];
    $scope.selectedGroups = sessionStorage.get('selectedGroups') || []; 
    sessionStorage.put('selectedGroups', $scope.selectedGroups);
    $scope.limits = {};

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
        $scope.articlesGrouped = _.groupBy(data, 'group');
        $scope.articleGroups = _.uniq(_.pluck(data, 'group').sort(), true);
        //$scope.selectedGroups = $scope.articleGroups.slice(0);
        clearOrder();
    });

    $http.get('/limits').success(function(data){
       $scope.limits = _.indexBy(data, '_id');
    });

    var resetGiven = function() {
        $scope.lastOrder = undefined;
        $scope.given = '';
    };

    var updateLimit = function(article, amount) {
        if ($scope.hasLimit(article)) {
            var limit = $scope.getLimit(article);
            limit.available += amount;
        }
    };

    $scope.add = function(article) {
        if ($scope.isAvailable(article)) {
            resetGiven();
            article.ordered++;
            updateLimit(article, -1);
            $scope.total.chf += article.price.chf;
            $scope.total.eur += article.price.eur;
        }
    };

    $scope.remove = function(article) {
        resetGiven();
        article.ordered--;
        updateLimit(article, +1);
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

    $scope.getLimit = function(article) {
        return $scope.limits[article.limit];
    };

    $scope.hasLimit = function(article) {
        return article.limit && article.limit.length && $scope.limits[article.limit];
    };

    $scope.isAvailable = function(article) {
        return !$scope.hasLimit(article) || $scope.getLimit(article).available > 0;
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

CashboxController.$inject = ['$scope', '$http', 'messageService', 'sessionStorage'];