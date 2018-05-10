angular.module('CloudApp')
  .controller('LeaderboardCtrl', ['$scope', '$stateParams', '$location', 'cdFantasy', LeaderboardCtrl
  ]);


function LeaderboardCtrl($scope, $stateParams, $location, fantasy) {
  var gameid = $stateParams.id;
  var tournamentUrl = "#/eventleaders/id/eventid";

  $scope.courseUrl = "coursedetails";

  $scope.loadItems = function() {

    $scope.statusMessage = "Loading...";

    // if testingMode is a url parameter, turn off some of the date/rule checking
    var testingMode = $location.search().testingMode ? true : false;
    console.log("testingMode is set to " + testingMode);

    // if debugMode is a url parameter, write more info to the log
    var debugMode = $location.search().debugMode ? true : false;


    fantasy.getGame(gameid)
      .then(function(season) {

          console.log("season: " + season.id);
          $scope.gamers = season.gamers;
          $scope.events = season.events;
          $scope.name = season.name;
          $scope.gameid = gameid;
          $scope.tournamentUrl = tournamentUrl;

          var statusMessage = "";

          $scope.statusMessage = statusMessage;

          $scope.loaded = true;

        },
        function(err) {
          $scope.statusMessage = "Error loading fantasy information!!";
          $scope.loaded = true;
        });

  };

  $scope.onRefresh = function() {
    console.log("Refreshing leaderboard");

    // Go back to the Cloud and load a new set of Objects
    // as a hard refresh has been done
    $scope.loadItems();

    // set the timeout interval to refresh every 5 minutes
    setTimeout($scope.onRefresh, 5000 * 60);
  };

  $scope.onRefresh();
};
