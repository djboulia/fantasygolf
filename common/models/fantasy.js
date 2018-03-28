'use strict';

var request = require('request');
var logger = require('../lib/logger.js');
var cacheModule = require('../lib/cache.js');

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
        required: true
      }],
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

  var addScoringForGames = function(games, cb) {
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
  };

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

  var processEvent = function(url, event, cb) {
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

                  console.log("found picks " + JSON.stringify(pick));
                }
              }
            }
          }

        }

      }

      cb(gamer);

    });
  };

  var addScoring = function(record, cb) {
    var baseUrl = "http://tourdata.mybluemix.net/api/games";

    var game = record.data;
    var events = game.events;

    var requests = 0;

    for (var e = 0; e < events.length; e++) {
      var event = events[e];

      console.log("found event " + event.id);

      var url = baseUrl + "/" + game.season + "/tour/" + game.tour + "/event/" + event.id;
      console.log("getting scoring for event " + url);

      requests++;

      processEvent(url, event, function(event) {

        requests--;

        // after all request callbacks complete, call our main callback
        if (requests == 0) {
          cb(record);
        }

      });

    }
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

      for (var g = 0; g < event.gamers.length; g++) {
        var gamer = event.gamers[g];

        requests++;

        findGamer(gamer, function(gamer) {
          requests--;

          if (requests == 0) {
            cb(record);
          }
        });

      }
    }
  };

  /**
   * /search?gamer=12353435
   *
   * returns the games that this player is particpating in
   *
   **/
  Fantasy.search = function(gamerid, cb) {

    var str = "searching for games for gamer " + gamerid;
    logger.log(str);

    var Game = app.models.Game;

    Game.find(function(err, records) {

      var games = [];

      if (!err && records) {

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

        var Gamer = app.models.Gamer;

        // now fluff up the individual picks with more data and scores
        //        addGamers(games, Gamer, function(games) {
        addScoringForGames(games, function(games) {
          cb(null, {
            "games": games
          });
        });
        //        });

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
        "name" : seasonTotals[id].name,
        "total" : seasonTotals[id].total
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


};
