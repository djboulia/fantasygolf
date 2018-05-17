angular.module('CloudApp')
    .controller('GolferCtrl', ['$scope', '$stateParams', '$location',
                                      'cdFantasy', GolferCtrl]);


function GolferCtrl($scope, $stateParams, $location, fantasy) {

    console.log("in GolferCtrl");

    $scope.loadItems = function () {

        $scope.statusMessage = "Loading...";

        // if testingMode is a url parameter, turn off some of the date/rule checking
        var testingMode = $location.search().testingMode ? true : false;
        console.log("testingMode is set to " + testingMode);

        // if debugMode is a url parameter, write more info to the log
        var debugMode = $location.search().debugMode ? true : false;

        // called when we've loaded initial game data
        var eventLoadedHandler = function (gameid, eventid) {

            // load the current event associated with this game
            // the EVENT holds the golfers
            // the GAME is the game played based on the golfer's scores

            fantasy.getGolfer(gameid, eventid, golferid)
                .then(function (scores) {
                        $scope.scores = scores;

                        $scope.loaded = true;
                    },
                    function (err) {
                        // The object was not retrieved successfully.
                        console.error("Couldn't access golfer information!");

                        $scope.$apply(function () {
                            $scope.errorMessage = "Couldn't access golfer information!";
                        });
                    });
        }

        var gameid = $stateParams.id;
        var eventid = $stateParams.eventid;
        var golferid = $stateParams.golferid;

        if (eventid) {
            eventLoadedHandler(gameid, eventid);
        } else {
            console.log("error! no eventid specified!");
            $scope.errorMessage = "error! no eventid specified!";
        }

    }

    $scope.onRefresh = function () {
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
