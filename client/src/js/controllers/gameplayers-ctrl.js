angular.module('CloudApp')
  .controller('GamePlayersCtrl', ['$scope', '$stateParams', 'cdFantasy', GamePlayersCtrl]);

function GamePlayersCtrl($scope, $stateParams, fantasy) {

  console.log("reached gameplayers controller with id " + $stateParams.id);

  var findGamerPicks = function(gamer, gamers) {

    console.log("gamers: " + JSON.stringify(gamers));

    for (var i=0; i<gamers.length; i++) {

      event_gamer = gamers[i];

      if (gamer.id == event_gamer.id) {

        console.log("found a match : " + JSON.stringify(event_gamer));

        if (event_gamer.picks) {
          return true;
        } else {
          return false;
        }
      }
    }

    return false;
  }

  if ($stateParams.id) {
    var gameid = $stateParams.id;

    fantasy.getGame(gameid)
      .then(function(season) {
          var picks = [];
          var nopicks = [];

          var gamers = season.gamers;
          var events = season.events.reverse(); // show most recent first

          if (events.length > 0) {
            // get most recent event
            var event = events[0];

            for (var g=0; g<gamers.length; g++) {
              var gamer = gamers[g];

              if (findGamerPicks(gamer, event.gamers)) {
                picks.push(gamer);
              } else {
                nopicks.push(gamer);
              }
            }
          }

          console.log("picks: " + JSON.stringify(picks));
          console.log("nopicks: " + JSON.stringify(nopicks));

          $scope.season = season.name;
          $scope.name = event.name;
          $scope.picks = picks;
          $scope.nopicks = nopicks;
          $scope.loaded = true;

        },
        function(err) {
          $scope.statusMessage = "Error loading fantasy information!!";
          $scope.loaded = true;
        });


  }

};
