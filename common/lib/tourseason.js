// module to handle interactions with the tour data service
// this service provides scoring data and world ranking information for the
// the PGA tour.  it provides the base data used for fantasy golf

var JsonRequest = require('./jsonrequest.js');

var baseUrl = "http://tourdata.mybluemix.net/api";

var getGameUrl = function( year, tour, event ) {
  return baseUrl + "/games/" + year + "/tour/" + tour + "/event/" + event;
};

var getWorldRankingsUrl = function( year, tour ) {
  return baseUrl + "/rankings/search?tour=" + tour + "&year=" + year;
};

var getScheduleUrl = function( year, tour ) {
  return baseUrl + "/tournaments/search?tour=" + tour + "&year=" + year;
};

var TourSeason = function(year, tour ) {
  this.getEvent = function(event, cb) {
    var url = getGameUrl(year, tour, event);

    console.log("getting scoring for event " + url);

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
