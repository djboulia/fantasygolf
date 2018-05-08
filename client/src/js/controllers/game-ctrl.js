angular.module('CloudApp')
  .controller('GameCtrl', ['$scope', '$stateParams', '$uibModal', '$cookieStore', 'cdFantasy', GameCtrl]);


function GameCtrl($scope, $stateParams, $uibModal, $cookieStore, fantasy) {
  var returnUrl = "#/allgames";

  console.log("reached game controller with id " + $stateParams.id);

  var existingGame = undefined;

  $scope.popup = {
    start: false,
    end: false
  };

  $scope.openPopup = function(selected) {
    $scope.popup[selected] = true;
  };

  $scope.dateOptions = {};

  $scope.startChanged = function() {
    console.log("start:", this.start);
    this.end = this.start;
    this.dateOptions.minDate = this.start;
  };

  $scope.dateFormat = "MMM dd ',' yyyy";
  $scope.altInputFormats = ['M!/d!/yyyy'];

  var findEventById = function(id, schedule) {
    for (var i = 0; i < schedule.length; i++) {
      var event = schedule[i];

      if (event && event.id == id) {
        return event;
      }
    }

    return null;
  };

  //
  // take the full schedule and pre-select any events already
  // included in the game
  //
  var buildSchedule = function(fullSchedule, gameSchedule) {
    for (var i = 0; i < gameSchedule.length; i++) {
      var eventGame = gameSchedule[i];

      var event = findEventById(eventGame.id, fullSchedule);

      if (event) {
        event.selected = true;
      } else {
        console.log("No matching event found for " + eventGame.id);
      }
    }

    return fullSchedule;
  };

  var findGamerById = function(id, gamers) {
    for (var i = 0; i < gamers.length; i++) {
      var gamer = gamers[i];

      if (gamer && gamer.id == id) {
        return gamer;
      }
    }

    return null;
  };

  //
  // take the total list of gamers and pre-select any already
  // included in the game
  //
  var buildGamerList = function(allGamers, gameGamers) {
    console.log("allGamers: " + JSON.stringify(allGamers));

    for (var i = 0; i < gameGamers.length; i++) {
      var gamer = gameGamers[i];

      var foundGamer = findGamerById(gamer.id, allGamers);

      if (foundGamer) {
        foundGamer.selected = true;
      } else {
        console.log("No matching gamer found for " + gamer.id);
      }
    }

    return allGamers;
  };

  if ($stateParams.id) {
    // load up the existing data in our form
    $scope.title = "Update Game";

    fantasy.getGame($stateParams.id)
      .then(function(obj) {
        existingGame = obj;

        console.log("found game!");
        $scope.name = existingGame.name;
        $scope.existingGame = true;

        return fantasy.getSchedule(obj.tour, obj.season); // promise
      })
      .then(function(schedule) {
        console.log("loaded full season schedule");
        var selectedSchedule = buildSchedule(schedule.get(), existingGame.schedule);

        $scope.fullSchedule = selectedSchedule;

        return fantasy.getAllGamers(); // promise
      })
      .then(function(gamers) {

        console.log("loaded gamers");
        console.log("gamers already playing in this game " + JSON.stringify(existingGame.gamers));

        var selectedGamers = buildGamerList(gamers.get(), existingGame.gamers);
        $scope.allGamers = selectedGamers;

        $scope.loaded = true;
      })
      .catch(function(err) {
        console.log("error getting game " + err);
      });
  } else {
    $scope.title = "New Game";

    var season = (new Date()).getFullYear();
    var tour = "pga";

    $scope.season = season;
    $scope.tour = tour;

    fantasy.getSchedule(tour, season)
      .then(function(schedule) {
        console.log("loaded full season schedule");

        $scope.fullSchedule = schedule.get();

        return fantasy.getAllGamers(); // promise
      })
      .then(function(gamers) {

        console.log("loaded gamers");

        $scope.allGamers = gamers.get();
        $scope.name = "";

        $scope.loaded = true;
      })
      .catch(function(err) {
        console.log("error creating game " + err);
      }); // load up the default data structures

  }

  $scope.updateEvent = function(item) {
    console.log("clicked on item " + item.name + " state is " + item.selected);
  }

  $scope.updateGamer = function(item) {
    console.log("clicked on item " + item.name + " state is " + item.selected);
  }

  $scope.submit = function() {

    var self = this;

    var name = self.name;

    var schedule = [];

    for (var i = 0; i < self.fullSchedule.length; i++) {
      var event = self.fullSchedule[i];

      if (event.selected) {
        schedule.push({
          id: event.id
        });
      }
    }

    var gamers = [];

    for (var i = 0; i < self.allGamers.length; i++) {
      var gamer = self.allGamers[i];

      if (gamer.selected) {
        gamers.push({
          id: gamer.id
        });
      }
    }

    if (existingGame) {
      console.log("saving existing game...");

      fantasy.updateGame($stateParams.id, name, schedule, gamers)
        .then(function(game) {
          console.log("updated game " + game.name);

          // return to main page
          window.location.href = returnUrl;
        })
        .catch(
          function(err) {
            console.log("error updating game " + err);
          });

    } else {

      console.log("creating new game...");

      fantasy.newGame(self.season, self.tour, name, schedule, gamers)
        .then(function(game) {
          console.log("created game " + game.name);

          // return to main page
          window.location.href = returnUrl;
        })
        .catch(
          function(err) {
            console.log("error updating game " + err);
          });
    }

  };

  $scope.delete = function() {

    var modalInstance = $uibModal.open({
      animation: $scope.animationsEnabled,
      templateUrl: 'deleteGame.html',
      controller: 'ModalGameDeleteCtrl',
      resolve: {
        game: function() {
          return existingGame;
        }
      }
    });

    modalInstance.result.then(function(course) {
      console.log("Deleting game " + game.name);
      cloudDataCourse.delete(course)
        .then(function(obj) {
            console.log("delete successful");

            // switch to players page
            window.location.href = returnUrl;
          },
          function(err) {
            console.log("error from delete : " + err);
          });

    }, function() {
      console.log('Modal dismissed at: ' + new Date());
    });
  };

};

// Please note that $modalInstance represents a modal window (instance) dependency.
// It is not the same as the $modal service used above.

angular.module('CloudApp')
  .controller('ModalGameDeleteCtrl', ['$scope', '$uibModalInstance', 'course', ModalGameDeleteCtrl]);

function ModalGameDeleteCtrl($scope, $uibModalInstance, game) {
  $scope.game = game;

  $scope.ok = function() {
    $uibModalInstance.close(game);
  };

  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
}
