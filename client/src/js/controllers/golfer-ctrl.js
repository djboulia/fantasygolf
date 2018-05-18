angular.module('CloudApp')
  .controller('GolferCtrl', ['$scope', '$stateParams', '$location',
    'cdFantasy', GolferCtrl
  ]);


function GolferCtrl($scope, $stateParams, $location, fantasy) {

  var gameid = $stateParams.id;
  var eventid = $stateParams.eventid;
  var golferid = $stateParams.golferid;

  console.log("in GolferCtrl");

  var getRoundTotals = function(round) {
    var totals = {
      front: 0,
      back: 0,
      total: 0
    };

    for (var i = 0; i < 9; i++) {
      var front = i;
      var back = i + 9;

      totals.front += parseInt(round.par_values[front]);
      totals.back += parseInt(round.par_values[back]);
    }

    totals.total += totals.front + totals.back;

    return totals;
  }

  //
  // we add front, back and totals
  // NOTE: if the round is incomplete, we don't return any totals
  //
  var getPlayerTotals = function(round) {

    var incompleteRound = {
      front: "",
      back: "",
      total: ""
    };

    var totals = {
      front: 0,
      back: 0,
      total: 0
    };

    for (var i = 0; i < 9; i++) {
      var front = i;
      var back = i + 9;

      var frontVal = parseInt(round.round_values[front]);
      var backVal = parseInt(round.round_values[back]);

      // if we find any invalid round values, assume the round is incomplete
      if (isNaN(frontVal) || isNaN(backVal)) {
        console.log("incomplete round found");

        return incompleteRound;
      }

      totals.front += frontVal;
      totals.back += backVal;
    }

    totals.total += totals.front + totals.back;

    return totals;
  }

  var getNetValues = function(round) {
    var netScores = [];

    for (var i = 0; i < round.net_values.length; i++) {
      var netVal = round.net_values[i];
      var classVal = "par";

      if (netVal != "E") {
        netVal = parseInt(netVal);

        switch (netVal) {
          case -2:
            classVal = "eagle";
            break;
          case -1:
            classVal = "birdie";
            break;
          case 1:
            classVal = "bogie";
            break;
          case 2:
            classVal = "double-bogie";
            break;
          default:
            if (netVal < -2) {
              classVal = "albatross";
            } else if (netVal > 2){
              classVal = "other";
            } else {
              classVal = "";
            }
        }
      }

      netScores.push(classVal);
    }

    return netScores;
  }

  var setCurrentRoundInfo = function(roundNumber, $scope) {
    var scores = $scope.scores;

    $scope.roundNumber = roundNumber;
    $scope.round = scores.round_details[roundNumber]; // default to first round initially
    $scope.totals = getRoundTotals(scores.round_details[roundNumber]);
    $scope.playerTotals = getPlayerTotals(scores.round_details[roundNumber]);
    $scope.net = getNetValues(scores.round_details[roundNumber]);
  };

  $scope.roundClicked = function(roundNumber) {
    console.log("Clicked on round number " + roundNumber);

    setCurrentRoundInfo(roundNumber, $scope);
  };

  $scope.loadItems = function() {

    $scope.statusMessage = "Loading...";

    // if testingMode is a url parameter, turn off some of the date/rule checking
    var testingMode = $location.search().testingMode ? true : false;
    console.log("testingMode is set to " + testingMode);

    // if debugMode is a url parameter, write more info to the log
    var debugMode = $location.search().debugMode ? true : false;

    // called when we've loaded initial game data
    var eventLoadedHandler = function(gameid, eventid) {

      fantasy.getGolfer(gameid, eventid, golferid)
        .then(function(scores) {
            $scope.scores = scores;

            if (scores) {
              // walk backwards and by default display the most recent round first
              var currentRound = 1;

              for (var i = 4; i > 0; i--) {
                if (scores.round_details[i]) {
                  currentRound = i;
                  break;
                }
              }

              setCurrentRoundInfo(currentRound, $scope);
            } else {
              $scope.errorMessage = "Golfer not found in this tournament.";
            }

            $scope.loaded = true;
          },
          function(err) {
            // The object was not retrieved successfully.
            console.error("Couldn't access golfer information!");

            $scope.$apply(function() {
              $scope.errorMessage = "Couldn't access golfer information!";
            });
          });
    }

    if (eventid) {
      eventLoadedHandler(gameid, eventid);
    } else {
      console.log("error! no eventid specified!");
      $scope.errorMessage = "error! no eventid specified!";
    }

  }

  $scope.onRefresh = function() {
    console.log("Refreshing golfer");

    // Go back to the Cloud and load a new set of Objects
    // as a hard refresh has been done
    $scope.loadItems();

    // set the timeout interval to refresh every 5 minutes
    var REFRESH_MINUTES = 5;

    setTimeout($scope.onRefresh, REFRESH_MINUTES * 1000 * 60);
  };

  $scope.onRefresh();
};
