var logger = require('../lib/logger.js');
var Cache = require('../lib/cache.js');

var gamerCache = new Cache(60 * 10); // 10 mins

module.exports = function(Gamer) {

  var app = require('../../server/server');

  /**
   * create promise-friendly versions of key functions we use internally
   * in the other modules
   **/
  Gamer.Promise = {};

  Gamer.remoteMethod(
    'login', {
      http: {
        path: '/login',
        verb: 'post'
      },
      description: 'Login the current user',
      accepts: [{
          arg: 'user',
          description: 'Email address of user',
          type: 'string'
        },
        {
          arg: 'password',
          description: 'Password for user',
          type: 'string'
        }
      ],
      returns: {
        arg: 'gamer',
        type: 'object',
        root: true
      }
    }
  );

  Gamer.login = function(user, pass, cb) {
    console.log("logging in user " + user);

    Gamer.find("", function(err, gamers) {

      console.log("got to Gamer.find");

      if (err) console.log(err);

      if (gamers) {

        var match = undefined;

        for (var i = 0; i < gamers.length; i++) {
          var gamer = gamers[i];

          console.log("Found user " + gamer.data.username);

          if (gamer.data) {
            if (gamer.data.username == user && gamer.data.password == pass) {
              match = gamer;
            }
          }
        }

        if (match) {
          cb(null, match);
        } else {
          cb("Invalid login", null);
        }

      } else {
        cb(err, null);
      }

    });

  };

  // keep track of in progress queries to the db
  // we queue them up rather than hitting the db
  // a bunch of times in a small window.  Cloudant
  // limits queries to 5 per second.
  var inProgressQueries = {};

  var gamerFindByIdWithCache = function(id, cb) {
    // this find does three things:
    //
    // 1) implements a cache so future queries for the same id
    //    won't go back to the database
    // 2) queues up queries to in-progress db requests
    //    to avoid hitting the db a bunch of times in a row
    // 3) if no cache and not in progress, goes back to
    //    the db itself
    //

    // cache lookups to gamer records
    var record = gamerCache.get(id);

    // check cache first, return that if we have it already
    if (record) {
      process.nextTick(function() {
        cb(null, record);
      });
    } else {
      // are we already querying the database for this id?
      if (inProgressQueries[id]) {

        logger.log("db query already pending for " + id + ", adding callback to the queue");
        inProgressQueries[id].push(cb);

      } else {

        // nope, add us as the first query
        inProgressQueries[id] = [];
        inProgressQueries[id].push(cb);

        // now go to the db and get it
        Gamer.findById(id, function(err, record) {
          if (!err && record) {
            // save it in the cache for next time
            gamerCache.put(id, record);
          }

          // now fire all the callbacks we've queued up
          var callbacks = inProgressQueries[id];

          logger.log("firing " + callbacks.length + " callbacks for " + id);

          for (var i = 0; i < callbacks.length; i++) {
            var cb = callbacks[i];
            cb(err, record);
          }

          // all done.  reset the callback list for this id
          inProgressQueries[id] = undefined;
        });
      }
    }
  };

  var findGamer = function(gamer) {
    return new Promise(function(resolve, reject) {

      console.log("fetching gamer " + gamer.id);

      gamerFindByIdWithCache(gamer.id, function(err, gamerRecord) {
        if (!err && gamerRecord) {

          logger.log("findGamer: found: " + JSON.stringify(gamerRecord));

          // fluff up our data structure
          gamer.name = gamerRecord.data.name;
          resolve(gamer);

        } else {
          if (!gamerRecord) {
            var str = "findGamer: Could not find gamer id " + gamer.id + " error " + err;
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

  Gamer.Promise.findGamerNames = function(gamers) {
    return new Promise(function(resolve, reject) {
      // fluff up a gamers array with the name details
      // for each gamerid in the list
      // expects an array of gamer ids:
      //
      // [ { "id" : "1234"}, { "id" : "4565"}]
      //
      // returns the array of ids with names filled in:
      // [ { "id" : "1234", "name" : "Don Boulia"}, { "id" : "4565", "name" : "Carter Boulia"}]

      if (!gamers) {
        var str = "null gamers array!";
        logger.error(str);
        reject(str);
      }

      var requests = [];

      for (var g = 0; g < gamers.length; g++) {
        var gamer = gamers[g];

        requests.push(findGamer(gamer));
      }

      Promise.all(requests).then(function() {
        resolve(gamers);
      }, function(err) {

        logger.error("Gamer.findGamerNames " + JSON.stringify(gamers));
        logger.error(err);

        reject(err);

      });

    });
  }

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
  };

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
  };

  Gamer.Promise.getPicks = function(gameid, eventid, gamerid) {
    return new Promise(function(resolve, reject) {

      var Game = app.models.Game.Promise;

      Game.findById(gameid).then(function(game) {

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

        resolve(picks);

      }, function(err) {
        reject(err);
      });
    });
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

  Gamer.Promise.putPicks = function(gameid, eventid, gamerid, picks) {
    return new Promise(function(resolve, reject) {
      var Game = app.models.Game.Promise;

      Game.findById(gameid).then(function(game) {

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

            resolve(picks);

          } else {
            var str = "Could not replace game!";
            reject(str);
          }
        }, function(err) {
          reject(err);
        });

      }, function(err) {
        reject(err);
      });
    });
  }


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

  Gamer.Promise.getRoster = function(gameid, gamerid) {
    var Roster = app.models.Roster.Promise;

    // get the roster for this individual gamer
    // first get the overall roster, then filter it to
    // just the entries that are associated with this gamer
    return new Promise(function(resolve, reject) {
      Roster.findByGameId(gameid).then(function(roster) {
        var rosterGamer = getRosterForGamer(roster, gamerid);

        roster.data.roster = rosterGamer;

        resolve(roster);
      }, function(err) {
        reject(err);
      });

    });
  };

};
