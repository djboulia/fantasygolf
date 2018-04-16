'use strict';

var request = require('request');
var logger = require('../lib/logger.js');
var cacheModule = require('../lib/cache.js');
var NameUtils = require('../lib/nameutils.js');

var jsonRequestCache = new cacheModule.Cache(60 * 5); // 5 mins
var gamerCache = new cacheModule.Cache(60 * 10); // 10 mins

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


    var jsonRequest = function(url, cb) {
      var json = jsonRequestCache.get(url);

      // check cache first, return that if we have it already
      if (json) {
        process.nextTick(function() {
          cb(json);
        });
      } else {
        // nope, go to the web and get it
        request.get(url, (error, response, body) => {

          if (!error) {

            json = JSON.parse(body);

            // save it in the cache for next time
            jsonRequestCache.put(url, json);

          }

          cb(json);

        });
      }

    }

    var endOfDay = function(date) {
      // convert timems to end of the current day.
      // this will give us a grace period for comparisons
      var eod = new Date(date);

      eod.setHours(23, 59, 59, 999);

      return eod;
    };

    var dayOfWeekString = function(theDate) {
      // return day of Week
      var days = ["Sunday", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday"
      ];
      var dateObj = new Date(theDate);

      return days[dateObj.getDay()];
    };

    var dateString = function(theDate) {
      var months = ["January", "February", "March", "April",
        "May", "June", "July", "August", "September",
        "October", "November", "December"
      ];

      var dateObj = new Date(theDate);
      return dayOfWeekString(theDate) + ", " +
        months[dateObj.getMonth()] + " " + dateObj.getDate();
    };

    var timeString = function(theDate) {
      var dateObj = new Date(theDate);

      var hours = dateObj.getHours();
      var minutes = dateObj.getMinutes();
      var ampm = hours >= 12 ? 'pm' : 'am';

      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      minutes = minutes < 10 ? '0' + minutes : minutes;

      var strTime = hours + ':' + minutes + ' ' + ampm;
      return strTime;
    };

    var dateTimeString = function(theDate) {
      return dateString(theDate) + " " + timeString(theDate);
    };

    //
    // dates come in from tourdata in GMT time.  that messes up our start/end calculations,
    // so account for it in this function
    //
    var dateAdjustedForTimezone = function(date) {
      var newDate = new Date(date);

      newDate.setTime(newDate.getTime() + newDate.getTimezoneOffset() * 60 * 1000);

      return newDate;
    };

    var tournamentComplete = function(date, start, end) {

      // bump end date to end of the current day before comparing
      end = endOfDay(end);

      console.log("tournamentComplete: start: " +
        dateTimeString(start) + " end: " + dateTimeString(end) +
        " date: " + dateTimeString(date));

      return date.getTime() > end.getTime();
    };

    var tournamentInProgress = function(date, start, end) {

      // bump end date to end of the current day before comparing
      end = endOfDay(end);

      console.log("tournamentInProgress: start: " +
        dateTimeString(start) + " end: " + dateTimeString(end) +
        " date: " + dateTimeString(date));

      return (date.getTime() > start.getTime()) && (date.getTime() < end.getTime());
    };

    var tournamentOpens = function(start) {
      //
      // we allow picks to be set a few days before the start of the tournament
      // check for that here
      //
      var daysInAdvance = 1000 * 60 * 60 * 24 * 3; // 3 days in advance, e.g. Monday before the tournament
      var opens = start.getTime() - daysInAdvance;

      return opens;
    }

    var tournamentIsOpen = function(date, start, end) {
      var opens = tournamentOpens(start);

      console.log("tournamentIsOpen: tournamnent opens for picks on: " +
        dateTimeString(new Date(opens)) + " current time: " + dateTimeString(date));

      console.log("date: " +
        date.getTime() + " opens: " + opens);

      if (date.getTime() >= opens) {
        return true;
      }

      return false;
    };



    var addActiveSeasons = function(games, cb) {

      if (games.length > 0) {
        var requests = 0;

        for (var i = 0; i < games.length; i++) {
          requests++;

          addActiveSeason(games[i], function(record) {
            requests--;

            // after all request callbacks complete, call our main callback
            if (requests == 0) {

              for (var g = 0; g < games.length; g++) {
                var game = games[g];

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
                  var start = dateAdjustedForTimezone(event.start);
                  var end = dateAdjustedForTimezone(event.end);

                  if (!event.start || !event.end) {
                    console.error("ERROR: couldn't find schedule details!");
                    break;
                  }

                  if (!tournamentComplete(now, start, end)) {
                    nextEvent = {};
                    nextEvent.id = event.id;
                    nextEvent.name = event.name;
                    nextEvent.start = event.start;
                    nextEvent.end = event.end;

                    break;
                  }
                }

                // load up the next event in the schedule
                if (nextEvent) {
                  var start = dateAdjustedForTimezone(nextEvent.start);
                  var end = dateAdjustedForTimezone(nextEvent.end);

                  nextEvent.inProgress = false;
                  nextEvent.canSetPicks = false;

                  if (tournamentInProgress(now, start, end)) {
                    nextEvent.inProgress = true;
                  } else if (tournamentIsOpen(now, start, end)) {
                    nextEvent.canSetPicks = true;
                  } else {
                    nextEvent.opens = dateString(tournamentOpens(start));
                  }
                }

                game.data.nextEvent = nextEvent;

              }

              cb(games);
            }
          });
        }

      } else {

        console.log("no games found!")
        cb(games);
      }

    };

    var addActiveSeason = function(record, cb) {
      var baseUrl = "http://tourdata.mybluemix.net/api/games";

      var game = record.data;
      var schedule = game.schedule;

      if (schedule.length > 0) {
        var requests = 0;

        for (var s = 0; s < schedule.length; s++) {
          var event = schedule[s];

          console.log("found event " + event.id);

          var url = baseUrl + "/" + game.season + "/tour/" + game.tour + "/event/" + event.id;
          console.log("getting scoring for event " + url);

          requests++;

          processSeason(url, event, function(event) {

            requests--;

            // after all request callbacks complete, call our main callback
            if (requests == 0) {
              cb(record);
            }

          });

        }

      } else {

        console.log("no schedule found!")
        cb(record);
      }

    };

    var processSeason = function(url, event, cb) {
      jsonRequest(url, (json) => {

        if (json) {

          // remember the event name
          event.name = json.name;
          event.start = json.start;
          event.end = json.end;
          event.course = json.course;
        }

        cb(event);

      });
    };


    var addScoringForGames = function(games, cb) {
      if (games.length > 0) {

        var requests = 0;

        for (var i = 0; i < games.length; i++) {
          requests++;

          addScoring(games[i], function(record) {
            requests--;

            // after all request callbacks complete, call our main callback
            if (requests == 0) {
              cb(games);
            }
          });
        }

      } else {

        console.log("no games found!")
        cb(games);
      }
    };

    var addScoring = function(record, cb) {
      var baseUrl = "http://tourdata.mybluemix.net/api/games";

      var game = record.data;
      var events = game.events;

      if (events.length > 0) {

        findRosterForGame(record.id, function(roster) {
            if (!roster) {
              console.error("No roster found for this game!");
              cb(null);
              return;
            }


            var requests = 0;

            for (var e = 0; e < events.length; e++) {
              var event = events[e];

              console.log("found event " + event.id);

              var url = baseUrl + "/" + game.season + "/tour/" + game.tour + "/event/" + event.id;
              console.log("getting scoring for event " + url);

              requests++;

              processScore(url, roster, event, function(event) {

                requests--;

                // after all request callbacks complete, call our main callback
                if (requests == 0) {
                  cb(record);
                }

              });

            }
          });
        }
        else {

          console.log("no events found!")
          cb(record);
        }

      };

      var findPlayerInRoster = function( roster, id ) {
        var found = null;

        var rosterData = roster.data.roster;
        for (var r=0; r < rosterData.length; r++) {
          var player = rosterData[r];

          if (id == player.player_id) {
            found = player;
          }
        }

        return found;
      };

      var processScore = function(url, roster, event, cb) {
        jsonRequest(url, (json) => {

          if (json) {

            // remember the event name
            event.name = json.name;

            if (event.gamers) {
              for (var g = 0; g < event.gamers.length; g++) {
                var gamer = event.gamers[g];

                for (var s = 0; s < json.scores.length; s++) {
                  var score = json.scores[s];

                  var picks = gamer.picks;
                  for (var p = 0; p < picks.length; p++) {
                    var pick = picks[p];

                    if (score.id == pick.id) {
                      pick.name = score.name;
                      pick.score_details = score.score_details;

                      //                  console.log("found picks " + JSON.stringify(pick));
                    }
                  }

                }

                // now look to see if we have any picks where we don't have scoring details
                // this indicates someone started a player who wasn't in the field
                // update the record to fill in with empty scoring
                //
                var picks = gamer.picks;
                for (var p = 0; p < picks.length; p++) {
                  var pick = picks[p];

                  if (!pick.score_details) {
                    // look up the pick name in our roster
                    console.log("didn't find pick details for " + pick.id);

                    var player = findPlayerInRoster(roster, pick.id);

                    if (player) {
                      pick.name = player.name;
                      pick.score_details = { total : 0 };
                    } else {
                      console.log("Couldn't find player " + pick.id);
                    }

                  }
                }

              }

            }

          }

          cb(event);

        });
      };



      var gamerFindByIdWithCache = function(id, cb) {
        var Gamer = app.models.Gamer;

        // cache lookups to gamer records
        var record = gamerCache.get(id);

        // check cache first, return that if we have it already
        if (record) {
          process.nextTick(function() {
            cb(null, record);
          });
        } else {
          // nope, go to the db and get it
          Gamer.findById(id, function(err, record) {
            if (!err && record) {
              // save it in the cache for next time
              gamerCache.put(id, record);
            }

            cb(err, record);
          });
        }
      };

      var findGamer = function(gamer, cb) {
        console.log("fetching gamer " + gamer.id);

        gamerFindByIdWithCache(gamer.id, function(err, gamerRecord) {
          if (!err && gamerRecord) {

            logger.log("Found gamer: " + JSON.stringify(gamerRecord));

            // fluff up our data structure
            gamer.name = gamerRecord.data.name;

          } else {
            if (!gamerRecord) {
              var str = "Could not find gamer id " + gamer.id;
              logger.error(str);
            } else {
              logger.error("Error!" + JSON.stringify(err));
            }
          }

          cb(gamer);
        });
      };

      var addGamerData = function(record, cb) {
        var game = record.data;
        var events = game.events;

        var requests = 0;

        for (var e = 0; e < events.length; e++) {
          var event = events[e];

          requests++;

          findGamerNames(event.gamers, function(gamers) {
            requests--;

            if (requests == 0) {
              cb(record);
            }
          });

        }
      };

      var findGamerNames = function(gamers, cb) {
        // fluff up a gamers array with the name details
        // for each gamerid in the list
        // expects an array of gamer ids
        // [ { "id" : "1234"}, { "id" : "4565"}]
        // returns the array with names filled in:
        // [ { "id" : "1234", "name" : "Don Boulia"}, { "id" : "4565", "name" : "Carter Boulia"}]

        if (!gamers) {
          console.error("null gamers array!");
          cb(null);
        }

        var requests = 0;

        for (var g = 0; g < gamers.length; g++) {
          var gamer = gamers[g];

          requests++;

          findGamer(gamer, function(gamer) {
            requests--;

            if (requests == 0) {
              cb(gamers);
            }
          });

        }
      };

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

              var gamers = event.gamers;
              var found = false;

              if (gamers) {


                // now look for our gamerid in the list
                for (var g = 0; g < gamers.length; g++) {
                  var gamer = gamers[g];

                  if (gamer.id == gamerid) {
                    // found a match, add this record to our list and continue
                    logger.log("Found game!: " + JSON.stringify(record));
                    games.push(record);
                    found = true;
                    break;
                  }
                }
              }

              if (found) {
                // already got this game, move on
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

        var Game = app.models.Game;

        Game.find(function(err, records) {

          var games = [];

          if (!err && records) {

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
            if (!records) {
              var str = "No game records found for gamer " + gamerid;
              logger.log(str);
              cb(null, {
                "games": games
              });
            } else {
              logger.error("Error!" + JSON.stringify(err));
              cb(err, null);
            }
          }
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

            for (var p = 0; p < gamer.picks.length; p++) {
              var pick = gamer.picks[p];
              if (pick.score_details && pick.score_details.total) {
                gamerTotal += pick.score_details.total;
              } else {
                console.error("ERROR: could get total for picks.score_details" + JSON.stringify(pick.score_details));
              }
              console.log("gamerTotal = " + gamerTotal);
            }

            gamer.total = gamerTotal;

            if (!seasonTotals[gamer.id]) {
              // first event for this gamer, intialize the data structure
              seasonTotals[gamer.id] = {
                "total": gamerTotal,
                "name": gamer.name
              };

              console.log("set seasonTotals " + JSON.stringify(seasonTotals));
            } else {
              console.log("adding to totals " + gamer.id + "gamerTotal=" + gamerTotal);
              seasonTotals[gamer.id]["total"] += gamerTotal;
            }

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

            addScoring(record, function(record) {
              addGamerData(record, function(record) {

                tallyTotalScores(record);

                cb(null, {
                  game: record
                });
              });
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

        console.log("getting roster for game " + id);

        findGame(id, function(game) {
          if (!game) {
            errCallback("No game with that id found!", cb);
            return;
          }

          findRosterForGame(id, function(roster) {
            if (!roster) {
              errCallback("No roster found for this game!", cb);
              return;
            }

            // fluff up the record with game information
            var gameInfo = {
              "game": id,
              "name": game.data.name
            }

            roster.data.game = gameInfo;

            var gamers = game.data.gamers;
            findGamerNames(gamers, function(obj) {
              roster.data.gamers = game.data.gamers;

              cb(null, {
                "roster": roster
              });
            })

          });
        });

      };

      var findGame = function(id, cb) {
        var Game = app.models.Game;

        Game.findById(id, function(err, record) {
          if (!err && record) {

            logger.log("Found game: " + JSON.stringify(record));

            cb(record);

          } else {
            if (!record) {
              var str = "Could not find game id " + id;
              logger.error(str);
              cb(null);
            } else {
              logger.error("Error!" + JSON.stringify(err));
              cb(null);
            }
          }
        });
      };

      var errCallback = function(str, cb) {
        logger.error(str);

        cb(str, null);
      };

      var findRosterForGame = function(gameid, cb) {
        var Roster = app.models.Roster;

        Roster.find(function(err, records) {

          if (!err && records) {

            for (var i = 0; i < records.length; i++) {
              var record = records[i];

              if (record.data.game == gameid) {
                console.log("roster found for game " + gameid + " " + JSON.stringify(record));
                cb(record);
                return;
              }
            }

            logger.error("no roster found for game " + gameid);
            cb(null);
            return;

          } else {
            if (!records) {
              logger.error("Could not find rosters!");
              cb(null);
            } else {
              logger.error("Error!" + JSON.stringify(err));
              cb(null);
            }
          }
        });
      };


      /**
       * /:id
       *
       * initializes the roster with tour players
       *
       **/
      Fantasy.initRoster = function(id, cb) {

        console.log("initializing roster for game " + id);

        findGame(id, function(game) {
          if (!game) {
            errCallback("No game with that id found!", cb);
            return;
          }

          var tour = game.data.tour;
          var year = game.data.season;

          findRosterForGame(id, function(roster) {
            if (!roster) {
              errCallback("No roster found for this game!", cb);
              return;
            }

            // now go get the tour data to load up the roster
            // we use the world rankings for the given tour and year
            // take the top 200 and load them in.

            var url = "http://tourdata.mybluemix.net/api/rankings/search?tour=" + tour + "&year=" + year;

            jsonRequest(url, function(players) {

              if (!players) {
                errCallback("Couldn't load tour player info!", cb);
                return;
              }

              var newRoster = [];
              for (var i = 0; i < Math.min(players.length, 200); i++) {
                var player = players[i];

                var roster_entry = {
                  "player_id": player.player_id,
                  "name": player.name,
                  "gamer": null,
                  "drafted_by": null,
                  "draft_round": null
                };

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


          });
        });

      };

      /**
       * /:id
       *
       * returns the roster for this game
       *
       **/
      Fantasy.updatePlayers = function(id, players, cb) {

        console.log("updating players in roster for game " + id);

        // look up this game's roster, then insert or update the player records

        findGame(id, function(game) {
          if (!game) {
            errCallback("No game with that id found!", cb);
            return;
          }

          findRosterForGame(id, function(roster) {
            if (!roster) {
              errCallback("No roster found for this game!", cb);
              return;
            }

            // go through the list and update the existing records
            var updateRoster = roster.data.roster;
            var foundIt = false;

            for (var p = 0; p < players.length; p++) {
              var player = players[p];

              for (var i = 0; i < updateRoster.length; i++) {
                var currentPlayer = updateRoster[i];

                if (currentPlayer.player_id == player.player_id) {
                  currentPlayer.name = player.name;
                  currentPlayer.gamer = player.gamer;
                  currentPlayer.drafted_by = player.drafted_by;
                  currentPlayer.draft_round = player.draft_round;
                }
              }
            }

            // look for new adds to the player roster
            for (var p = 0; p < players.length; p++) {
              var player = players[p];

              var foundIt = false;

              for (var i = 0; i < updateRoster.length; i++) {
                var currentPlayer = updateRoster[i];

                if (currentPlayer.player_id == player.player_id) {
                  foundIt = true;
                }
              }

              if (!foundIt) {
                var currentPlayer = {};
                currentPlayer.player_id = NameUtils.normalize(player.name);
                currentPlayer.name = player.name;
                currentPlayer.gamer = player.gamer;
                currentPlayer.drafted_by = player.drafted_by;
                currentPlayer.draft_round = player.draft_round;

                updateRoster.push(currentPlayer);
              }
            }

            // now put the roster back
            var Roster = app.models.Roster;

            Roster.replaceOrCreate(roster, function(err, record) {
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
        });

      };

      /**
       * /:id
       *
       * returns the roster for this gamer
       *
       **/
      Fantasy.getRosterGamer = function(id, gamerid, cb) {

        console.log("getting roster for game " + id + " and gamer " + gamerid);

        findGame(id, function(game) {
          if (!game) {
            errCallback("No game with that id found!", cb);
            return;
          }

          findRosterForGame(id, function(roster) {
            if (!roster) {
              errCallback("No roster found for this game!", cb);
              return;
            }

            // fluff up the record with game information
            var gameInfo = {
              "game": id,
              "name": game.data.name
            }

            roster.data.game = gameInfo;

            var rosterGamer = [];

            var rosterData = roster.data.roster;
            for (var r = 0; r < rosterData.length; r++) {
              var player = rosterData[r];

              if (player.gamer == gamerid) {
                rosterGamer.push(player);
              }
            }

            roster.data.roster = rosterGamer;

            cb(null, {
              "roster": roster
            });

          });
        });

      };

      /**
       * /:id/event/:eventid/gamer/:gamerid
       *
       * returns the picks for this gamer
       *
       **/
      Fantasy.getPicks = function(id, eventid, gamerid, cb) {

        console.log("getting picks for game " + id + " and event " + eventid + " and gamer " + gamerid);

        findGame(id, function(game) {
          if (!game) {
            errCallback("No game with that id found!", cb);
            return;
          }

          var picks = [];
          var events = game.data.events;

          for (var e = 0; e < events.length; e++) {
            var event = events[e];

            if (event.id == eventid) {
              var gamers = event.gamers;

              for (var g = 0; g < gamers.length; g++) {
                var gamer = gamers[g];

                if (gamer.id == gamerid) {
                  console.log("found picks for " + gamerid);
                  console.log("picks: " + JSON.stringify(gamer.picks));
                  picks = gamer.picks;
                  break;
                }
              }
            }
          }

          cb(null, {
            "picks": picks
          });

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

        findGame(id, function(game) {
          if (!game) {
            errCallback("No game with that id found!", cb);
            return;
          }

          var events = game.data.events;
          var foundEvent = null;

          for (var e = 0; e < events.length; e++) {
            var event = events[e];

            if (event.id == eventid) {
              foundEvent = event;
              break;
            }
          }

          if (!foundEvent) {
            // first picks for this event, add it
            console.log("first picks for event " + eventid + ", adding them");

            foundEvent = {};
            foundEvent.id = eventid;
            foundEvent.gamers = [];

            events.push(foundEvent);
          }

          var gamers = foundEvent.gamers;
          var foundGamer = null;

          for (var g = 0; g < gamers.length; g++) {
            var gamer = gamers[g];

            if (gamer.id == gamerid) {
              foundGamer = gamer;
              break;
            }
          }

          if (!foundGamer) {
            console.log("first picks for gamer " + gamerid + ", adding them");

            // first time these picks have been saved for this gamer, add them
            foundGamer = {};
            foundGamer.id = gamerid;

            foundEvent.gamers.push(foundGamer);
          }

          foundGamer.picks = picks;

          console.log("replaced event record: " + JSON.stringify(foundEvent));
          console.log("game: " + JSON.stringify(game));

          // now put the game back
          var Game = app.models.Game;

          Game.replaceOrCreate(game, function(err, record) {
            if (!err && record) {

              // logger.log("updated picks for game " + id)
              // console.log("updated game: " + JSON.stringify(record));

              cb(null, {
                "picks": picks
              });

            } else {
              if (!record) {
                errCallback("Could not find game!", cb);
              } else {
                errCallback("Error!" + JSON.stringify(err), cb);
              }
            }
          });

        });

      };


    };
