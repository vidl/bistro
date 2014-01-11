var currencyFilterFactory = function() {
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
};

var focusDirectiveFactory = function ($parse, $timeout) {
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
};

var currencyDiretiveFactory = function($filter) {
    // inspired by http://docs.angularjs.org/guide/forms
    // var FLOAT_REGEXP = /^\-?\d+((\.|\,)\d+)?$/;
    var POSITIVE_FLOAT_REGEXP = /^\d+((\.|\,)\d*)?$/;
    return {
        require: 'ngModel',
        link: function(scope, elm, attrs, ctrl) {
            var currency = $filter('currency');
            ctrl.$render = function() {
                elm.val(currency(ctrl.$modelValue));
            };

            ctrl.$parsers.unshift(function(viewValue) {
                if (viewValue === '.') {
                    viewValue = '0.';
                    elm.val(viewValue);
                }
                if (POSITIVE_FLOAT_REGEXP.test(viewValue)) {
                    ctrl.$setValidity('float', true);
                    return currency(viewValue.replace(',', '.'));
                } else {
                    ctrl.$setValidity('float', false);
                    return undefined;
                }
            });
        }
    };
};

var messageServiceFactory = function($rootScope) {
    var sendMessage = function(msg, type) {
        $rootScope.$broadcast('message', {msg: msg, type: type});
    };

    return {
        success: function(msg) { sendMessage(msg, 'success'); },
        info: function(msg) { sendMessage(msg, 'info'); },
        warning: function(msg) { sendMessage(msg, 'warning'); },
        error: function(msg) { sendMessage(msg, 'error'); },
        listen: function($scope, callback) {
            $scope.$on('message', function(event, data) {
                callback(data.type, data.msg);
            });
        }
    };
};

var socketIoFactory = function() {
    var socket = io.connect();

    return {
        on: function(event, scope, cb) {
            socket.on(event, function(data){
                scope.$apply(function(){
                    cb(data);
                })
            });
        },
        emit: function(event, data) {
            socket.emit(event, data);
        }
    };
};

var printerJobsFactory = function($rootScope, socketIo) {
    var queue = [];
    socketIo.on('printerJobsChanged', $rootScope, function(data){
        queue = data.queue;
        $rootScope.$broadcast('printerJobsChanged');
    });

    return {
        getQueue: function() {
            return queue;
        }
    }
};

var sessionStorageFactory = function() {
    var storage = {};
    return {
        put: function(key, value) {
	    storage[key] = value;
	},
	get: function(key) {
	    return storage[key];
	}
    };
};

var configFactory = function ($routeProvider) {
    $routeProvider.
        when('/cashbox', {templateUrl: 'cashbox.html', controller: CashboxController}).
        when('/articles', {templateUrl: 'articles.html', controller: ArticlesController}).
        when('/orders', {templateUrl: 'orders.html', controller: OrdersController}).
        when('/settings', {templateUrl: 'settings.html', controller: SettingsController}).
        when('/printerjobs', {templateUrl: 'printerjobs.html', controller: PrinterJobsController}).
        otherwise({redirectTo: '/cashbox'});
};

angular.module('bistro', ['ui.bootstrap'])
    .config(['$routeProvider', configFactory])
    .filter('currency', currencyFilterFactory)
    .service('messageService', ['$rootScope', messageServiceFactory])
    .service('socketIo', ['$rootScope', socketIoFactory])
    .service('printerjobsService', ['$rootScope', 'socketIo', printerJobsFactory])
    .service('sessionStorage', [sessionStorageFactory])
    .directive('focus', ['$parse', '$timeout', focusDirectiveFactory])
    .directive('currency', ['$filter', currencyDiretiveFactory]);

function NavController($scope, $location, printerjobsService) {

    $scope.printJobs = { name: 'Druckaufträge', url: '/printerjobs', badge: 0};
    $scope.printJobs.badge = printerjobsService.getQueue().length;


    $scope.menuItems = [
        { name: 'Kasse', url: '/cashbox'},
        { name: 'Artikel', url: '/articles'},
        { name: 'Bestellungen', url: '/orders'},
        $scope.printJobs,
        { name: 'Einstellungen', url: '/settings'}
    ];


    $scope.$on('printerJobsChanged', function(){
        $scope.printJobs.badge = printerjobsService.getQueue().length;
    });

    $scope.isActive = function(menuItem) {
      return $location.url() == menuItem.url;
    };
}

NavController.$inject = ['$scope', '$location', 'printerjobsService'];