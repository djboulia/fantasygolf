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
              console.log("roster found for game " + gameid + " " + JSON.stringify(record));
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

  Roster.Promise.init = function(gameid) {
    return new Promise(function(resolve, reject) {
      var Game = app.models.Game.Promise;

      Game.findById(gameid)
        .then(function(game) {

          var year = game.data.season;
          var tour = game.data.tour;

          rawFindByGameId(gameid).then(function(roster) {

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

              // now put the roster back

              Roster.upsert(roster, function(err, record) {
                if (!err && record) {

                  logger.log("updated roster for game " + id);
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


          }, function(err) {
            reject(err);
          });

        }, function(err) {
          reject(err);
        });
    });
  };

  var findPlayer = function(player, rosterData) {
    for (var i = 0; i < rosterData.length; i++) {
      var currentPlayer = rosterData[i];

      if (currentPlayer.player_id == player.player_id) {
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

      var currentPlayer = findPlayer(player, rosterData);

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

};
