angular.module('CloudApp')
  .controller('RosterTransCtrl', ['$scope', '$stateParams', '$cookieStore',
    '$location', '$sanitize', 'cloudDataCurrentUser',
    'cdFantasy', RosterTransCtrl
  ]);


function RosterTransCtrl($scope, $stateParams, $cookieStore,
  $location, $sanitize, currentUser, fantasy) {

  var gameid = $stateParams.id;

  console.log("reached roster transactions controller with event id " + gameid);

  var testingMode = $location.search().testingMode ? true : false;
  console.log("testingMode is set to " + testingMode);

  // get the event information
  if (gameid) {

    fantasy.getRoster(gameid)
      .then(function(roster) {

          $scope.game = roster.game.name;
          $scope.transactions = roster.transactions;

          $scope.loaded = true;
        },
        function(err) {
          console.error("Couldn't access roster!");

          $scope.errorMessage = "Couldn't access roster!";
        });

  }

};
