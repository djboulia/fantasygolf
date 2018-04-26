var logger = require('../lib/logger.js');
var Cache = require('../lib/cache.js');

var gamerCache = new Cache(60 * 10); // 10 mins

module.exports = function(Gamer) {

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
};
