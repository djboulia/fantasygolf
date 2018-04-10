angular.module('CloudApp')
    .controller('PicksCtrl', ['$scope', '$stateParams', '$cookieStore',
                              '$location', '$sanitize', 'cloudDataCurrentUser',
                              'cdFantasy', PicksCtrl]);


function PicksCtrl($scope, $stateParams, $cookieStore,
    $location, $sanitize, currentUser, fantasy) {

    var NUM_SELECTIONS = 5;
    var changed = false;
    var gameid = $stateParams.id;
    var eventid = $stateParams.eventid;
    var players = [];

    console.log("reached picks controller with game id " + gameid + " and event id " + eventid);

    var testingMode = $location.search().testingMode ? true : false;
    console.log("testingMode is set to " + testingMode);

    // functions
    var debug = function (str) {
        // uncomment to turn on debugging
        //	$( "#debug" ).html( str );
    };

    var update = function ($scope, players, selections) {
        $scope.players = players;
        $scope.selections = selections;
    }

    var addPlayer = function (players, ndx) {
        players[ndx].selected = true;
    };

    var removePlayer = function (players, ndx) {
        players[ndx].selected = false;
    };

    var getSelections = function (players) {
        var selections = [];

        players.forEach(function (player) {
            if (player.selected) selections.push(player);
        });

        return selections;
    };

    var updateSelections = function (selections, players) {

        var numSelections = 0;
        var numTopPicks = 0;

        selections.forEach(function (selection) {
            numSelections++;
        });

        // now disable based on this
        players.forEach(function (player) {
            if (player.selected) { // always enable any currently selected scores
                player.selectable = true;
                //                    console.log("Selected : " + JSON.stringify(player));
            } else {
                // disable the rest based on current picks
                if (numSelections >= NUM_SELECTIONS) {
                    player.selectable = false;
                } else {
                    player.selectable = true;
                }
            }
        });

        console.log("selections = " + numSelections + ", topPicks = " + numTopPicks);

        return numSelections;
    };

    var findPlayerIndex = function (players, id) {
        // use a player id to find the index for this player in the scores list
        for (var i = 0; i < players.length; i++) {
            if (players[i].player_id == id) {
                return i;
            }
        }

        return -1;
    };

    var loadSavedPicks = function (players, picks) {
        // for each pick we find, move it from scores to selections
        for (var i = 0; i < picks.length; i++) {
            var ndx = findPlayerIndex(players, picks[i].id);

            if (ndx < 0) {
                console.error("invalid pick " + picks[i].id + " found!");
            } else {
                addPlayer(players, ndx);
            }
        }

        // reset changed flag, we just loaded the saved picks.
        changed = false;

        var selections = getSelections(players);

        updateSelections(selections, players);
    };



    // get the event information
    if (gameid) {

        fantasy.getPicks(gameid, eventid, currentUser)
            .then(function (picks) {

                    // if (!testingMode) {
                    //     var gameDetails = gameUtils.getGameDetails(game);
                    //
                    //     // give players a 10 hr grace period
                    //     // (10AM on day of tournament) to complete picks
                    //     gameDetails = gameUtils.addGracePeriod(gameDetails, 10);
                    //
                    //     if (gameUtils.tournamentInProgress(gameDetails.start,
                    //             gameDetails.end)) {
                    //         $scope.errorMessage = "Tournament is in progress, picks can no longer be made.";
                    //
                    //         return;
                    //     } else if (gameUtils.tournamentComplete(gameDetails.start,
                    //             gameDetails.end)) {
                    //         $scope.errorMessage = "This tournament has already ended, picks can no longer be made.";
                    //
                    //         return;
                    //     }
                    // }

                    fantasy.getRosterGamer(gameid, currentUser)
                        .then(function (roster) {
                                // var event = result.event;
                                var golfers = roster.players;

                                loadSavedPicks(golfers, picks.picks);
                                debug("Picks : " + JSON.stringify(picks));

                                $scope.name = roster.game.name;
                                // $scope.start = event.start;
                                // $scope.end = event.end;
                                // $scope.rounds = event.rounds;
                                $scope.players = golfers;
                                $scope.NUM_SELECTIONS = NUM_SELECTIONS;
                                $scope.loaded = true;

                            },
                            function (err) {
                                console.log("error getting event: " + err);

                                $scope.errorMessage = "Couldn't access event information!";
                            });
                },
                function (err) {
                    console.log("Couldn't access game information!");

                    $scope.errorMessage = "Couldn't access game information!";
                });

    }

    $scope.updatePlayer = function (item) {
        //			console.log("item: " + JSON.stringify(item));
        console.log("clicked on item " + item.name + " state is " + item.selected);

        $scope.picksMessage = "";

        var selections = getSelections($scope.players);

        // enforce the game rules here
        // tell player how many more they can pick
        // enable/disable the submit button
        var numSelections = updateSelections(selections, $scope.players);

        if (numSelections >= NUM_SELECTIONS) {
            $scope.canSubmit = true;
            $scope.picksMessage = "Press Save Picks to save.";
        } else {
            var remaining = NUM_SELECTIONS - numSelections;
            var picks = (remaining > 1) ? "picks" : "pick";
            $scope.picksMessage = remaining + " " + picks + " remaining.";
        }

    }

    $scope.submit = function () {
        $scope.picksMessage = "Saving picks...";

        // update this person's picks in the game data
        var selections = getSelections($scope.players);

        var picks = [];
        selections.forEach(function (selection) {
            picks.push({
                "id": selection.player_id
            });
        });

        console.log("saving picks: " + JSON.stringify(picks));

        fantasy.putPicks(gameid, eventid, currentUser, picks)
            .then(function (picks) {
                    $scope.picksMessage = "Picks saved.";
                    changed = false;
                },
                function (err) {
                    console.error("error saving picks");
                    $scope.picksMessage = "Error saving picks!";
                });
    };


};
