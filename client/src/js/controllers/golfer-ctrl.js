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
      front : 0,
      back : 0,
      total : 0
    };

    for (var i=0; i<9; i++) {
      var front = i;
      var back = i+9;

      totals.front += parseInt(round.par_values[front]);
      totals.back += parseInt(round.par_values[back]);
    }

    totals.total += totals.front + totals.back;

    return totals;
  }

  var getPlayerTotals = function(round) {
    var totals = {
      front : 0,
      back : 0,
      total : 0
    };

    for (var i=0; i<9; i++) {
      var front = i;
      var back = i+9;

      totals.front += parseInt(round.round_values[front]);
      totals.back += parseInt(round.round_values[back]);
    }

    totals.total += totals.front + totals.back;

    return totals;
  }

  $scope.loadItems = function() {

    $scope.statusMessage = "Loading...";

    // if testingMode is a url parameter, turn off some of the date/rule checking
    var testingMode = $location.search().testingMode ? true : false;
    console.log("testingMode is set to " + testingMode);

    // if debugMode is a url parameter, write more info to the log
    var debugMode = $location.search().debugMode ? true : false;

    // called when we've loaded initial game data
    var eventLoadedHandler = function(gameid, eventid) {

      // load the current event associated with this game
      // the EVENT holds the golfers
      // the GAME is the game played based on the golfer's scores

      fantasy.getGolfer(gameid, eventid, golferid)
        .then(function(scores) {
            $scope.scores = scores;
            $scope.roundNumber = 1;
            $scope.round = scores.round_details[1]; // default to first round initially
            $scope.totals = getRoundTotals(scores.round_details[1]);
            $scope.playerTotals = getPlayerTotals(scores.round_details[1]);

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
