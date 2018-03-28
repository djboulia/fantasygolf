angular.module('CloudApp')
    .controller('GamesCtrl', ['$scope', '$cookieStore', '$location', '$sanitize', 'cloudDataCurrentUser', 'cdFantasy', GamesCtrl]);

function GamesCtrl($scope, $cookieStore, $location, $sanitize, currentUser, fantasy) {

    var leaderboardUrl = "#/leaderboard";
    var picksUrl = "#/picks";

    console.log("reached games controller!");

    var testingMode = $location.search().testingMode ? true : false;
    console.log("testingMode is set to " + testingMode);

    fantasy.getGames(currentUser)
        .then(function (seasons) {
                var active = seasons.getCurrentSeason();
                var statusMessage = "";

                if (!active) {
                    statusMessage = 'No current season.';
                } else {
                  $scope.statusMessage = statusMessage;
                  $scope.leaderboardUrl = leaderboardUrl;
                  $scope.active = active
                  $scope.id = active.id
                }

                $scope.gameHistory = seasons.getPriorSeasons();
                $scope.loaded = true;

            },
            function (err) {
                $scope.statusMessage = "Error loading fantasy seasons!";
            });
};
