function ArticlesController($scope, $http) {
    $scope.articles = [];
    $scope.articlesGrouped = [];

    var findIndexByArticleId = function(id) {
        var index = undefined;
        for (var i = 0; i < $scope.articles.length; i++) {
            if ($scope.articles[i]._id === id){
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

    $scope.selectArticle = function(article) {
        $scope.selectedId = article._id;
        $scope.$broadcast('selectArticle', article);
    };

    $scope.addArticle = function() {
        $scope.selectedId = undefined;
        $scope.$broadcast('selectArticle', {active: true});
    };

    $scope.$on('updateArticle', function(event, data){
        $scope.selectedId = data.saved._id;
        setArticles(data.articles);
    });

    $scope.$on('removeArticle', function(event, id){
        var index = findIndexByArticleId(id);
        if (index >= 0) {
            $scope.articles.splice(index, 1);
        }
        if ($scope.selectedId === id){
            $scope.selectedId = undefined;
        }
    });

}

ArticlesController.$inject = ['$scope', '$http'];

function ArticleController($scope, $http) {

    $scope.$on("selectArticle", function(event, article){
        $scope.master = article;
        $scope.article = angular.copy(article);
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
    }

}

ArticleController.$inject = ['$scope', '$http'];
