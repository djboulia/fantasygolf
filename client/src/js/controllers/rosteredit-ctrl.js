angular.module('CloudApp')
    .controller('RosterEditCtrl', ['$scope', '$stateParams',
                               '$uibModal', '$cookieStore',
                               'cdFantasy', RosterEditCtrl]);


function RosterEditCtrl($scope, $stateParams, $uibModal, $cookieStore, fantasy) {
    var gameid = $stateParams.id;
    var returnUrl = "#/roster/id/" + gameid;

    console.log("reached roster edit controller with game id " + gameid);

    var existingPlayer = undefined;

    if ($stateParams.playerid) {
        // load up the existing data in our form
        $scope.title = "Update Player";

        console.log("TOOD: implement me!");

        // cloudDataPlayer.get($stateParams.id)
        //     .then(function (playerObject) {
        //             existingPlayer = playerObject;
        //
        //             $scope.name = existingPlayer.name;
        //             $scope.player_id = existingPlayer.player_id;
        //             $scope.existingPlayer = true;
        //             $scope.loaded = true;
        //         },
        //         function (err) {
        //             console.log("error getting player " + err);
        //         });
    } else {
        $scope.title = "New Tour Player";
        $scope.loaded = true;
    }

    $scope.submit = function () {

        if (existingPlayer) {
            console.log("save existing player here...");

            existingPlayer.name = this.name;
            existingPlayer.player_id = this.player_id;
            existingPlayer.gamer = this.gamer;
            existingPlayer.drafted_by = this.drafted_by;
            existingPlayer.draft_round = this.draft_round;

            cloudDataPlayer.save(existingPlayer)
                .then(function (playerObject) {
                        console.log("saved player " + playerObject.name);

                        // switch to players page
                        window.location.href = returnUrl;
                    },
                    function (err) {
                        console.log("error adding player " + err);
                    });
        } else {
            var player = {
                name: this.name,
                player_id: null,
                gamer: null,
                drafted_by: null,
                draft_round: null
            };

            console.log("create new player " + player.name + " here");

            var changed = [];
            changed.push(player);

            fantasy.updateRoster(gameid, changed)
              .then(function(roster) {
                  $scope.picksMessage = "Roster saved.";

                  // switch to roster page
                  window.location.href = returnUrl;
                },
                function(err) {
                  logger.error("Couldn't access roster!");

                  $scope.errorMessage = "Couldn't access roster!";
                });
        }

    };

};
