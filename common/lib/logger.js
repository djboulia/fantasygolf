  var debugMode = false; // turn this on to get diagnostic info

  exports.setDebugMode = function(val) {
    debugMode = val;
  };

  exports.log = function(str) {
    console.log(str);
  };

  exports.debug = function(str) {
    if (this.debugMode) console.log("[DEBUG] " + str);
  };

  exports.error = function(str) {
    console.error(str);
  };
