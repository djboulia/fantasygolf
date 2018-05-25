var logger = require('../lib/logger.js');
var Cache = require('../lib/cache.js');
var rosterCache = new Cache(5); // 5 secs

/**
 *
 * implement a simple caching mechanism for our roster data
 * Cloudant has a max of 5 queries per second.  We implement a
 * 5 second cache to make sure multiple requests don't hit the
 * back in less than a second.
 *
 * all get/put operations on the roster should go through the
 * main Roster.Promise interface, which then uses this on the
 * back end to cache results
 **/
var RosterCache = function(Roster) {

  this.getByGameId = function(gameid) {

    return new Promise(function(resolve, reject) {

      // first look in the cache
      var record = rosterCache.get(gameid);
      if (record) {
        console.log("cache hit for game " + gameid + " roster");

        process.nextTick(function() {
          resolve(record);
        });
      } else {
          // no cache hit, look it up
          console.log("no cache hit for game " + gameid + " roster");

          Roster.find(function(err, records) {

            if (!err && records) {

              for (var i = 0; i < records.length; i++) {
                var record = records[i];

                // add to our cache
                rosterCache.put(record.data.game, record);

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
      }

    });
  };

  //
  //  this updates our cache after writing through to the database
  //
  this.update = function(roster) {
    return new Promise(function(resolve, reject) {

      Roster.replaceOrCreate(roster, function(err, record) {
        if (!err && record) {

          var gameid = record.data.game;

          logger.log("updated roster for game " + gameid);

          // update the cache
          rosterCache.put(gameid, record);

          resolve(record);

        } else {
          if (err) {
            var str = "Error!" + JSON.stringify(err);
            reject(str);
          } else {
            var str = "Could not update rosters!";
            reject(str);
          }
        }
      });

    });
  };

};

module.exports = RosterCache;
