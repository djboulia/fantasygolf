var logger = require('../lib/logger.js');
var DateUtils = require('../lib/dateutils.js');
var TourSeason = require('../lib/tourseason.js');
var TourEvent = require('../lib/tourevent.js');

module.exports = function(Game) {

  var app = require('../../server/server');

  //
  // just get the base of the url as the tournament id
  //
  var tournamentId = function(str) {
    var ndx = str.lastIndexOf("/");
    if (ndx > 0) {
      return str.substring(ndx + 1);
    } else {
      return str;
    }
  }

  /**
   * create promise-friendly versions of key functions we use internally
   * in the other modules
   **/
  Game.Promise = {};

  Game.Promise.getTourSchedule = function(tour, year) {
    return new Promise(function(resolve, reject) {

      var tourSeason = new TourSeason(year, tour);

      tourSeason.getSchedule((json) => {

        if (json) {

          console.log("getTourSchedule " + JSON.stringify(json));

          var records = [];

          var schedule = json.schedule;
          for (var i = 0; i < schedule.length; i++) {
            var tourEvent = schedule[i];

            // build a list of valid tour events.  only include stroke play format
            if (tourEvent.format == "stroke") {
              var record = {};

              record.startDate = tourEvent.startDate;
              record.endDate = tourEvent.endDate;
              record.name = tourEvent.tournament;
              record.id = tournamentId(tourEvent.link.href);

              records.push(record);
            }
          }

          resolve(records);

        } else {
          var err = "json is null";
          reject(err);
        }

      });

    });

  };

  Game.Promise.create = function(season, tour, name, schedule, gamers) {
    return new Promise(function(resolve, reject) {

      var record = {};
      record.data = {};
      record.data.tour = tour;
      record.data.season = season;
      record.data.name = name;
      record.data.schedule = schedule;
      record.data.gamers = gamers;
      record.data.events = [];

      Game.create(record, function(err, record) {
        if (!err && record) {

          logger.log("created game: " + record.id);

          // initialize the roster after creating the
          // game record
          var Roster = app.models.Roster.Promise;

          Roster.init(record.id).then(function(roster) {
            resolve(record);
          }, function(err) {
            reject(err);
          });

        } else {
          if (!record) {
            var str = "Could not create game";
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

  var findEventById = function(id, schedule) {
    for (var i = 0; i < schedule.length; i++) {
      var event = schedule[i];

      if (event && (id == event.id)) {
        return event;
      }
    }

    console.log("didn't find id " + id + " in schedule " + JSON.stringify(schedule));

    return null;
  };

  Game.Promise.update = function(id, name, schedule, gamers) {
    return new Promise(function(resolve, reject) {
      // look up this game's roster, then insert or update the player records

      Game.Promise.findById(id)
        .then(function(game) {

          // go through the schedule and eliminate any orphaned events
          var events = [];

          for (var i = 0; i < game.data.events.length; i++) {
            var event = game.data.events[i];

            if (findEventById(event.id, schedule)) {
              events.push(event);
            } else {
              console.log("would have removed event " + JSON.stringify(event));
              events.push(event); // remove this
            }
          }

          game.data.name = name;
          game.data.schedule = schedule;
          game.data.gamers = gamers;
          game.data.events = events;

          // now put the game back

          Game.replaceOrCreate(game, function(err, record) {
            if (!err && record) {

              logger.log("updated game " + id);
              resolve(record);

            } else {
              if (!record) {
                var str = "Could not find game!";
                reject(str);
              } else {
                var str = "Error!" + JSON.stringify(err);
                reject(str);
              }
            }
          });

        }, function(err) {
          reject(err);
        });
    });

  };

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

  //
  // get all of the games that this gamer is participating in
  //
  var findGames = function(records, gamerid) {
    var games = [];

    // look into each returned record for our gamer id
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      var game = record.data;
      var gamers = game.gamers;

      if (findGamerById(gamerid, gamers)) {
        // found a match, add this record to our list and continue
        logger.log("Found game!: " + record.id);
        //        logger.log("Found game!: " + JSON.stringify(record));
        games.push(record);
      }

    }

    return games;
  };

  var createNextEvent = function(dateObject, event) {
    var nextEvent = {};

    nextEvent.id = event.id;
    nextEvent.name = event.name;
    nextEvent.start = event.start;
    nextEvent.end = event.end;
    nextEvent.inProgress = false;
    nextEvent.canSetPicks = false;

    var start = dateObject.adjustedForTimezone(event.start);
    var end = dateObject.adjustedForTimezone(event.end);

    if (dateObject.tournamentInProgress(start, end)) {
      nextEvent.inProgress = true;
    } else if (dateObject.tournamentIsOpen(start, end)) {
      nextEvent.canSetPicks = true;
    } else {
      nextEvent.opens = dateObject.dateString(dateObject.tournamentOpens(start));
    }

    return nextEvent;
  };

  //
  // look at the schedule of events in the current game
  // trying to find the next upcoming event.  if the given schedule
  // is complete (all events are in the past), then return null
  //
  var findNextEvent = function(game) {

    // sort the schedule by date first
    var schedule = game.data.schedule;
    schedule.sort(function(a, b) {
      if (a.start < b.start) {
        return -1;
      } else if (a.start > b.start) {
        return 1;
      }

      return 0;
    });

    console.log("sorted schedule: " + JSON.stringify(schedule));

    // look for first event that hasn't ended yet
    var nextEvent = null;
    var dateObject = new DateUtils();

    for (var s = 0; s < schedule.length; s++) {
      var event = schedule[s];
      var start = dateObject.adjustedForTimezone(event.start);
      var end = dateObject.adjustedForTimezone(event.end);

      if (!event.start || !event.end) {
        console.error("ERROR: couldn't find schedule details!");
        break;
      }

      if (!dateObject.tournamentComplete(start, end)) {
        nextEvent = createNextEvent(dateObject, event);

        break;
      }
    }

    return nextEvent;
  };

  var addActiveSeasons = function(games, cb) {

    if (games.length > 0) {
      var requests = [];

      for (var i = 0; i < games.length; i++) {
        requests.push(addActiveSeason(games[i]));
      }

      Promise.all(requests).then(function(record) {

        for (var g = 0; g < games.length; g++) {
          var game = games[g];

          var nextEvent = findNextEvent(game);

          game.data.nextEvent = nextEvent;
        }

        cb(games);

      }, function(err) {
        console.log(err);
        cb(games);
      });

    } else {

      console.log("no games found!")
      cb(games);
    }

  };

  var addActiveSeason = function(record) {

    return new Promise(function(resolve, reject) {
      var game = record.data;
      var schedule = game.schedule;

      var tourSeason = new TourSeason(game.season, game.tour);

      if (schedule.length > 0) {
        var requests = [];

        for (var s = 0; s < schedule.length; s++) {
          var event = schedule[s];

          console.log("found event " + event.id);

          requests.push(processSeason(tourSeason, event));
        }

        Promise.all(requests).then(function(events) {
          resolve(record);
        }, function(err) {
          console.log("error getting seasons!");
          reject(record);
        });

      } else {
        console.log("no schedule found!")
        reject(record);
      }
    });

  };

  var processSeason = function(tourSeason, event) {

    return new Promise(function(resolve, reject) {
      tourSeason.getFantasyEvent(event.id, (json) => {

        if (json) {

          // remember the event name
          event.name = json.name;
          event.start = json.start;
          event.end = json.end;
          event.course = json.course;

          resolve(event);
        } else {
          var err = "json is null";
          reject(err);
        }

      });
    });
  };


  var addScoringForGames = function(games, cb) {
    if (games.length > 0) {

      var requests = [];

      for (var i = 0; i < games.length; i++) {
        console.log("getting score data for " + games[i].id);
        requests.push(addScoring(games[i]));
      }

      Promise.all(requests).then(function(records) {
        console.log("Promise.all scoring data");
        // after all request callbacks complete, call our main callback
        cb(games);
      }, function(err) {
        console.log(err);
        cb(games);
      });

    } else {

      console.log("no games found!")
      cb(games);
    }
  };

  var addScoring = function(record) {
    console.log("in addScoring");

    return new Promise(function(resolve, reject) {
      var game = record.data;
      var events = game.events;

      var tourSeason = new TourSeason(game.season, game.tour);

      var Roster = app.models.Roster.Promise;

      Roster.findByGameId(record.id).then(function(roster) {
        var requests = [];

        for (var e = 0; e < events.length; e++) {
          var event = events[e];

          console.log("found event " + event.id);

          requests.push(processScore(tourSeason, roster, event));
        }

        Promise.all(requests).then(function(events) {
          console.log("Promise.all processed score data for game " + record.id);
          // after all request callbacks complete, call our main callback
          resolve(record);

        }, function(err) {
          reject(err);
        });

      }, function(err) {
        var str = "No roster found for this game!"
        console.error(str);
        reject(str);
      });
    });

  };

  var addTournaments = function(record) {
    console.log("in addTournaments");

    return new Promise(function(resolve, reject) {
      var game = record.data;
      var schedule = game.schedule;

      Game.Promise.getTourSchedule(game.tour, game.season)
        .then(function(records) {

          // loop through season schedule and map names to this event
          for (var i = 0; i < schedule.length; i++) {
            var event = schedule[i];

            var tourEvent = findEventById(event.id, records);

            if (tourEvent) {
              event.name = tourEvent.name;
            } else {
              console.log("could not find tour event for " + JSON.stringify(event));
            }
          }

          resolve(record);
        }, function(err) {
          reject(err);
        });

    });
  };


  var findScoreByPlayerId = function(scores, playerid) {
    for (var s = 0; s < scores.length; s++) {
      var score = scores[s];

      if (score.id == playerid) {
        return score;
      }
    }

    return null;
  };

  var findPlayerInRoster = function(roster, id) {
    var found = null;

    var rosterData = roster.data.roster;
    for (var r = 0; r < rosterData.length; r++) {
      var player = rosterData[r];

      if (id == player.player_id) {
        found = player;
      }
    }

    return found;
  };

  //
  // we get the scoring data for this event from our back end
  // service.  then we fluff up the picks for this gamer with the
  // scoring information.
  //
  var processScore = function(tourSeason, roster, event) {
    return new Promise(function(resolve, reject) {
      tourSeason.getFantasyEvent(event.id, (json) => {

        if (json) {

          // remember the event name
          event.name = json.name;
          event.start = json.start;
          event.end = json.end;

          if (event.gamers) {
            for (var g = 0; g < event.gamers.length; g++) {
              var gamer = event.gamers[g];

              var picks = gamer.picks;
              for (var p = 0; p < picks.length; p++) {
                var pick = picks[p];

                var score = findScoreByPlayerId(json.scores, pick.id);

                if (score) {
                  pick.name = score.name;
                  pick.score_details = score.score_details;

                  //                  console.log("found picks " + JSON.stringify(pick));
                } else {
                  // no scores for this player, just update the pick name from our roster
                  // this indicates someone started a player who wasn't in the field
                  console.log("didn't find scores for " + pick.id);

                  var player = findPlayerInRoster(roster, pick.id);

                  if (player) {
                    pick.name = player.name;
                    pick.score_details = {
                      total: 0
                    };
                  } else {
                    console.log("Couldn't find player " + pick.id + " in roster.");
                  }
                }
              }

            }

          }

          resolve(event);
        } else {
          var err = "json is null";
          reject(err);
        }

      });
    });

  };

  Game.Promise.search = function(gamerid, details) {
    return new Promise(function(resolve, reject) {
      Game.Promise.find().then(function(records) {

        var games = [];

        if (records) {

          // if a gamerid is specified, filter based on that, otherwise
          // just include all records
          if (gamerid) {
            games = findGames(records, gamerid);
          } else {
            games = records;
          }

          console.log("search for gamerid " + gamerid);
          //        console.log("search for gamerid " + gamerid + " : " + JSON.stringify(games));

          if (details) {
            // add in season detailsfor each game
            addActiveSeasons(games, function(games) {
              resolve(games);
            });

          } else {
            resolve(games);
          }

        } else {
          var str = "No game records found for gamer " + gamerid;
          logger.log(str);
          reject(str);
        }
      }, function(err) {
        reject(err);
      });

    });
  };

  // find the gamer who is currently leading the season totals and
  // flag them as the leader
  var highlightLeader = function(seasonTotals) {
    var leader = null;

    if (seasonTotals) {
      for (var id in seasonTotals) {
        if (leader) {
          // see if this score is better
          if (seasonTotals[id].total > seasonTotals[leader].total) {
            leader = id;
          }
        } else {
          leader = id;
        }
      }

      seasonTotals[leader].leader = true;
    }

    return seasonTotals;
  };

  var picksTotal = function(gamer) {
    var gamerTotal = 0;

    for (var p = 0; p < gamer.picks.length; p++) {
      var pick = gamer.picks[p];

      if (pick.score_details && !isNaN(pick.score_details.total)) {
        gamerTotal += pick.score_details.total;
      } else {
        console.error("ERROR: could not get total for picks.score_details" + JSON.stringify(pick.score_details));
      }
      console.log("gamerTotal = " + gamerTotal);
    }

    return gamerTotal;
  };

  var addToSeasonTotals = function(gamer, seasonTotals, gamerTotal) {
    var gamerid = gamer.id;

    if (!seasonTotals[gamerid]) {
      console.log("ERROR: no season totals for gamer " + gamerid);
    } else {
      console.log("adding to totals " + gamerid + "gamerTotal=" + gamerTotal);
      seasonTotals[gamerid]["total"] += gamerTotal;
    }

  };

  var findGamerById = function(id, gamers) {
    for (var i = 0; i < gamers.length; i++) {
      var gamer = gamers[i];

      if (gamer && (id == gamer.id)) {
        return gamer;
      }
    }

    return null;
  };

  var initSeasonTotals = function(gamers) {
    var seasonTotals = {};

    for (var i = 0; i < gamers.length; i++) {
      var gamer = gamers[i];

      seasonTotals[gamer.id] = {
        "total": 0,
        "name": gamer.name
      };

    }

    return seasonTotals;
  };

  var tallyTotalScores = function(record) {
    // tally individual event scores and season totals
    var seasonTotals = initSeasonTotals(record.data.gamers);

    var events = record.data.events;
    for (var e = 0; e < events.length; e++) {
      var event = events[e];

      var gamers = record.data.gamers;

      for (var g = 0; g < gamers.length; g++) {
        var gamer = gamers[g];

        var gamerPicks = findGamerById(gamer.id, event.gamers);

        if (gamerPicks) {
          // there are picks for this gamer, tally them up
          var gamerTotal = 0;

          gamerTotal += picksTotal(gamerPicks);

          gamerPicks.total = gamerTotal;

          addToSeasonTotals(gamerPicks, seasonTotals, gamerTotal);
        } else {
          // no picks found for this gamer, build up an empty record
          console.log("no picks found for gamer " + gamer.name + " in event " + event.name);

          gamerPicks = {};
          gamerPicks.id = gamer.id;
          gamerPicks.name = gamer.name;
          gamerPicks.total = 0;

          event.gamers.push(gamerPicks);
        }
      }

    }

    // add season totals to top level record
    console.log("seasonTotals : " + JSON.stringify(seasonTotals));
    highlightLeader(seasonTotals);

    var gamers = [];

    for (var id in seasonTotals) {
      var gamer = findGamerById(id, record.data.gamers);

      if (gamer) {
        gamer.name = seasonTotals[id].name;
        gamer.total = seasonTotals[id].total;

        if (seasonTotals[id].leader) {
          gamer.leader = true;
        }
      } else {
        console.log("could not find gamer " + id + " in gamers list for this game.");
      }

    }

    return record;
  };

  //
  // go through each tour event in this game and fluff up the
  // gamer names so we send back a human readable name for each gamer
  //
  var addGamerData = function(record) {
    return new Promise(function(resolve, reject) {
      var game = record.data;
      var events = game.events;
      var gamers = game.gamers;
      var Gamer = app.models.Gamer.Promise;
      var requests = [];

      for (var e = 0; e < events.length; e++) {
        var event = events[e];

        requests.push(Gamer.findGamerNames(event.gamers));
      }

      requests.push(Gamer.findGamerNames(gamers));

      Promise.all(requests).then(function(gamers) {
        resolve(record);
      }, function(err) {
        reject(err);
      });
    });

  };

  Game.Promise.findByIdWithScoring = function(id) {
    return new Promise(function(resolve, reject) {

      Game.Promise.findById(id).then(function(record) {
        logger.log("Found game: " + JSON.stringify(record));

        addScoring(record).then(function(record) {

            return addGamerData(record); // promise

          })
          .then(function(record) {

            tallyTotalScores(record);

            console.log("findByIdWithString resolving promise");
            resolve(record);
          }, function(err) {
            reject(err);
          });

      }, function(err) {
        reject(err);
      });

    });
  };

  //
  // an update to the roster could affect picks for games that are upcoming
  // but haven't yet started.  if we find that case, then handle it by
  // going through the roster and resolving any gamer picks that are now
  // inaccurate
  //
  Game.Promise.resolveRosterUpdate = function(gameid, roster) {
    return new Promise(function(resolve, reject) {
      Game.Promise.findByIdWithScoring(gameid)
        .then(function(record) {
            return addActiveSeason(record); // promise
          })
        .then(function(record) {
            var Roster = app.models.Roster.Promise;
            var game = record.data;

            logger.log("Found game: " + JSON.stringify(game));

            var nextEvent = findNextEvent(record);

            if (nextEvent && nextEvent.canSetPicks) {
              console.log("next event found: " + nextEvent.name);

              // look for this event id in the game's events

              var event = findEventById(nextEvent.id, game.events);

              if (event && event.gamers) {
                console.log("next event found: " + event.id);

                // go through the gamers and examine their picks
                for (var i = 0; i < event.gamers.length; i++) {
                  var gamer = event.gamers[i];

                  if (!gamer || !gamer.picks) {
                    console.log("empty gamer record! " + JSON.stringify(gamer));
                    break;
                  }

                  // look up each pick in our roster, make sure gamer
                  // matches the roster. if not, remove the pick
                  var newPicks = [];

                  for (var p = 0; p < gamer.picks.length; p++) {
                    var pick = gamer.picks[p];

                    var rosterEntry = Roster.findPlayer(pick.id, roster);

                    if (!rosterEntry) {
                      // this shouldn't happen...
                      console.log("WARNING: didn't find pick " + pick.id + " in roster... removing.");
                    } else if (rosterEntry && rosterEntry.gamer == gamer.id) {
                      // still owned by this player, we're good
                      newPicks.push(pick);
                    } else {
                      console.log("found a pick " + pick.id + " no longer owned by this gamer, removing " + JSON.stringify(rosterEntry));
                    }
                  }

                  // update picks for this gamer
                  gamer.picks = newPicks;

                }
              }

              // TODO: update the game record here...
              console.log("TODO: update game record");

              resolve(record);
            } else {
              resolve(record);
            }

          },
          function(err) {
            reject(err);
          });
    });
  };

  Game.Promise.getEvent = function(gameid, eventid) {
    return new Promise(function(resolve, reject) {

      Game.Promise.findById(gameid).then(function(record) {
        var game = record.data;

        logger.log("Found game: " + JSON.stringify(game));

        // load the event info for this tournament
        var tourSeason = new TourSeason(game.season, game.tour);

        tourSeason.getEvent(eventid, (json) => {

          if (json) {
            var event = TourEvent.format(json);

            resolve(event);
          } else {
            var err = "json is null";
            reject(err);
          }

        });

      }, function(err) {
        reject(err);
      });

    });
  };

  Game.Promise.getGolfer = function(gameid, eventid, golferid) {
    return new Promise(function(resolve, reject) {

      Game.Promise.findById(gameid).then(function(record) {
        var game = record.data;

        logger.log("Found game: " + JSON.stringify(game));

        // load the event info for this tournament
        var tourSeason = new TourSeason(game.season, game.tour);

        tourSeason.getFantasyEvent(eventid, (json) => {

          if (json) {
            var score = TourEvent.formatGolferScore(golferid, json);

            resolve(score);
          } else {
            var err = "json is null";
            reject(err);
          }

        });

      }, function(err) {
        reject(err);
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

  Game.Promise.findSchedule = function(id) {
    return new Promise(function(resolve, reject) {

      Game.Promise.findById(id)
        .then(function(record) {
          logger.log("Found game: " + JSON.stringify(record));

          return addTournaments(record); //promise
        })
        .then(function(record) {
            resolve(record.data.schedule);
          },
          function(err) {
            reject(err);
          });

    });
  };

};
