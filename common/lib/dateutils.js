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

var dateString = function(theDate) {
  var months = ["January", "February", "March", "April",
    "May", "June", "July", "August", "September",
    "October", "November", "December"
  ];

  var dateObj = new Date(theDate);
  return dayOfWeekString(theDate) + ", " +
    months[dateObj.getMonth()] + " " + dateObj.getDate();
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

var dateTimeString = function(theDate) {
  return dateString(theDate) + " " + timeString(theDate);
};

//
// dates come in from tourdata in GMT time.  that messes up our start/end calculations,
// so account for it in this function
//
exports.adjustedForTimezone = function(date) {
  var newDate = new Date(date);

  newDate.setTime(newDate.getTime() + newDate.getTimezoneOffset() * 60 * 1000);

  return newDate;
};

exports.tournamentComplete = function(date, start, end) {

  // bump end date to end of the current day before comparing
  end = endOfDay(end);

  console.log("tournamentComplete: start: " +
    dateTimeString(start) + " end: " + dateTimeString(end) +
    " date: " + dateTimeString(date));

  return date.getTime() > end.getTime();
};

exports.tournamentInProgress = function(date, start, end) {

  // bump end date to end of the current day before comparing
  end = endOfDay(end);

  console.log("tournamentInProgress: start: " +
    dateTimeString(start) + " end: " + dateTimeString(end) +
    " date: " + dateTimeString(date));

  return (date.getTime() > start.getTime()) && (date.getTime() < end.getTime());
};

exports.tournamentOpens = function(start) {
  //
  // we allow picks to be set a few days before the start of the tournament
  // check for that here
  //
  var daysInAdvance = 1000 * 60 * 60 * 24 * 3; // 3 days in advance, e.g. Monday before the tournament
  var opens = start.getTime() - daysInAdvance;

  return opens;
}

exports.tournamentIsOpen = function(date, start, end) {
  var opens = tournamentOpens(start);

  console.log("tournamentIsOpen: tournament opens for picks on: " +
    dateTimeString(new Date(opens)) + " current time: " + dateTimeString(date));

  console.log("date: " +
    date.getTime() + " opens: " + opens);

  if (date.getTime() >= opens) {
    return true;
  }

  return false;
};
