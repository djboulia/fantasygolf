// module to handle interactions with the tour data service
// this service provides scoring data and world ranking information for the
// the PGA tour.  it provides the base data used for fantasy golf

var JsonRequest = require('./jsonrequest.js');

var baseUrl = "http://tourdata.mybluemix.net/api";

var getGameUrl = function( year, tour, event) {
  var url = baseUrl + "/games/" + year + "/tour/" + tour + "/event/" + event;

  return url;
};

var getWorldRankingsUrl = function( year, tour ) {
  return baseUrl + "/rankings/search?tour=" + tour + "&year=" + year;
};

var getScheduleUrl = function( year, tour ) {
  return baseUrl + "/tournaments/search?tour=" + tour + "&year=" + year;
};

var getEventUrl = function( year, tour, event) {
  var url = baseUrl + "/tournaments/" + year + "/tour/" + tour + "/event/" + event;

  return url;
};


var TourSeason = function(year, tour) {
  this.getFantasyEvent = function(event, cb) {
    var url = getGameUrl(year, tour, event);

    console.log("getting scoring for event " + url);

    JsonRequest.get(url, (json) => {

      cb(json);

    });
  };

  this.getEvent = function(event, cb) {
    var url = getEventUrl(year, tour, event);

    console.log("getting event " + url);

    JsonRequest.get(url, (json) => {

      cb(json);

    });
  };

  this.getRankings = function(cb) {
    var url = getWorldRankingsUrl(year, tour);

    JsonRequest.get(url, (json) => {

      cb(json);

    });
  };

  this.getSchedule = function(cb) {
    var url = getScheduleUrl(year, tour);

    JsonRequest.get(url, (json) => {

      cb(json);

    });
  };
};

module.exports = TourSeason;
