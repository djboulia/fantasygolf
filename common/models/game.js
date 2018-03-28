var request = require('request');

var logger = {
  debugMode: false, // turn this on to get diagnostic info

  log: function(str) {
    console.log(str);
  },
  debug: function(str) {
    if (this.debugMode) console.log("[DEBUG] " + str);
  },
  error: function(str) {
    console.error(str);
  }
};


module.exports = function(Game) {
  var scores = require('../lib/scores.js');
  var app = require('../../server/server');

  Game.remoteMethod(
    'gamers', {
      http: {
        path: '/:id/Gamers',
        verb: 'get'
      },
      description: 'Get all gamers playing this game',

      accepts: [{
        arg: 'id',
        type: 'string',
        required: true
      }],
      returns: {
        arg: 'gamers',
        type: 'object',
        root: true
      }
    }
  );

  Game.remoteMethod(
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


  Game.remoteMethod(
    'getGamerPicks', {
      http: {
        path: '/:id/Gamers/:gamerid/Events/:eventid/picks',
        verb: 'get'
      },
      description: 'Get picks for an individual gamer at the given event',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'gamerid',
          type: 'string',
          required: true
        },
        {
          arg: 'eventid',
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

  Game.remoteMethod(
    'updateGamerPicks', {
      http: {
        path: '/:id/Gamers/:gamerid/picks',
        verb: 'post'
      },
      description: 'Update picks for an individual gamer',

      accepts: [{
          arg: 'id',
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
          type: 'object',
          http: {
            source: 'body'
          },
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

  Game.gamers = function(id, cb) {

    console.log("getting picks for game " + id);

    Game.findById(id, function(err, eventrecord) {
      if (!err && eventrecord) {

        var game = eventrecord.data;

        if (!game.gamers) {
          var str = "No picks found in this game object!";

          logger.error(str);
          cb(str, null);

          return;
        }

        logger.log("Found gamers: " + JSON.stringify(game.gamers));

        cb(null, game.gamers);

      } else {
        if (!eventrecord) {
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

  var addScoring = function(games, cb) {
    var baseUrl = "http://tourdata.mybluemix.net/api/games";
    var requests = 0;

    for (var i = 0; i < games.length; i++) {
      var game = games[i].data;
      var gamers = game.gamers;

      for (var g = 0; g < gamers.length; g++) {
        var gamer = gamers[g];
        if (gamer.events) {
          for (var e = 0; e < gamer.events.length; e++) {
            var event = gamer.events[e];

            var url = baseUrl + "/" + game.season + "/tour/" + game.tour + "/event/" + event.id;
            console.log("getting scoring for event " + url);

            requests++;

            // get the scoring data for this event
            request.get(url, (error, response, body) => {
              if (!error) {

                var json = JSON.parse(body);

                for (var s = 0; s < json.scores.length; s++) {
                  var score = json.scores[s];

                  var picks = event.picks;
                  for (var p = 0; p < picks.length; p++) {
                    var pick = picks[p];

                    if (score.id == pick.id) {
                      pick.score_details = score.score_details;

                      console.log("found score for pick " + JSON.stringify(pick));
                    }
                  }
                }
              }

              requests--;

              // after all request callbacks complete, call our main callback
              if (requests == 0) {
                cb(games);
              }
            });

          }
        }
      }
    }

  };

  /**
   * /search
   *
   * Games/search?gamer=12353435
   *
   * returns the games that this player is particpating in
   *
   **/
  Game.search = function(gamerid, cb) {

    var str = "searching for games for gamer " + gamerid;
    logger.log(str);

    Game.find(function(err, records) {

      var games = [];

      if (!err && records) {

        // look into each returned record for our gamer id
        for (var i = 0; i < records.length; i++) {
          var record = records[i];
          var game = record.data;
          var gamers = game.gamers;

          if (gamers) {
            logger.log("Found gamers: " + JSON.stringify(gamers));

            // now look for our gamerid in the list
            for (var g = 0; g < gamers.length; g++) {
              var gamer = gamers[g];

              if (gamer.id == gamerid) {
                // found a match, add this record to our list and continue
                logger.log("Found game!: " + JSON.stringify(record));
                games.push(record);
                break;
              }
            }
          }
        }

        var Gamer = app.models.Gamer;

        // now fluff up the individual picks with more data and scores
//        addGamers(games, Gamer, function(games) {
          addScoring(games, function(games) {
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

  Game.getGamerPicks = function(id, gamerid, eventid, cb) {

    console.log("getting picks for game " + id + " and gamer " + gamerid + " and event " + eventid);

    Game.findById(id, function(err, eventrecord) {
      if (!err && eventrecord) {

        var game = eventrecord.data;

        if (!game.gamers) {
          var str = "No picks found in this game object!";

          logger.error(str);
          cb(str, null);

          return;
        }

        var gamers = game.gamers;

        logger.log("Found gamers: " + JSON.stringify(gamers));

        for (var i = 0; i < gamers.length; i++) {
          var gamer = gamers[i];

          if (gamer.user == gamerid) {

            logger.log("Found gamer: " + JSON.stringify(gamer));

            cb(null, {
              picks: gamer.picks
            });
            return;
          }
        }

        var str = "Picks for gamer id " + gamerid + " not found";

        logger.error(str);
        cb(str, null);

      } else {
        if (!eventrecord) {
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

  Game.updateGamerPicks = function(id, gamerid, picks, cb) {

    console.log("updateGamerPicks: getting picks for game " + id + " and gamer " + gamerid);
    console.log("body contents: " + JSON.stringify(picks));

    Game.findById(id, function(err, eventrecord) {
      if (!err && eventrecord) {

        var game = eventrecord.data;

        if (!game.gamers) {
          game.gamers = [];
        }

        var gamers = game.gamers;

        logger.log("Found gamers: " + JSON.stringify(gamers));

        // find the gamer to see if this is an update of existing picks
        var gamerEntry = -1;

        for (var i = 0; i < gamers.length; i++) {
          var gamer = gamers[i];

          if (gamer.user == gamerid) {

            logger.log("Found gamer: " + JSON.stringify(gamer));

            gamerEntry = i;
            break;
          }
        }

        if (gamerEntry < 0) {
          // no prior picks for this user, add this as a new entry
          logger.log("Adding gamer picks for user: " + gamerid);

          gamers.push({
            user: gamerid,
            picks: picks
          });
        } else {
          gamers[i].picks = picks;
        }

        logger.log("updating db with the following: " + JSON.stringify(eventrecord));

        Game.upsert(eventrecord, function(err, obj) {
          if (!err) {
            logger.log("update successful!");
            cb(null, {
              picks: game.gamers
            });
          } else {
            logger.error("Error!" + JSON.stringify(err));
            cb(err, null);
          }
        });

      } else {
        if (!eventrecord) {
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
