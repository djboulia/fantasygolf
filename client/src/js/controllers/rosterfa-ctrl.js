angular.module('CloudApp')
  .controller('RosterFACtrl', ['$scope', '$stateParams', '$uibModal', '$cookieStore',
    '$location', '$sanitize', 'cloudDataCurrentUser',
    'cdFantasy', RosterFACtrl
  ]);


function RosterFACtrl($scope, $stateParams, $uibModal, $cookieStore,
  $location, $sanitize, currentUser, fantasy) {

  var changed = false;
  var gameid = $stateParams.id;
  var players = [];
  var currentGame = undefined;

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

  var findFreeAgents = function(players) {
    var freeAgents = [];

    for (var i = 0; i < players.length; i++) {
      var player = players[i];

      if (player.gamer == null) {
        freeAgents.push(player);
      }
    }

    return freeAgents;
  }

  var findGamerPlayers = function(id, players) {
    var gamerPlayers = [];

    for (var i = 0; i < players.length; i++) {
      var player = players[i];

      if (player.gamer == id) {
        gamerPlayers.push(player);
      }
    }

    return gamerPlayers;
  };

  var loadRoster = function() {
    // get the event information
    if (gameid) {

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

            var freeAgents = findFreeAgents(roster.players);

            $scope.name = roster.game.name;
            $scope.players = freeAgents;
            $scope.gamerPlayers = findGamerPlayers(currentUser.getId(), roster.players);
            $scope.gamers = roster.gamers;

            $scope.loaded = true;
          },
          function(err) {
            console.error("Couldn't access roster!");

            $scope.errorMessage = "Couldn't access roster!";
          });

    }
  };

  // load up the game roster
  loadRoster();


  $scope.pickUpPlayer = function(addPlayer) {
    //			console.log("item: " + JSON.stringify(item));
    console.log("clicked on player " + addPlayer.name);

    $scope.picksMessage = "";

    var modalInstance = $uibModal.open({
      animation: $scope.animationsEnabled,
      templateUrl: 'pickUpPlayer.html',
      controller: 'ModalPickUpPlayerCtrl',
      resolve: {
        players: function() {
          return $scope.gamerPlayers;
        }
      }
    });

    modalInstance.result.then(function(dropPlayer) {

      console.log("Dropping player " + dropPlayer.name + ", adding player " + addPlayer.name);

      // add our gamer id for the add player, turn drop player to a free agent
      addPlayer.gamer = dropPlayer.gamer;
      dropPlayer.gamer = null;

      console.log("addPlayer : " + JSON.stringify(addPlayer));
      console.log("dropPlayer : " + JSON.stringify(dropPlayer));

      var changed = [];
      changed.push(addPlayer);
      changed.push(dropPlayer);

      fantasy.updateRoster(gameid, currentUser, changed)
        .then(function(roster) {
            $scope.picksMessage = "Add/Drop complete.";

            loadRoster();
          },
          function(err) {
            console.error("Couldn't access roster!");

            $scope.errorMessage = "Couldn't access roster!";
          });

    }, function() {
      console.log('Modal dismissed at: ' + new Date());
    });
  };

};

// Please note that $modalInstance represents a modal window (instance) dependency.
// It is not the same as the $modal service used above.

angular.module('CloudApp')
  .controller('ModalPickUpPlayerCtrl', ['$scope', '$uibModalInstance', 'players', ModalPickUpPlayerCtrl]);

function ModalPickUpPlayerCtrl($scope, $uibModalInstance, players) {

  var setSelection = function(selectedPlayer, players) {
    for (var i = 0; i < players.length; i++) {
      var player = players[i];

      if (player.player_id == selectedPlayer.player_id) {
        player.selected = true;

        console.log("set selection to " + player.name);
      } else {
        player.selected = false;
      }
    }
  };

  var selectedPlayer = null;

  $scope.players = players;
  $scope.canSubmit = false;

  $scope.dropPlayer = function(player) {
    console.log("clicked on player " + player.name);

    selectedPlayer = player;
    setSelection(selectedPlayer, $scope.players);

    $scope.canSubmit = true;
  };

  $scope.ok = function() {
    $uibModalInstance.close(selectedPlayer);
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
}
