angular.module('CloudApp')
  .controller('EventDetailsCtrl', ['$scope', '$stateParams', '$location', 'cdFantasy', EventDetailsCtrl]);


function EventDetailsCtrl($scope, $stateParams, $location, fantasy) {
  var gameid = $stateParams.id;
  var eventid = $stateParams.eventid;
  var tournamentUrl = "#/eventleaders/id/eventid";
  var leaderboardUrl = "#/leaderboard/id";
  var golferUrl = "#/golfer/id/eventid/golferid";

  console.log("reached eventdetails controller with id " + gameid + " and event " + eventid);

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

          for (var i = 0; i < season.events.length; i++) {
            var event = season.events[i];

            if (event.id == eventid) {
              $scope.event = event;
              break;
            }
          }

          $scope.gamers = season.gamers;
          $scope.name = season.name;
          $scope.gameid = gameid;
          $scope.tournamentUrl = tournamentUrl;
          $scope.leaderboardUrl = leaderboardUrl;
          $scope.golferUrl = golferUrl;

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
