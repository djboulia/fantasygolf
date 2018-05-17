
var endOfDay = function(date) {
  // convert timems to end of the current day.
  // this will give us a grace period for comparisons
  var eod = new Date(date);

  eod.setHours(23, 59, 59, 999);

  return eod;
};

var dayOfWeekString = function(theDate) {
  // return day of Week
  var days = ["Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
  ];
  var dateObj = new Date(theDate);

  return days[dateObj.getDay()];
};

var timeString = function(theDate) {
  var dateObj = new Date(theDate);

  var hours = dateObj.getHours();
  var minutes = dateObj.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;

  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
};


function DateUtils() {

  // we define "now" in the eastern time zone for the start of
  // date comparisons.  the code below will conver to the eastern
  // time zone regardless of the server time zone
  var offset = -4;  // Eastern timezone
  var d = new Date();
  var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  var now = new Date(utc + (3600000*offset));

  this.dateString = function(theDate) {
    var months = ["January", "February", "March", "April",
      "May", "June", "July", "August", "September",
      "October", "November", "December"
    ];

    var dateObj = new Date(theDate);
    return dayOfWeekString(theDate) + ", " +
      months[dateObj.getMonth()] + " " + dateObj.getDate();
  };

  this.dateTimeString = function(theDate) {
    return this.dateString(theDate) + " " + timeString(theDate);
  };

  //
  // dates come in from tourdata in GMT time.  that messes up our start/end calculations,
  // so account for it in this function
  //
  this.adjustedForTimezone = function(date) {
    var newDate = new Date(date);

    newDate.setTime(newDate.getTime() + newDate.getTimezoneOffset() * 60 * 1000);

    return newDate;
  };

  this.tournamentComplete = function(start, end) {

    // bump end date to end of the current day before comparing
    end = endOfDay(end);

    console.log("tournamentComplete: start: " +
      this.dateTimeString(start) + " end: " + this.dateTimeString(end) +
      " date: " + this.dateTimeString(now));

    return now.getTime() > end.getTime();
  };

  this.tournamentInProgress = function(start, end) {

    // bump end date to end of the current day before comparing
    end = endOfDay(end);

    console.log("tournamentInProgress: start: " +
      this.dateTimeString(start) + " end: " + this.dateTimeString(end) +
      " date: " + this.dateTimeString(now));

    return (now.getTime() > start.getTime()) && (now.getTime() < end.getTime());
  };

  this.tournamentOpens = function(start) {
    //
    // we allow picks to be set a few days before the start of the tournament
    // check for that here
    //
    var daysInAdvance = 1000 * 60 * 60 * 24 * 3; // 3 days in advance, e.g. Monday before the tournament
    var opens = start.getTime() - daysInAdvance;

    return opens;
  };

  this.tournamentIsOpen = function(start, end) {
    var opens = this.tournamentOpens(start);

    console.log("tournamentIsOpen: tournament opens for picks on: " +
      this.dateTimeString(new Date(opens)) + " current time: " + this.dateTimeString(now));

    console.log("date: " +
      now.getTime() + " opens: " + opens);

    if (now.getTime() >= opens) {
      return true;
    }

    return false;
  };

};

module.exports = DateUtils;
