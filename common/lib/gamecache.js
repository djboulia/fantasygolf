var logger = require('../lib/logger.js');
var Cache = require('../lib/cache.js');
var gameCache = new Cache(5); // 5 secs

/**
 *
 * implement a simple caching mechanism for our game data
 * Cloudant has a max of 5 queries per second.  We implement a
 * 5 second cache to make sure multiple requests don't hit the
 * back in less than a second.
 *
 * all get/put operations on the game should go through the
 * main Game.Promise interface, which then uses this on the
 * back end to cache results
 **/
var GameCache = function(Game) {

  this.findById = function(id) {

    return new Promise(function(resolve, reject) {
      // first look in the cache
      var record = gameCache.get(id);
      if (record) {
        console.log("cache hit for game " + id );

        process.nextTick(function() {
          resolve(record);
        });
      } else {
        // no cache hit, look it up
        console.log("no cache hit for game " + id );

        Game.findById(id, function(err, record) {
          if (!err && record) {

            logger.log("Found game: " + record.id);
            logger.debug( + JSON.stringify(record));

            // update the cache
            gameCache.put(id, record);

            resolve(record);

          } else {
            if (err) {
              var str = "Error!" + JSON.stringify(err);
              logger.error(str);
              reject(str);
            } else {
              var str = "Could not find game id " + id;
              logger.error(str);
              reject(str);
            }
          }
        });
      }
    });

  };

  this.create = function(record) {
    return new Promise(function(resolve, reject) {
      Game.create(record, function(err, record) {
        if (!err && record) {

          var gameid = record.id;

          logger.log("created game: " + gameid);

          // update the cache
          gameCache.put(gameid, record);

          resolve(record);

        } else {
          if (!record) {
            var str = "Could not create game";
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

  //
  //  this updates our cache after writing through to the database
  //
  this.update = function(record) {
    return new Promise(function(resolve, reject) {

      Game.replaceOrCreate(record, function(err, record) {
        if (!err && record) {

          var gameid = record.id;

          logger.log("updated game " + gameid + ', adding to cache');

          // update the cache
          gameCache.put(gameid, record);

          resolve(record);

        } else {
          if (err) {
            var str = "Error!" + JSON.stringify(err);
            reject(str);
          } else {
            var str = "Could not update game!";
            reject(str);
          }
        }
      });

    });
  };

  this.find = function() {
    return new Promise(function(resolve, reject) {

      Game.find(function(err, records) {
        if (!err) {

          // add all of these to our cache

          for (var i=0; i<records.length; i++) {
            var record = records[i];

            var gameid = record.id;

            logger.log("adding game " + gameid + ', to cache');

            // update the cache
            gameCache.put(gameid, record);
          }

          resolve(records);

        } else {
          var str = "Error!" + JSON.stringify(err);
          logger.error(str);
          reject(str);
        }
      });
    });
  }

};

module.exports = GameCache;
