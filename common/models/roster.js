var logger = require('../lib/logger.js');

module.exports = function(Roster) {
  /**
   * create promise-friendly versions of key functions we use internally
   * in the other modules
   **/
  Roster.Promise = {};

  var errCallback = function(str, cb) {
    logger.error(str);

    cb(str, null);
  };

  Roster.Promise.findByGameId = function(gameid) {
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

};
