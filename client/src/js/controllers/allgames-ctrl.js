angular.module('CloudApp')
  .controller('AllGamesCtrl', ['$scope', '$cookieStore', '$location', '$sanitize', 'cloudDataCurrentUser', 'cdFantasy', AllGamesCtrl]);

function AllGamesCtrl($scope, $cookieStore, $location, $sanitize, currentUser, fantasy) {

  var draftUrl = "#/draft";
  var rosterUrl = "#/roster";
  var editUrl = '#/game';

  console.log("reached allgames controller!");

  var testingMode = $location.search().testingMode ? true : false;
  console.log("testingMode is set to " + testingMode);

  fantasy.getAllGames()
    .then(function(seasons) {

        var games = seasons.getSeasons();

        var statusMessage = "";

        console.log("games : " + JSON.stringify(games));

        $scope.statusMessage = statusMessage;
        $scope.draftUrl = draftUrl;
        $scope.rosterUrl = rosterUrl;
        $scope.editUrl = editUrl;
        $scope.games = games;
        $scope.loaded = true;

      },
      function(err) {
        $scope.statusMessage = "Error loading game history!";
      });
};
