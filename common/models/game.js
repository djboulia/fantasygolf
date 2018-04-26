var logger = require('../lib/logger.js');

module.exports = function(Game) {

  /**
   * create promise-friendly versions of key functions we use internally
   * in the other modules
   **/
  Game.Promise = {};

  Game.Promise.findById = function(id) {
    return new Promise(function(resolve, reject) {
      Game.findById(id, function(err, record) {
        if (!err && record) {

          logger.log("Found game: " + JSON.stringify(record));

          resolve(record);

        } else {
          if (!record) {
            var str = "Could not find game id " + id;
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

  Game.Promise.find = function() {
    return new Promise(function(resolve, reject) {
      Game.find(function(err, records) {
        if (!err) {

          resolve(records);

        } else {
          var str = "Error!" + JSON.stringify(err);
          logger.error(str);
          reject(str);
        }
      });

    });
  };

  Game.Promise.replaceOrCreate = function(game) {
    return new Promise(function(resolve, reject) {
      Game.replaceOrCreate(game, function(err, result) {
        if (!err) {

          resolve(result);

        } else {
          var str = "Error!" + JSON.stringify(err);
          logger.error(str);
          reject(str);
        }
      });

    });
  };


};
