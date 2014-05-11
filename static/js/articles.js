function ArticlesController($scope, $http) {
    $scope.articles = [];
    $scope.articlesGrouped = [];
    $scope.limits = [];

    var findIndexById = function(data, id) {
        var index = undefined;
        for (var i = 0; i < data.length; i++) {
            if (data[i]._id === id){
                return i;
            }
        }
    };

    var setArticles = function(articles) {
        $scope.articles = articles;
        var grouped = _.groupBy(articles, 'group');
        var groups = _.keys(grouped).sort();
        $scope.articlesGrouped = [];
        angular.forEach(groups, function(group){
            var groupArticles = _.sortBy(grouped[group], 'name');
            group = group === 'undefined' ? 'ohne Gruppe' : group;
            $scope.articlesGrouped.push({group: group, articles: groupArticles});
        });
    }

    $http.get('/articles').success(function(data){
        setArticles(data);
        if (data.length)
            $scope.selectArticle(data[0]);
    });

    $http.get('/limits').success(function(data){
        $scope.limits = data;
    });

    $scope.selectArticle = function(article) {
        $scope.selectedId = article._id;
        $scope.$broadcast('selectArticle', article);
    };

    $scope.addArticle = function() {
        $scope.selectedId = undefined;
        $scope.$broadcast('selectArticle', {active: true});
    };

    $scope.selectLimit = function(limit) {
        $scope.selectedId = limit._id;
        $scope.$broadcast('selectLimit', limit);
    };

    $scope.addLimit = function() {
        $scope.selectedId = undefined;
        $scope.$broadcast('selectLimit', {available: 10});
    };

    $scope.getLimit = function(id) {
        var selectedLimit = undefined;
        angular.forEach($scope.limits, function(limit){
            if (limit._id == id) {
                selectedLimit = limit;
            }
        });
        return selectedLimit;
    };
    
    $scope.getAvailability = function(article) {
    	var limit = $scope.getLimit(article.limit);
    	return Math.floor(limit.available / (parseInt(article.limitDec) || 1));
    };

    $scope.$on('updateArticle', function(event, data){
        $scope.selectedId = data.saved._id;
        setArticles(data.articles);
    });

    $scope.$on('updateLimit', function(event, data){
        $scope.selectedId = data.saved._id;
        $scope.limits = data.limits;
    });

    $scope.$on('removeArticle', function(event, id){
        var index = findIndexById($scope.articles, id);
        if (index >= 0) {
            $scope.articles.splice(index, 1);
        }
        if ($scope.selectedId === id){
            $scope.selectedId = undefined;
        }
    });

    $scope.$on('removeLimit', function(event, id){
        var index = findIndexById($scope.limits, id);
        if (index >= 0) {
            $scope.limits.splice(index, 1);
        }
        if ($scope.selectedId === id){
            $scope.selectedId = undefined;
        }
        angular.forEach($scope.articles, function(article){
           if (article.limit == id) {
               article.limit = undefined;
           }
        });
    });

}

ArticlesController.$inject = ['$scope', '$http'];

function ArticleController($scope, $http) {

    $scope.$on("selectArticle", function(event, article){
        $scope.master = article;
        $scope.article = angular.copy(article);
    });

    $scope.$on("selectLimit", function(event, limit){
        $scope.article = undefined;
    });

    $scope.isUnchanged = function() {
        return angular.equals($scope.article, $scope.master);
    };

    $scope.save = function() {
        $http.post('/articles', $scope.article).success(function(data){
            $scope.article = angular.copy(data.saved);
            $scope.master = data.saved;
            $scope.$emit('updateArticle', data);
        }).error(function(data){

        });
    };

    $scope.remove = function() {
        $http.delete('/articles/' + $scope.article._id).success(function(){
            $scope.$emit('removeArticle', $scope.article._id);
            $scope.article = undefined;
        })
    };

}

ArticleController.$inject = ['$scope', '$http'];


function LimitController($scope, $http) {

    $scope.$on("selectArticle", function(event, article){
        $scope.limit = undefined;
    });

    $scope.$on("selectLimit", function(event, limit){
        $scope.master = limit;
        $scope.limit = angular.copy(limit);
    });


    $scope.isUnchanged = function() {
        return angular.equals($scope.article || $scope.limit, $scope.master);
    };

    $scope.save = function() {
        $http.post('/limits', $scope.limit).success(function(data){
            $scope.limit = angular.copy(data.saved);
            $scope.master = data.saved;
            $scope.$emit('updateLimit', data);
        }).error(function(data){

        });
    };

    $scope.remove = function() {
        $http.delete('/limits/' + $scope.limit._id).success(function(){
            $scope.$emit('removeLimit', $scope.limit._id);
            $scope.limit = undefined;
        })
    };


}

LimitController.$inject = ['$scope', '$http'];
