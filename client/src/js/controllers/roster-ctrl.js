angular.module('CloudApp')
  .controller('RosterCtrl', ['$scope', '$stateParams', '$cookieStore',
    '$location', '$sanitize', 'cloudDataCurrentUser',
    'cdFantasy', RosterCtrl
  ]);


function RosterCtrl($scope, $stateParams, $cookieStore,
  $location, $sanitize, currentUser, fantasy) {

  var changed = false;
  var gameid = $stateParams.id;
  var players = [];
  var currentGame = undefined;
  var editUrl = '#/rosteredit/id/player/';

  console.log("reached roster controller with event id " + gameid);

  var testingMode = $location.search().testingMode ? true : false;
  console.log("testingMode is set to " + testingMode);

  // functions
  var debug = function(str) {
    // uncomment to turn on debugging
    //	$( "#debug" ).html( str );
  };

  var update = function($scope, players, selections) {
    $scope.players = players;
    $scope.selections = selections;
  }

  var addPlayer = function(players, ndx) {
    players[ndx].selected = true;
  };

  var removePlayer = function(players, ndx) {
    players[ndx].selected = false;
  };

  var getSelections = function(players) {
    var selections = [];

    players.forEach(function(player) {
      if (player.selected) selections.push(player);
    });

    return selections;
  };

  var findGamer = function(gamers, gamerid) {
    for (var i = 0; i < gamers.length; i++) {
      var gamer = gamers[i];

      if (gamer.id == gamerid) {
        return gamer;
        break;
      }
    }

    return null;
  }

  // get the event information
  if (gameid) {

    $scope.editUrl = editUrl + gameid;

    fantasy.getRoster(gameid)
      .then(function(roster) {
          roster.gamers.unshift({
            "id": null,
            "name": "Free Agent"
          });

          for (var i = 0; i < roster.players.length; i++) {
            var player = roster.players[i];

            var gamer = findGamer(roster.gamers, player.gamer);
            player.selectedGamer = gamer;
          }

          $scope.name = roster.game.name;
          $scope.players = roster.players;
          $scope.gamers = roster.gamers;

          $scope.loaded = true;
        },
        function(err) {
          console.error("Couldn't access roster!");

          $scope.errorMessage = "Couldn't access roster!";
        });

  }

  $scope.updatePlayer = function(item) {
    //			console.log("item: " + JSON.stringify(item));
    console.log("clicked on item " + item.name + " selected gamer " + JSON.stringify(item.selectedGamer));
    item.changed = true;
    item.gamer = item.selectedGamer.id;

    $scope.picksMessage = "";

    $scope.canSubmit = true;
  }

  $scope.submit = function() {
    $scope.picksMessage = "Saving picks...";

    // update the roster here.
    var changed = [];

    for (var i = 0; i < $scope.players.length; i++) {
      var player = $scope.players[i];

      if (player.changed) {
        console.log("Found changed player record " + JSON.stringify(player));
        changed.push(player);
      }
    }

    if (changed.length > 0) {
      fantasy.updateRoster(gameid, currentUser, changed)
        .then(function(roster) {
            $scope.picksMessage = "Roster saved.";
          },
          function(err) {
            console.error("Couldn't access roster!");

            $scope.errorMessage = "Couldn't access roster!";
          });
    }

  };


};
