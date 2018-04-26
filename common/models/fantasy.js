'use strict';

var logger = require('../lib/logger.js');
var NameUtils = require('../lib/nameutils.js');
var DateUtils = require('../lib/dateutils.js');
var TourSeason = require('../lib/tourseason.js');

module.exports = function(Fantasy) {

  var app = require('../../server/server');

  Fantasy.remoteMethod(
    'search', {
      http: {
        path: '/search',
        verb: 'get'
      },
      description: 'Search for games',

      accepts: [{
          arg: 'gamer',
          type: 'string',
          description: 'id of the gamer to search for',
          http: {
            source: 'query'
          },
          required: false
        },
        {
          arg: 'details',
          type: 'boolean',
          description: 'include scoring and event details',
          http: {
            source: 'query'
          },
          required: false
        }
      ],
      returns: {
        arg: 'games',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getGame', {
      http: {
        path: '/:id',
        verb: 'get'
      },
      description: 'Get individual game data',

      accepts: [{
        arg: 'id',
        type: 'string',
        required: true
      }],
      returns: {
        arg: 'game',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getRoster', {
      http: {
        path: '/:id/roster',
        verb: 'get'
      },
      description: 'Get tour players roster for this game',

      accepts: [{
        arg: 'id',
        type: 'string',
        required: true
      }],
      returns: {
        arg: 'roster',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'initRoster', {
      http: {
        path: '/:id/roster/init',
        verb: 'put'
      },
      description: 'Initializes (or re-initializes) the roster with tour player names',

      accepts: [{
        arg: 'id',
        type: 'string',
        required: true
      }],
      returns: {
        arg: 'roster',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'updatePlayers', {
      http: {
        path: '/:id/roster/players',
        verb: 'put'
      },
      description: 'update or add player records',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'players',
          type: 'array',
          required: true
        }
      ],
      returns: {
        arg: 'roster',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getRosterGamer', {
      http: {
        path: '/:id/roster/gamer/:gamerid',
        verb: 'get'
      },
      description: 'Get the current roster for this gamer',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'gamerid',
          type: 'string',
          required: true
        }
      ],
      returns: {
        arg: 'roster',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getPicks', {
      http: {
        path: '/:id/event/:eventid/gamer/:gamerid/picks',
        verb: 'get'
      },
      description: 'Get picks for this player for the given event within the season',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'eventid',
          type: 'string',
          required: true
        },
        {
          arg: 'gamerid',
          type: 'string',
          required: true
        }
      ],
      returns: {
        arg: 'picks',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'putPicks', {
      http: {
        path: '/:id/event/:eventid/gamer/:gamerid/picks',
        verb: 'put'
      },
      description: 'Saves picks for this player for the given event within the season',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'eventid',
          type: 'string',
          required: true
        },
        {
          arg: 'gamerid',
          type: 'string',
          required: true
        },
        {
          arg: 'picks',
          type: 'array',
          required: true
        }
      ],
      returns: {
        arg: 'picks',
        type: 'object',
        root: true
      }
    }
  );


  var createNextEvent = function(now, event) {
    var nextEvent = {};

    nextEvent.id = event.id;
    nextEvent.name = event.name;
    nextEvent.start = event.start;
    nextEvent.end = event.end;
    nextEvent.inProgress = false;
    nextEvent.canSetPicks = false;

    var start = DateUtils.adjustedForTimezone(event.start);
    var end = DateUtils.adjustedForTimezone(event.end);

    if (DateUtils.tournamentInProgress(now, start, end)) {
      nextEvent.inProgress = true;
    } else if (DateUtils.tournamentIsOpen(now, start, end)) {
      nextEvent.canSetPicks = true;
    } else {
      nextEvent.opens = dateString(DateUtils.tournamentOpens(start));
    }

    return nextEvent;
  };

  //
  // look at the schedule of events in the current game
  // trying to find the next upcoming event.  if the given schedule
  // is complete (all events are in the past), then return null
  //
  var findNextEvent = function(game) {
    // sort the schedule by date first
    var schedule = game.data.schedule;
    schedule.sort(function(a, b) {
      if (a.start < b.start) {
        return -1;
      } else if (a.start > b.start) {
        return 1;
      }

      return 0;
    });

    console.log("sorted schedule: " + JSON.stringify(schedule));

    // look for first event that hasn't ended yet
    var nextEvent = null;
    var now = new Date();

    for (var s = 0; s < schedule.length; s++) {
      var event = schedule[s];
      var start = DateUtils.adjustedForTimezone(event.start);
      var end = DateUtils.adjustedForTimezone(event.end);

      if (!event.start || !event.end) {
        console.error("ERROR: couldn't find schedule details!");
        break;
      }

      if (!DateUtils.tournamentComplete(now, start, end)) {
        nextEvent = createNextEvent(now, event);

        break;
      }
    }

    return nextEvent;
  };

  var addActiveSeasons = function(games, cb) {

    if (games.length > 0) {
      var requests = [];

      for (var i = 0; i < games.length; i++) {
        requests.push(addActiveSeason(games[i]));
      }

      Promise.all(requests).then(function(record) {

        for (var g = 0; g < games.length; g++) {
          var game = games[g];

          var nextEvent = findNextEvent(game);

          game.data.nextEvent = nextEvent;
        }

        cb(games);

      }, function(err) {
        console.log(err);
        cb(games);
      });

    } else {

      console.log("no games found!")
      cb(games);
    }

  };

  var addActiveSeason = function(record) {

    return new Promise(function(resolve, reject) {
      var game = record.data;
      var schedule = game.schedule;

      var tourSeason = new TourSeason(game.season, game.tour);

      if (schedule.length > 0) {
        var requests = [];

        for (var s = 0; s < schedule.length; s++) {
          var event = schedule[s];

          console.log("found event " + event.id);

          requests.push(processSeason(tourSeason, event));
        }

        Promise.all(requests).then(function(events) {
          resolve(record);
        }, function(err) {
          console.log("error getting seasons!");
          reject(record);
        });

      } else {
        console.log("no schedule found!")
        reject(record);
      }
    });

  };

  var processSeason = function(tourSeason, event) {

    return new Promise(function(resolve, reject) {
      tourSeason.getEvent(event.id, (json) => {

        if (json) {

          // remember the event name
          event.name = json.name;
          event.start = json.start;
          event.end = json.end;
          event.course = json.course;

          resolve(event);
        } else {
          var err = "json is null";
          reject(err);
        }

      });
    });
  };


  var addScoringForGames = function(games, cb) {
    if (games.length > 0) {

      var requests = [];

      for (var i = 0; i < games.length; i++) {
        console.log("getting score data for " + games[i].id);
        requests.push(addScoring(games[i]));
      }

      Promise.all(requests).then(function(records) {
        console.log("Promise.all scoring data");
        // after all request callbacks complete, call our main callback
        cb(games);
      }, function(err) {
        console.log(err);
        cb(games);
      });

    } else {

      console.log("no games found!")
      cb(games);
    }
  };

  var addScoring = function(record) {
    console.log("in addScoring");

    return new Promise(function(resolve, reject) {
      var game = record.data;
      var events = game.events;

      var tourSeason = new TourSeason(game.season, game.tour);

      if (events.length > 0) {

        var Roster = app.models.Roster.Promise;

        Roster.findByGameId(record.id).then( function(roster) {
          var requests = [];

          for (var e = 0; e < events.length; e++) {
            var event = events[e];

            console.log("found event " + event.id);

            requests.push(processScore(tourSeason, roster, event));
          }

          Promise.all(requests).then(function(events) {
            console.log("Promise.all processed score data for game " + record.id);
            // after all request callbacks complete, call our main callback
            resolve(record);

          }, function(err) {
            reject(err);
          });

        }, function(err) {
          var str = "No roster found for this game!"
          console.error(str);
          reject(str);
        });
      } else {
        var str = "no events found!";
        console.log(str)
        reject(str);
      }
    });

  };

  var findScoreByPlayerId = function(scores, playerid) {
    for (var s = 0; s < scores.length; s++) {
      var score = scores[s];

      if (score.id == playerid) {
        return score;
      }
    }

    return null;
  };

  var findPlayerInRoster = function(roster, id) {
    var found = null;

    var rosterData = roster.data.roster;
    for (var r = 0; r < rosterData.length; r++) {
      var player = rosterData[r];

      if (id == player.player_id) {
        found = player;
      }
    }

    return found;
  };

  //
  // we get the scoring data for this event from our back end
  // service.  then we fluff up the picks for this gamer with the
  // scoring information.
  //
  var processScore = function(tourSeason, roster, event) {
    return new Promise(function(resolve, reject) {
      tourSeason.getEvent(event.id, (json) => {

        if (json) {

          // remember the event name
          event.name = json.name;

          if (event.gamers) {
            for (var g = 0; g < event.gamers.length; g++) {
              var gamer = event.gamers[g];

              var picks = gamer.picks;
              for (var p = 0; p < picks.length; p++) {
                var pick = picks[p];

                var score = findScoreByPlayerId(json.scores, pick.id);

                if (score) {
                  pick.name = score.name;
                  pick.score_details = score.score_details;

                  //                  console.log("found picks " + JSON.stringify(pick));
                } else {
                  // no scores for this player, just update the pick name from our roster
                  // this indicates someone started a player who wasn't in the field
                  console.log("didn't find scores for " + pick.id);

                  var player = findPlayerInRoster(roster, pick.id);

                  if (player) {
                    pick.name = player.name;
                    pick.score_details = {
                      total: 0
                    };
                  } else {
                    console.log("Couldn't find player " + pick.id + " in roster.");
                  }
                }
              }

            }

          }

          resolve(event);
        } else {
          var err = "json is null";
          reject(err);
        }

      });
    });

  };



//
// go through each tour event in this game and fluff up the
// gamer names so we send back a human readable name for each gamer
//
  var addGamerData = function(record) {
    return new Promise(function(resolve, reject) {
      var game = record.data;
      var events = game.events;
      var Gamer = app.models.Gamer.Promise;
      var requests = [];

      for (var e = 0; e < events.length; e++) {
        var event = events[e];

        requests.push(Gamer.findGamerNames(event.gamers));
      }

      Promise.all(requests).then(function(gamers) {
        resolve(record);
      }, function(err) {
        reject(err);
      });
    });

  };

var findGamerForEvent = function(event, gamerid) {
  var gamers = event.gamers;

  if (gamers) {

      // now look for our gamerid in the list
      for (var g = 0; g < gamers.length; g++) {
        var gamer = gamers[g];

        if (gamer.id == gamerid) {
          return gamer;
        }
      }
  }

  return null;
};

//
// get all of the games that this gamer is participating in
//
  var findGames = function(records, gamerid) {
    var games = [];

    // look into each returned record for our gamer id
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      var game = record.data;
      var events = game.events;

      if (events) {

        for (var e = 0; e < events.length; e++) {
          var event = events[e];

          var gamer = findGamerForEvent(event, gamerid);

          if (gamer) {
            // found a match, add this record to our list and continue
            logger.log("Found game!: " + JSON.stringify(record));
            games.push(record);
            break;
          }
        }
      }
    }

    return games;
  };

  /**
   * /search?gamer=12353435&details=false
   *
   * returns the fantasy games that this player is particpating in
   * if no gamer id is specified, all games are returned
   * if details = true, then scoring and event details are included in response
   *
   **/
  Fantasy.search = function(gamerid, details, cb) {

    var str = "searching for games for gamer " + gamerid + " and details " + details;
    logger.log(str);

    var Game = app.models.Game.Promise;

    Game.find().then(function(records) {

      var games = [];

      if (records) {

        // if a gamerid is specified, filter based on that, otherwise
        // just include all records
        if (gamerid) {
          games = findGames(records, gamerid);
        } else {
          games = records;
        }

        if (details) {
          // add in season and scoring details for each game

          addActiveSeasons(games, function(games) {
            // now fluff up the individual picks with more data and scores
            addScoringForGames(games, function(games) {
              cb(null, {
                "games": games
              });
            });
          });

        } else {

          cb(null, {
            "games": games
          });

        }

      } else {
        var str = "No game records found for gamer " + gamerid;
        logger.log(str);
        cb(null, {
          "games": games
        });
      }
    }, function(err) {
      cb(err, null);
    });
  };

  // find the gamer who is currently leading the season totals and
  // flag them as the leader
  var highlightLeader = function(seasonTotals) {
    var leader = null;

    for (var id in seasonTotals) {
      if (leader) {
        // see if this score is better
        if (seasonTotals[id].total > seasonTotals[leader].total) {
          leader = id;
        }
      } else {
        leader = id;
      }
    }

    seasonTotals[leader].leader = true;

    return seasonTotals;
  };

  var picksTotal = function( gamer ) {
    var gamerTotal = 0;

    for (var p = 0; p < gamer.picks.length; p++) {
      var pick = gamer.picks[p];

      if (pick.score_details && !isNaN(pick.score_details.total)) {
        gamerTotal += pick.score_details.total;
      } else {
        console.error("ERROR: could not get total for picks.score_details" + JSON.stringify(pick.score_details));
      }
      console.log("gamerTotal = " + gamerTotal);
    }

    return gamerTotal;
  };

  var addToSeasonTotals = function(gamer, seasonTotals, gamerTotal) {
    var gamerid = gamer.id;

    if (!seasonTotals[gamerid]) {
      // first event for this gamer, intialize the data structure
      seasonTotals[gamerid] = {
        "total": gamerTotal,
        "name": gamer.name
      };

      console.log("set seasonTotals " + JSON.stringify(seasonTotals));
    } else {
      console.log("adding to totals " + gamerid + "gamerTotal=" + gamerTotal);
      seasonTotals[gamerid]["total"] += gamerTotal;
    }

  };

  var tallyTotalScores = function(record) {
    // tally individual event scores and season totals
    var seasonTotals = {};

    var events = record.data.events;
    for (var e = 0; e < events.length; e++) {
      var event = events[e];

      var gamers = event.gamers;
      for (var g = 0; g < gamers.length; g++) {
        var gamer = gamers[g];
        var gamerTotal = 0;

        gamerTotal += picksTotal(gamer);

        gamer.total = gamerTotal;

        addToSeasonTotals(gamer, seasonTotals, gamerTotal);

      }

    }

    // add season totals to top level record
    highlightLeader(seasonTotals);

    var gamers = [];

    for (var id in seasonTotals) {
      var game = {
        "id": id,
        "name": seasonTotals[id].name,
        "total": seasonTotals[id].total
      };

      if (seasonTotals[id].leader) {
        game.leader = true;
      }

      gamers.push(game);
    }

    record.data.gamers = gamers;

    return record;
  };

  /**
   * /:id
   *
   * returns the game matching this id
   *
   **/
  Fantasy.getGame = function(id, cb) {

    console.log("getting game " + id);

    var Game = app.models.Game;

    Game.findById(id, function(err, record) {
      if (!err && record) {

        logger.log("Found game: " + JSON.stringify(record));

        addScoring(record).then(function(record) {
          return addGamerData(record);
        }).then(function(record) {

          tallyTotalScores(record);

          cb(null, {
            game: record
          });
        }, function(err) {
          cb(err, null);
        });

      } else {
        if (!record) {
          var str = "Could not find game id " + id;
          logger.error(str);
          cb(str, null);
        } else {
          logger.error("Error!" + JSON.stringify(err));
          cb(err, null);
        }
      }
    });

  };

  /**
   * /:id
   *
   * id is the game to get this roster for
   *
   * returns the roster for this game
   *
   **/
  Fantasy.getRoster = function(id, cb) {

    var Roster = app.models.Roster.Promise;
    var Game = app.models.Game.Promise;
    var Gamer = app.models.Gamer.Promise;

    console.log("getting roster for game " + id);

    Game.findById(id).then(function(game) {

      Roster.findByGameId(id).then(function(roster) {

        // fluff up the record with game information
        var gameInfo = {
          "game": id,
          "name": game.data.name
        }

        roster.data.game = gameInfo;

        var gamers = game.data.gamers;

        Gamer.findGamerNames(gamers).then(function(obj) {
          roster.data.gamers = game.data.gamers;

          cb(null, {
            "roster": roster
          });
        }, function(err) {
          errCallback(err, cb);
        });

      }, function(err) {
        errCallback(err, cb);
      });
    }, function(err) {
      errCallback(err, cb);
    });

  };

  var errCallback = function(str, cb) {
    logger.error(str);

    cb(str, null);
  };


  /**
   * /:id
   *
   * initializes the roster with tour players
   *
   **/
  Fantasy.initRoster = function(id, cb) {

    console.log("initializing roster for game " + id);

    var Game = app.models.Game.Promise;
    var Roster = app.models.Roster.Promise;

    Game.findById(id).then(function(game) {

      var year = game.data.season;
      var tour = game.data.tour;

      Roster.findByGameId(id).then( function(roster) {

        // now go get the tour data to load up the roster
        // we use the world rankings for the given tour and year
        // take the top 200 and load them in.

        var tourSeason = new TourSeason(year, tour);

        tourSeason.getRankings(function(players) {

          if (!players) {
            errCallback("Couldn't load tour player info!", cb);
            return;
          }

          var newRoster = [];
          for (var i = 0; i < Math.min(players.length, 200); i++) {
            var player = players[i];

            var roster_entry = newRosterRecordUndrafted(player.player_id, player.name);

            newRoster.push(roster_entry);
          }

          roster.data.roster = newRoster;
          roster.data.transactions = [];

          // now put the roster back
          var Roster = app.models.Roster;

          Roster.upsert(roster, function(err, record) {
            if (!err && record) {

              logger.log("updated roster for game " + id);
              cb(null, record);

            } else {
              if (!record) {
                errCallback("Could not find rosters!", cb);
              } else {
                errCallback("Error!" + JSON.stringify(err), cb);
              }
            }
          });
        });


      }, function(err) {
        errCallback(err, cb);
      });

    }, function(err) {
      errCallback(err, cb);
    });

  };

  var copyRosterRecord = function(to, from) {
    to.player_id = from.player_id;
    to.name = from.name;
    to.gamer = from.gamer;
    to.drafted_by = from.drafted_by;
    to.draft_round = from.draft_round;
  };

  var newRosterRecordNoId = function(player) {
    var newPlayer = {};
    newPlayer.player_id = NameUtils.normalize(player.name);

    copyRosterRecord(newPlayer, player);

    return newPlayer;
  };

  var newRosterRecordUndrafted = function(id, name) {
    var newPlayer = {};

    newPlayer.player_id = id;
    newPlayer.name = name;
    newPlayer.gamer = null;
    newPlayer.drafted_by = null;
    newPlayer.draft_round = null;

    return newPlayer;
  };

var updateRoster = function(roster, players) {
  // go through the list and update the existing records
  var rosterData = roster.data.roster;
  var foundIt = false;

  for (var p = 0; p < players.length; p++) {
    var player = players[p];

    for (var i = 0; i < rosterData.length; i++) {
      var currentPlayer = rosterData[i];

      if (currentPlayer.player_id == player.player_id) {
        copyRosterRecord(currentPlayer, player);
      }
    }
  }

  // look for new adds to the player roster
  for (var p = 0; p < players.length; p++) {
    var player = players[p];

    var foundIt = false;

    for (var i = 0; i < rosterData.length; i++) {
      var currentPlayer = rosterData[i];

      if (currentPlayer.player_id == player.player_id) {
        foundIt = true;
      }
    }

    if (!foundIt) {
      var currentPlayer = newRosterRecordNoId(player);

      rosterData.push(currentPlayer);
    }
  }

  return rosterData;
}

  /**
   * /:id
   *
   * returns the roster for this game
   *
   **/
  Fantasy.updatePlayers = function(id, players, cb) {

    console.log("updating players in roster for game " + id);

    // look up this game's roster, then insert or update the player records

    var Game = app.models.Game.Promise;
    var Roster = app.models.Roster.Promise;

    Game.findById(id).then(function(game) {

      Roster.findByGameId(id).then( function(roster) {

        updateRoster(roster, players);

        // now put the roster back
        var RosterModel = app.models.Roster;

        RosterModel.replaceOrCreate(roster, function(err, record) {
          if (!err && record) {

            logger.log("updated roster for game " + id);
            cb(null, record);

          } else {
            if (!record) {
              errCallback("Could not find rosters!", cb);
            } else {
              errCallback("Error!" + JSON.stringify(err), cb);
            }
          }
        });

      }, function(err) {
        errCallback(err, cb);
      });
    }, function(err) {
      errCallback(err, cb);
    });

  };

//
// return an array of player records representing this
// gamer's roster of players
//
var getRosterForGamer = function(roster, gamerid) {
  var rosterGamer = [];

  var rosterData = roster.data.roster;
  for (var r = 0; r < rosterData.length; r++) {
    var player = rosterData[r];

    if (player.gamer == gamerid) {
      rosterGamer.push(player);
    }
  }

  return rosterGamer;
};

  /**
   * /:id
   *
   * returns the roster for this gamer
   *
   **/
  Fantasy.getRosterGamer = function(id, gamerid, cb) {

    console.log("getting roster for game " + id + " and gamer " + gamerid);

    var Game = app.models.Game.Promise;
    var Roster = app.models.Roster.Promise;

    Game.findById(id).then(function(game) {

      Roster.findByGameId(id).then( function(roster) {

        // fluff up the record with game information
        var gameInfo = {
          "game": id,
          "name": game.data.name
        }

        roster.data.game = gameInfo;

        var rosterGamer = getRosterForGamer(roster, gamerid);

        roster.data.roster = rosterGamer;

        cb(null, {
          "roster": roster
        });

      }, function(err) {
        errCallback(err, cb);
      });
    }, function(err) {
      errCallback(err, cb);
    });

  };

  var getEventForGame = function(game, eventid) {
    var events = game.data.events;
    var foundEvent = null;

    for (var e = 0; e < events.length; e++) {
      var event = events[e];

      if (event.id == eventid) {
        foundEvent = event;
        break;
      }
    }

    return foundEvent;
  }

  var newEventForGame = function(game, eventid) {
    var newEvent = {};
    newEvent.id = eventid;
    newEvent.gamers = [];

    var events = game.data.events;
    events.push(newEvent);

    return newEvent;
  }

  var getOrCreateEventForGame = function(game, eventid) {
    var foundEvent = getEventForGame(game, eventid);

    if (!foundEvent) {
      // first picks for this event, add it
      console.log("first picks for event " + eventid + ", adding them");

      foundEvent = newEventForGame(game, eventid);
    }

    return foundEvent;
  }

  var getGamerForEvent = function(event, gamerid) {
    var gamers = event.gamers;
    var foundGamer = null;

    for (var g = 0; g < gamers.length; g++) {
      var gamer = gamers[g];

      if (gamer.id == gamerid) {
        foundGamer = gamer;
        break;
      }
    }

    return foundGamer;
  }

  var newGamerForEvent = function(event, gamerid) {
    var newGamer = {};
    newGamer.id = gamerid;

    event.gamers.push(newGamer);

    return newGamer;
  }

  var getOrCreateGamerForEvent = function(event, gamerid) {
    var foundGamer = getGamerForEvent(event, gamerid);

    if (!foundGamer) {
      console.log("first picks for gamer " + gamerid + ", adding them");

      // first time these picks have been saved for this gamer, add them
      foundGamer = newGamerForEvent(event, gamerid);
    }

    return foundGamer;
  }




  /**
   * /:id/event/:eventid/gamer/:gamerid
   *
   * returns the picks for this gamer
   *
   **/
  Fantasy.getPicks = function(id, eventid, gamerid, cb) {

    console.log("getting picks for game " + id + " and event " + eventid + " and gamer " + gamerid);

    var Game = app.models.Game.Promise;

    Game.findById(id).then(function(game) {

      var picks = [];

      var event = getEventForGame(game, eventid);

      if (event) {
        var gamer = getGamerForEvent(event, gamerid);

        if (gamer) {
          console.log("found picks for " + gamerid);
          console.log("picks: " + JSON.stringify(gamer.picks));
          picks = gamer.picks;
        }
      }

      cb(null, {
        "picks": picks
      });

    }, function(err) {
      errCallback(err, cb);
      return;
    });

  };

  /**
   * /:id/event/:eventid/gamer/:gamerid
   *
   * saves the picks for this gamer
   *
   **/
  Fantasy.putPicks = function(id, eventid, gamerid, picks, cb) {

    console.log("saving picks for game " + id + " and event " + eventid + " and gamer " + gamerid);
    console.log("picks: " + JSON.stringify(picks));

    var Game = app.models.Game.Promise;

    Game.findById(id).then(function(game) {

      var event = getOrCreateEventForGame(game, eventid);

      var gamer = getOrCreateGamerForEvent(event, gamerid);

      gamer.picks = picks;

      console.log("replaced event record: " + JSON.stringify(event));
      console.log("game: " + JSON.stringify(game));

      // now put the game back
      var Game = app.models.Game.Promise;

      Game.replaceOrCreate(game).then(function(record) {
        if (record) {

          // logger.log("updated picks for game " + id)
          // console.log("updated game: " + JSON.stringify(record));

          cb(null, {
            "picks": picks
          });

        } else {
          errCallback("Could not replace game!", cb);
        }
      }, function(err) {
        errCallback("Error!" + JSON.stringify(err), cb);
      });

    }, function(err) {
      errCallback(err, cb);
      return;
    });

  };


};
