var logger = require('../lib/logger.js');
var NameUtils = require('../lib/nameutils.js');
var TourSeason = require('../lib/tourseason.js');

//
// this object manages creating/copying roster entries
// each roster entry consists of the following data fields:
//
//  player_id   : unique identifier for this golfer (see NameUtils.normalize)
//  name        : human readable name for this golfer
//  gamer       : the gamer who has drafted/picked up this golfer
//  drafted_by  : the gamer who originally drafted this golfer
//  draft_round : the round this golfer was originally drafted
//
var RosterEntry = {

  copy: function(to, from) {
    to.player_id = from.player_id;
    to.name = from.name;
    to.gamer = from.gamer;
    to.drafted_by = from.drafted_by;
    to.draft_round = from.draft_round;
  },

  new: function(player) {
    var newPlayer = {};

    RosterEntry.copy(newPlayer, player);

    // set the player_id if it doesn't exist
    if (!newPlayer.player_id) {
      newPlayer.player_id = NameUtils.normalize(player.name);
    }

    return newPlayer;
  },

  undrafted: function(id, name) {
    var newPlayer = {};

    newPlayer.player_id = id;
    newPlayer.name = name;
    newPlayer.gamer = null;
    newPlayer.drafted_by = null;
    newPlayer.draft_round = null;

    return newPlayer;
  }

};

module.exports = function(Roster) {

  var app = require('../../server/server');

  /**
   * create promise-friendly versions of key functions we use internally
   * in the other modules
   **/
  Roster.Promise = {};

  // internal helper to return raw roster record for this gameid
  var rawFindByGameId = function(gameid) {
    return new Promise(function(resolve, reject) {

      Roster.find(function(err, records) {

        if (!err && records) {

          for (var i = 0; i < records.length; i++) {
            var record = records[i];

            if (record.data.game == gameid) {
              console.log("roster " + record.id + " found for game " + gameid);
              //              console.log("roster found for game " + gameid + " " + JSON.stringify(record));
              resolve(record);
              return;
            }
          }

          var str = "no roster found for game " + gameid;
          logger.error(str);
          reject(str);

        } else {
          if (!records) {
            var str = "Could not find rosters!";
            logger.error(str);
            reject(str);
          } else {
            var str = "Error!" + JSON.stringify(err);
            logger.error(str);
            reject(str);
          }
        }
      });

    });
  };

  var addGameInfo = function(roster, gameid, game) {
    // fluff up the roster with game information
    var gameInfo = {
      "game": gameid,
      "name": game.data.name
    }

    roster.data.game = gameInfo;
  };

  // internal helper to get the game and roster data for this gameid
  findGameAndRoster = function(gameid) {
    console.log("in findGameAndRoster");

    return new Promise(function(resolve, reject) {
      var Game = app.models.Game.Promise;

      var promiseGame = Game.findById(gameid);
      var promiseRoster = rawFindByGameId(gameid);

      Promise.all([promiseGame, promiseRoster]).then(function(values) {
        var game = values[0];
        var roster = values[1];

        addGameInfo(roster, gameid, game);

        resolve({
          game: game,
          roster: roster
        });
      }, function(err) {
        reject(err);
      });

    });

  }

  Roster.Promise.findByGameId = function(gameid) {
    console.log("in Roster.Promise.findByGameId");

    return new Promise(function(resolve, reject) {

      findGameAndRoster(gameid).then(function(obj) {
        var game = obj.game;
        var roster = obj.roster;

        resolve(roster);
      }, function(err) {
        reject(err);
      });

    });

  }

  var updateOrCreateRoster = function(year, tour, roster) {
    return new Promise(function(resolve, reject) {
      // now go get the tour data to load up the roster
      // we use the world rankings for the given tour and year
      // take the top 200 and load them in.

      var tourSeason = new TourSeason(year, tour);

      tourSeason.getRankings(function(players) {

        if (!players) {
          var str = "Couldn't load tour player info!";
          reject(str);
          return;
        }

        var newRoster = [];
        for (var i = 0; i < Math.min(players.length, 200); i++) {
          var player = players[i];

          var rosterEntry = RosterEntry.undrafted(player.player_id, player.name);

          newRoster.push(rosterEntry);
        }

        roster.data.roster = newRoster;
        roster.data.transactions = [];

        // now create or replace the roster contents

        Roster.replaceOrCreate(roster, function(err, record) {
          if (!err && record) {

            logger.log("updated roster for game " + roster.data.game);
            resolve(record);

          } else {
            if (!record) {
              var str = "Could not find rosters!";
              reject(str);
            } else {
              var str = "Error!" + JSON.stringify(err);
              reject(str);
            }
          }
        });
      });
    });
  };

  Roster.Promise.init = function(gameid) {
    return new Promise(function(resolve, reject) {
      var Game = app.models.Game.Promise;

      console.log("Roster.init");

      Game.findById(gameid)
        .then(function(game) {

          var year = game.data.season;
          var tour = game.data.tour;

          // see if we have a roster record for this game
          // if we do, re-initialize it, otherwise create new
          rawFindByGameId(gameid).then(function(roster) {
            console.log("re-initializing existing roster");

            updateOrCreateRoster(year, tour, roster)
              .then(function(roster) {
                resolve(roster);
              }, function(err) {
                reject(err);
              });

          }, function(err) {
            // no existing roster found, create a new one
            console.log("initializing new roster");

            var roster = {};
            roster.data = {};
            roster.data.game = gameid;

            updateOrCreateRoster(year, tour, roster)
              .then(function(roster) {
                resolve(roster);
              }, function(err) {
                reject(err);
              });
          });

        }, function(err) {
          reject(err);
        });
    });
  };

  Roster.Promise.findPlayer = function(id, roster) {
    var rosterData = roster.data.roster;

    for (var i = 0; i < rosterData.length; i++) {
      var currentPlayer = rosterData[i];

      if (currentPlayer.player_id == id) {
        return currentPlayer;
      }
    }

    return null;
  }

  var updateRoster = function(roster, players) {
    // go through the list and update the existing records
    var rosterData = roster.data.roster;

    for (var p = 0; p < players.length; p++) {
      var player = players[p];

      var currentPlayer = Roster.Promise.findPlayer(player.player_id, roster);

      if (currentPlayer) {
        // existing player, copy new info to record
        RosterEntry.copy(currentPlayer, player);
      } else {
        // new player, create a new record and add to the roster
        currentPlayer = RosterEntry.new(player);

        rosterData.push(currentPlayer);
      }

    }

    return rosterData;
  }

  Roster.Promise.update = function(gameid, players) {

    return new Promise(function(resolve, reject) {
      // look up this game's roster, then insert or update the player records

      rawFindByGameId(gameid)
        .then(function(roster) {

          updateRoster(roster, players);

          // now put the roster back

          Roster.replaceOrCreate(roster, function(err, record) {
            if (!err && record) {

              logger.log("updated roster for game " + gameid);

              // we just updated the roster, which could make any current picks invalid
              // check that and fix up if necessary

              var Game = app.models.Game.Promise;

              Game.resolveRosterUpdate(gameid, roster)
                .then(function(game) {
                  resolve(record);
                }, function(err) {
                  reject(err);
                });

            } else {
              if (!record) {
                var str = "Could not find rosters!";
                reject(str);
              } else {
                var str = "Error!" + JSON.stringify(err);
                reject(str);
              }
            }
          });

        }, function(err) {
          reject(err);
        });
    });
  };

  //
  // get the roster with some basic game info and gamer names added
  //
  Roster.Promise.findByGameIdWithDetails = function(gameid) {
    console.log("in Roster.Promise.findByGameIdWithDetails");

    return new Promise(function(resolve, reject) {

      findGameAndRoster(gameid).then(function(obj) {
        var game = obj.game;
        var roster = obj.roster;

        var gamers = game.data.gamers;

        var Gamer = app.models.Gamer.Promise;

        Gamer.findGamerNames(gamers).then(function(obj) {
          roster.data.gamers = game.data.gamers;

          resolve(roster);
        }, function(err) {
          reject(err);
        });

      }, function(err) {
        reject(err);
      });

    });
  };

  var findFreeAgents = function(roster) {
    var freeAgents = [];

    for (var i = 0; i < roster.length; i++) {
      var entry = roster[i];

      if (!entry.gamer) {
        // no gamer id, must be a free agent
        freeAgents.push(entry);
      }
    }

    return freeAgents;
  };

  //
  // get the roster for this game and highlight players participating
  // in the given event.  With this we can easily identify players
  // (owned or free agents) that are participating in a particular tour event
  //
  Roster.Promise.findByGameAndEventId = function(gameid, eventid) {
    console.log("in Roster.Promise.findByGameAndEventId");

    return new Promise(function(resolve, reject) {

      findGameAndRoster(gameid).then(function(obj) {
          var game = obj.game;
          var roster = obj.roster;

          var gamers = game.data.gamers;

          var Gamer = app.models.Gamer.Promise;

          Gamer.findGamerNames(gamers)
            .then(function(obj) {
                roster.data.gamers = game.data.gamers;

                var tourSeason = new TourSeason(game.data.season, game.data.tour);

                tourSeason.getEvent(eventid, function(event) {

                  if (event) {
                    console.log("got event " + JSON.stringify(event.name));
                    roster.data.event = {
                      id: eventid,
                      name: event.name
                    };

                    // go through the player list and look for players who are
                    // currently in our roster
                    var rosterData = roster.data.roster;

                    for (var i = 0; i < event.scores.length; i++) {
                      var player = event.scores[i];

                      var foundPlayer = Roster.Promise.findPlayer(player.id, roster);

                      if (foundPlayer) {
                        foundPlayer.inEvent = true;
                      } else {
                        // in event, but not found in our roster...
                        // add the player as a free agent
                        console.log("player not found.  adding " + player.name + " to returned roster");

                        var newPlayer = RosterEntry.undrafted(player.id, player.name);
                        newPlayer.inEvent = true;

                        rosterData.push(newPlayer);
                      }
                    }

                    resolve(roster);
                  } else {
                    reject("Could not get event " + eventid);
                  }
                });
              },
              function(err) {
                reject(err);
              });

        },
        function(err) {
          reject(err);
        });

    });
  };
};
