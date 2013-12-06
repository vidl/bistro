/*
 * Copyright 2000-2013 Namics AG. All rights reserved.
 */
/**
 * @author: dnyffenegger, Namics AG
 * @since 06.12.13
 */

function PrinterJobsController($scope, printerjobsService) {
    $scope.queue = printerjobsService.getQueue();

    $scope.$on('printerJobsChanged', function(){
        $scope.queue = printerjobsService.getQueue();
    });
}


PrinterJobsController.$inject = ['$scope', 'printerjobsService'];