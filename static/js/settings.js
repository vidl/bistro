/*
 * Copyright 2000-2013 Namics AG. All rights reserved.
 */
/**
 * @author: dnyffenegger, Namics AG
 * @since 09.11.13
 */

function SettingsController($scope, $http, messageService) {

  $scope.printers = [];
  $scope.settings = {};

  $http.get('/printers').success(function(data){
      $scope.printers = data;
  });

  $http.get('/settings').success(function(data){
    $scope.settings = data;

  });

  $scope.save = function() {
      $http.post('/settings', $scope.settings)
          .success(function(){
              messageService.success('Einstellungen erfolgreich gespeichert');
          })
          .error(function(){
              messageService.error('Fehler beim Speichern der Einstellungen');
          });
  };
}

SettingsController.$inject = ['$scope', '$http', 'messageService'];