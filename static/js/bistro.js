angular.module('bistro', []).
    config(['$routeProvider', function ($routeProvider) {
        $routeProvider.
            when('/cashbox', {templateUrl: 'cashbox.html', controller: CashboxController}).
            when('/articles', {templateUrl: 'articles.html', controller: ArticlesController}).
            otherwise({redirectTo: '/cashbox'});
    }]);

function NavController($scope, $location) {

    $scope.menuItems = [
        { name: 'Kasse', url: '/cashbox'},
        { name: 'Artikel', url: '/articles'}
    ];

    $scope.isActive = function(menuItem) {
      return $location.url() == menuItem.url;
    };
}