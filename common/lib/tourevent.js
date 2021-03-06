var ScoreCard = require('../lib/scorecard.js');
var logger = require('../lib/logger.js');

//
// pos is a string either with the golfer's place in the tournament (1,2,3) or their
// status if they are no longer in the tournament: CUT, WD, DNS
//
var comparePosition = function(golfer1, golfer2) {
  var a = golfer1.pos;
  var b = golfer2.pos;

  if (a == b) {
    return 0;
  }

  // position will start with a T for any ties - remove that
  if (a.slice(0, 1) == "T") {
    a = a.slice(1);
  }

  if (b.slice(0, 1) == "T") {
    b = b.slice(1);
  }

  // first see if our position is a number.  if so, sort that way
  if (ScoreCard.isNumber(a) && ScoreCard.isNumber(b)) {
    return parseInt(a) - parseInt(b);
  } else if (ScoreCard.isNumber(a)) {
    return -1;
  } else if (ScoreCard.isNumber(b)) {
    return 1;
  } else {
    // neither are numbers, options are CUT, MDF, DNS

    // DNS = Did Not Start... always sort these to the bottom
    if (a == "DNS") {
      return 1;
    } else if (b == "DNS") {
      return -1;
    }

    // CUT is next
    if (a == "CUT" && b == "CUT") {

    }

    // last resort, just compare strings
    return a.localeCompare(b);
  }
};

// [07/29/2016] had to change this based on the way the back end data for
//              live scoring is now reported. We use the "thru" key to
//              determine if anyone is mid way through a round
//
// identify rounds that have not yet started.
//
// as input, we expect an array of golfers with scores
//
var getRoundStatus = function(golfers, numberOfRounds) {
  var ROUND_STARTED = 1;
  var ROUND_NOT_STARTED = 0;

  var statusData = [];
  var i;

  for (i = 0; i < numberOfRounds; i++) {
    statusData.push(ROUND_NOT_STARTED);
  }

  var self = this;

  golfers.forEach(function(golfer) {
    for (i = 0; i < numberOfRounds; i++) {
      var round = i + 1;

      round = round.toString();

      if (ScoreCard.isValidScore(golfer[round])) {
        logger.debug("found valid score for round " + round + ", golfer " +
          JSON.stringify(golfer));

        statusData[i] = ROUND_STARTED;

      } else {
        // no valid score, but see if there is an in progress round
        var thru = golfer['thru'];
        logger.debug("golfer " + golfer['name'] + " thru: " + thru);

        if (ScoreCard.isNumber(thru) && thru < 18) {
          logger.debug("found in progress score for round " + round + ", golfer " +
            JSON.stringify(golfer) + " thru " + thru);

          statusData[i] = ROUND_STARTED;
        }

        // short circuit the loop here... last valid score
        break;
      }
    }

  });

  return statusData;
}

var getRoundNetScore = function(golfer, par, roundNumber, roundStatus) {
  // find the net score for the given round. if the round we're looking for is the last played round,
  // we can use the "today" score since it represents the most recent score.  This will
  // allow us to display a meaningful "lowest" score relative to par when a round
  // is in progress
  //
  // if the round isn't the most recent, then just use the completed round net score to par
  //
  var lastRoundPlayed = getLastRoundPlayed(roundStatus);
  var useToday = (lastRoundPlayed == roundNumber) ? true : false;

  return (useToday) ? ScoreCard.parseNetScore(golfer.today) : ScoreCard.formatNetScore(golfer[roundNumber + 1] - par);
};

//
// find low net total score for the given round
// uses golfer.total which should be in net score format (e.g. -1, E, +1)
//
// returns an integer value representing lowest score or NaN if there are no scores
//
var lowRoundNetTotal = function(golfers, par, roundNumber, roundStatus) {
  var lowScore = NaN;

  for (var i = 0; i < golfers.length; i++) {
    var golfer = golfers[i];

    if (i == 0) {
      lowScore = getRoundNetScore(golfer, par, roundNumber, roundStatus);
    } else {
      var netScore = getRoundNetScore(golfer, par, roundNumber, roundStatus);

      if (ScoreCard.parseNetScore(netScore) < ScoreCard.parseNetScore(lowScore)) {
        lowScore = netScore;
      }
    }
  }

  return lowScore;
};

//
// returns an array of leaders for a given round
//
var singleRoundLeaders = function(golfers, courseInfo, roundNumber, roundStatus) {
  var leaders = [];
  var par = courseInfo[roundNumber].par;
  var lowScore = lowRoundNetTotal(golfers, par, roundNumber, roundStatus);

  logger.debug("round " + roundNumber + " low score " + lowScore);

  // build a list of the leaders
  for (var i = 0; i < golfers.length; i++) {
    var golfer = golfers[i];
    var netScore = getRoundNetScore(golfer, par, roundNumber, roundStatus);

    if (netScore == lowScore) {
      leaders.push({
        name: golfer.name,
        score: netScore
      });

      logger.debug("adding " + golfer.name + " for round " + roundNumber + " with score: " + netScore);
    }
  }

  return leaders;
};

//
// returns an array of arrays of golfer records that represent each round
//
// index of the top level array indicates the leaders for each round
// the sub array is the list of leaders for thvaat round
//
// returns an array or arrays with the leaders of each round
//
var roundLeaders = function(golfers, courseInfo) {
  var numberOfRounds = courseInfo.length;
  var roundStatus = getRoundStatus(golfers, numberOfRounds);
  var leaders = [];

  logger.debug("Rounds started: " + JSON.stringify(roundStatus));

  for (var i = 0; i < roundStatus.length; i++) {
    if (roundStatus[i]) {
      // for the rounds that have started, go get the leaders
      logger.debug("getting single round leaders for round " + i);
      leaders.push(singleRoundLeaders(golfers, courseInfo, i, roundStatus));
    } else {
      // round not started, just put an empty array of leaders
      leaders.push([]);
    }
  }

  return leaders;
};

var getLastRoundPlayed = function(roundStatus) {
  var roundPlayed = -1;

  for (var i = 0; i < roundStatus.length; i++) {
    if (roundStatus[i]) {
      roundPlayed = i;
    } else {
      break;
    }
  }

  return roundPlayed;
};


// format tournament info for ease of display
exports.format = function(record) {
  logger.debug(JSON.stringify(record));

  var NUMBER_OF_ROUNDS = 4;

  var event = record;
  var golfers = record.scores;

  var courseInfo = [];
  for (var i = 0; i < NUMBER_OF_ROUNDS; i++) {
    courseInfo.push(event.course);
  }

  var roundNumbers = [];
  var lowRounds = [];

  for (var i = 0; i < NUMBER_OF_ROUNDS; i++) {
    roundNumbers.push(i + 1);
    lowRounds[i] = "-";
  }

  var roundStatus = getRoundStatus(golfers, NUMBER_OF_ROUNDS);
  var currentRound = getLastRoundPlayed(roundStatus);

  if (currentRound >= 0) {

    // store low score for each round of the tournament
    var leaders = roundLeaders(golfers, courseInfo);

    for (var i = 0; i <= currentRound; i++) {
      var roundNumber = new String(i + 1);

      if (i == currentRound) {
        lowRounds[i] = (leaders[i][0]) ? leaders[i][0].score : '-';

        // loop through the current day scores and convert to net par
        // this makes in progress rounds format more nicely

        for (var g = 0; g < golfers.length; g++) {
          var golfer = golfers[g];

          if (golfer["today"] != '-') {
            golfer[roundNumber] = golfer["today"];
          }
        }
      } else {

        // find the low score for this round

        for (var g = 0; g < golfers.length; g++) {
          var golfer = golfers[g];
          var score = golfer[roundNumber];

          if (ScoreCard.isNumber(score)) {  // valid score, see if it is the lowest we've seen
            if (lowRounds[i] == "-") {
              lowRounds[i] = score;   // first score, take it
            } else if (score < lowRounds[i]) {
              lowRounds[i] = score; // lower then our previous score, take it
            }
          }
        }

      }

    }

    //    console.log("golfers after = " + JSON.stringify(golfers, null, 2));
    //    console.log("Golfers: " + JSON.stringify(golfers));

  }


  var result = {};

  result.name = event.name;
  result.scores = golfers;
  result.roundNumbers = [1, 2, 3, 4];
  result.lowRounds = lowRounds;

  return result;
};

exports.formatGolferScore = function(golferid, record) {
  var golfer = null;
  var scores = record.scores;

  for (var i = 0; i < scores.length; i++) {
    var score = scores[i];

    if (score.id == golferid) {
      // format the scoring information here

      golfer = score;
    }
  }

  return golfer;
};
