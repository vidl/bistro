function ArticlesController($scope, $http) {
    $scope.articles = [];

    $http.get('/articles').success(function(data){
        $scope.articles = data;
    });

    $scope.selectArticle = function(index) {
        $scope.selectedIndex = index;
        $scope.$broadcast('selectArticle', $scope.articles[index]);
    };

    $scope.$on('updateArticle', function(event, article){
        event.preventDefault();
        var index = $scope.selectedIndex;
        if ($scope.articles[index]._id === article._id) {
            $scope.articles[index] = article;
        }
    });

    $scope.$on('removeArticle', function(event, article){
        $scope.articles.splice($scope.selectedIndex, 1);
        $scope.selectedIndex = -1;
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
        $http.post('/articles', $scope.article).success(function(){
            var article = $scope.article;
            $scope.master = angular.copy(article);
            $scope.$emit('updateArticle', article);
        }).error(function(data){

        });
    };

    $scope.remove = function() {
        $http.delete('/articles/' + $scope.article._id).success(function(){
            $scope.$emit('removeArticle', $scope.article);
            $scope.article = undefined;
        })
    }

}

ArticleController.$inject = ['$scope', '$http'];
