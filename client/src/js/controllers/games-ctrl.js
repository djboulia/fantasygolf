angular.module('CloudApp')
    .controller('GamesCtrl', ['$scope', '$cookieStore', '$location', '$sanitize', 'cloudDataCurrentUser', 'cdFantasy', GamesCtrl]);

function GamesCtrl($scope, $cookieStore, $location, $sanitize, currentUser, fantasy) {

  var tournamentUrl = "#/eventleaders/id/eventid";
  var leaderboardUrl = "#/leaderboard";
    var picksUrl = "#/picks";

    console.log("reached games controller!");

    var testingMode = $location.search().testingMode ? true : false;
    console.log("testingMode is set to " + testingMode);

    fantasy.getGames(currentUser)
        .then(function (seasons) {
                var activeSeasons = seasons.getCurrentSeasons();
                var statusMessage = "";

                if (activeSeasons.length==0) {
                    statusMessage = 'No current season.';
                    console.log(statusMessage);
                } else {

                  // if testing mode is true, disable the normal checking for
                  // setting picks

                  if (testingMode) {
                    for (var i=0; i<activeSeasons.length; i++) {
                      var season = activeSeasons[i];
                      if (season.nextEvent) {
                        season.nextEvent.canSetPicks = true;
                        season.nextEvent.inProgress = false;
                        season.nextEvent.opens = undefined;
                      }
                    }
                  }

                  $scope.activeSeasons = activeSeasons;
                }

                $scope.statusMessage = statusMessage;
                $scope.leaderboardUrl = leaderboardUrl;
                $scope.tournamentUrl = tournamentUrl;
                $scope.picksUrl = picksUrl;
                $scope.gameHistory = seasons.getPriorSeasons();
                $scope.loaded = true;

            },
            function (err) {
                $scope.statusMessage = "Error loading fantasy seasons!";
            });
};
