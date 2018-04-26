var request = require('request');

var Cache = require('../lib/cache.js');
var jsonRequestCache = new Cache(60 * 5); // 5 mins

exports.get = function(url, cb) {
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
