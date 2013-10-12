angular.module('bistro', [])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.
            when('/cashbox', {templateUrl: 'cashbox.html', controller: CashboxController}).
            when('/articles', {templateUrl: 'articles.html', controller: ArticlesController}).
            otherwise({redirectTo: '/cashbox'});
    }])
    .filter('currency', function() {
        return function(amount, symbol) {
            if (typeof amount == 'string') {
                return parseFloat(amount) * 100;
            }

            var addSymbol = function(val) {
                if (symbol)
                    val += ' ' + symbol.toUpperCase();
                return val;
            };

            if (isNaN(amount)) {
                return addSymbol('--');
            }

            if (typeof amount == 'number'){
                return addSymbol((amount / 100).toFixed(2));
            }

            return amount;
        }
    })
    .directive('focus', ['$parse', '$timeout', function ($parse, $timeout) {
        return function (scope, element, attrs) {
            var hasFocus = function() {
                return element[0] === document.activeElement && ( element[0].type || element[0].href );
            };
            var model = $parse(attrs.focus);
            scope.$watch(model, function(newValue) {
                if (newValue && !hasFocus()){
                    $timeout(function() {
                        element[0].focus();
                    });
                }
            });
        }
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