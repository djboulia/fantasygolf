angular.module('CloudApp')
  .controller('GameDetailsCtrl', ['$scope', '$stateParams', '$cookieStore', '$location', '$sanitize', 'cloudDataCurrentUser', 'cdFantasy', GameDetailsCtrl]);

function GameDetailsCtrl($scope, $stateParams, $cookieStore, $location, $sanitize, currentUser, fantasy) {

  var tournamentUrl = "#/eventleaders/id/eventid";
  var leaderboardUrl = "#/leaderboard";
  var freeAgentsUrl = "#/roster/id/available";
  var eventDetailsUrl = "#/leaderboard/id/eventid";

  var picksUrl = "#/picks";

  console.log("reached game details controller with id " + $stateParams.id);
  var gameid = $stateParams.id;

  var testingMode = $location.search().testingMode ? true : false;
  console.log("testingMode is set to " + testingMode);

  // get all of the games for this user, then look for gameid

  fantasy.getGames(currentUser)
    .then(function(seasons) {
        var activeSeasons = seasons.getCurrentSeasons();
        var statusMessage = "";
        var activeSeason = null;

        // look for gameid as the active season
        for (var i = 0; i < activeSeasons.length; i++) {
          var season = activeSeasons[i];

          if (season.id == gameid) {
            activeSeason = season;
            break;
          }
        }

        // if testing mode is true, disable the normal checking for
        // setting picks
        if (testingMode && activeSeason) {
          console.log("testingMode enabled, allowing picks to be set");
          
          if (activeSeason.nextEvent) {
            activeSeason.nextEvent.canSetPicks = true;
            activeSeason.nextEvent.inProgress = false;
            activeSeason.nextEvent.opens = undefined;
          }
        }

        if (!activeSeason) {
          statusMessage = 'Season is not active.';
          console.log(statusMessage);
        }

        $scope.activeSeason = activeSeason;

        $scope.statusMessage = statusMessage;
        $scope.leaderboardUrl = leaderboardUrl;
        $scope.tournamentUrl = tournamentUrl;
        $scope.eventDetailsUrl = eventDetailsUrl;
        $scope.freeAgentsUrl = freeAgentsUrl;
        $scope.picksUrl = picksUrl;
        $scope.gameHistory = seasons.getPriorSeasons();
        $scope.loaded = true;

      },
      function(err) {
        $scope.statusMessage = "Error loading fantasy seasons!";
      });
};
