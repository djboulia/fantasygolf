'use strict';

var logger = require('../lib/logger.js');
var TourSeason = require('../lib/tourseason.js');

module.exports = function(Fantasy) {

  var app = require('../../server/server');

  Fantasy.remoteMethod(
    'search', {
      http: {
        path: '/search',
        verb: 'get'
      },
      description: 'Search for games',

      accepts: [{
          arg: 'gamer',
          type: 'string',
          description: 'id of the gamer to search for',
          http: {
            source: 'query'
          },
          required: false
        },
        {
          arg: 'details',
          type: 'boolean',
          description: 'include scoring and event details',
          http: {
            source: 'query'
          },
          required: false
        }
      ],
      returns: {
        arg: 'games',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getTourSchedule', {
      http: {
        path: '/tour/:tour/year/:year/schedule',
        verb: 'get'
      },
      description: 'Get the tour schedule for the given year',

      accepts: [{
          arg: 'tour',
          type: 'string',
          required: true
        },
        {
          arg: 'year',
          type: 'string',
          required: true
        }
      ],
      returns: {
        arg: 'schedule',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getGame', {
      http: {
        path: '/:id',
        verb: 'get'
      },
      description: 'Get individual game data',

      accepts: [{
        arg: 'id',
        type: 'string',
        required: true
      }],
      returns: {
        arg: 'game',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'updateGame', {
      http: {
        path: '/:id',
        verb: 'put'
      },
      description: 'Update game data',

      accepts: [{
        arg: 'id',
        type: 'string',
        required: true
      },
      {
        arg: 'name',
        type: 'string',
        required: true
      },
      {
        arg: 'schedule',
        type: 'array',
        required: true
      },
      {
        arg: 'gamers',
        type: 'array',
        required: true
      }
      ],
      returns: {
        arg: 'game',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getGamers', {
      http: {
        path: '/gamers',
        verb: 'get'
      },
      description: 'Get all gamers',

      accepts: [],
      returns: {
        arg: 'gamers',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'newGame', {
      http: {
        path: '/',
        verb: 'post'
      },
      description: 'Create a new game entry',

      accepts: [{
          arg: 'season',
          type: 'number',
          required: true
        },
        {
          arg: 'tour',
          type: 'string',
          required: true
        },
        {
          arg: 'name',
          type: 'string',
          required: true
        },
        {
          arg: 'schedule',
          type: 'array',
          required: true
        },
        {
          arg: 'gamers',
          type: 'array',
          required: true
        }
      ],
      returns: {
        arg: 'game',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getRoster', {
      http: {
        path: '/:id/roster',
        verb: 'get'
      },
      description: 'Get tour players roster for this game',

      accepts: [{
        arg: 'id',
        type: 'string',
        required: true
      }],
      returns: {
        arg: 'roster',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'initRoster', {
      http: {
        path: '/:id/roster/init',
        verb: 'put'
      },
      description: 'Initializes (or re-initializes) the roster with tour player names',

      accepts: [{
        arg: 'id',
        type: 'string',
        required: true
      }],
      returns: {
        arg: 'roster',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'updatePlayers', {
      http: {
        path: '/:id/roster/players',
        verb: 'put'
      },
      description: 'update or add player records',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'players',
          type: 'array',
          required: true
        }
      ],
      returns: {
        arg: 'roster',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getRosterGamer', {
      http: {
        path: '/:id/roster/gamer/:gamerid',
        verb: 'get'
      },
      description: 'Get the current roster for this gamer',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'gamerid',
          type: 'string',
          required: true
        }
      ],
      returns: {
        arg: 'roster',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getPicks', {
      http: {
        path: '/:id/event/:eventid/gamer/:gamerid/picks',
        verb: 'get'
      },
      description: 'Get picks for this player for the given event within the season',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'eventid',
          type: 'string',
          required: true
        },
        {
          arg: 'gamerid',
          type: 'string',
          required: true
        }
      ],
      returns: {
        arg: 'picks',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'putPicks', {
      http: {
        path: '/:id/event/:eventid/gamer/:gamerid/picks',
        verb: 'put'
      },
      description: 'Saves picks for this player for the given event within the season',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'eventid',
          type: 'string',
          required: true
        },
        {
          arg: 'gamerid',
          type: 'string',
          required: true
        },
        {
          arg: 'picks',
          type: 'array',
          required: true
        }
      ],
      returns: {
        arg: 'picks',
        type: 'object',
        root: true
      }
    }
  );


  /**
   * /search?gamer=12353435&details=false
   *
   * returns the fantasy games that this player is particpating in
   * if no gamer id is specified, all games are returned
   * if details = true, then scoring and event details are included in response
   *
   **/
  Fantasy.search = function(gamerid, details, cb) {

    var str = "searching for games for gamer " + gamerid + " and details " + details;
    logger.log(str);

    var Game = app.models.Game.Promise;

    Game.search(gamerid, details)
      .then(function(games) {

        cb(null, {
          "games": games
        });

      }, function(err) {
        cb(err, null);
      });
  };

  //
  // just get the base of the url as the tournament id
  //
  var tournamentId = function(str) {
    var ndx = str.lastIndexOf("/");
    if (ndx>0) {
      return str.substring(ndx+1);
    } else {
      return str;
    }
  }

  /**
   * /tour/:tour/year/:year/schedule
   *
   * saves the picks for this gamer
   *
   **/
  Fantasy.getTourSchedule = function(tour, year, cb) {

    console.log("getting tour schedule for tour " + tour + " and year " + year);

    var tourSeason = new TourSeason(year, tour);

    tourSeason.getSchedule( (json) => {

      if (json) {

        var records = [];

        var schedule = json.schedule;
        for (var i=0; i<schedule.length; i++) {
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

        cb(null, {
          schedule: records
        });

      } else {
        var err = "json is null";
        cb(err, null);
      }

    });

  };

  /**
   * /:id
   *
   * returns the game matching this id
   *
   **/
  Fantasy.getGame = function(id, cb) {

    console.log("getting game " + id);

    var Game = app.models.Game.Promise;

    Game.findByIdWithScoring(id)
      .then(function(record) {

        cb(null, {
          game: record
        });

      }, function(err) {
        cb(err, null);
      });

  };

  /**
   * /:id
   *
   * updates game information for this id
   *
   **/
  Fantasy.updateGame = function(id, name, schedule, gamers, cb) {

    console.log("updating game " + id);

    var Game = app.models.Game.Promise;

    Game.update(id, name, schedule, gamers)
      .then(function(record) {

        cb(null, {
          game: record
        });

      }, function(err) {
        cb(err, null);
      });

  };

  /**
   * /gamers
   *
   * returns the list of all gamers
   *
   **/
  Fantasy.getGamers = function(cb) {

    var Gamer = app.models.Gamer.Promise;

    Gamer.find()
      .then(function(records) {

        cb(null, {
          gamers: records
        });

      }, function(err) {
        cb(err, null);
      });

  };


  /**
   * /:id/event/:eventid/gamer/:gamerid
   *
   * saves the picks for this gamer
   *
   **/
  Fantasy.newGame = function(season, tour, name, schedule, gamers, cb) {

    console.log("creating new game for season " + season + " and tour " + tour + " with name " + name);

    var Game = app.models.Game.Promise;

    Game.create(season, tour, name, schedule, gamers)
      .then(function(record) {

        cb(null, {
          game: record
        });

      }, function(err) {
        cb(err, null);
      });
  };

  /**
   * /:id
   *
   * id is the game to get this roster for
   *
   * returns the roster for this game
   *
   **/
  Fantasy.getRoster = function(id, cb) {

    var Roster = app.models.Roster.Promise;

    console.log("getting roster for game " + id);

    Roster.findByGameIdWithDetails(id)
      .then(function(roster) {

        cb(null, {
          "roster": roster
        });

      }, function(err) {
        errCallback(err, cb);
      });

  };

  var errCallback = function(str, cb) {
    logger.error(str);

    cb(str, null);
  };


  /**
   * /:id
   *
   * initializes the roster with tour players
   *
   **/
  Fantasy.initRoster = function(id, cb) {

    console.log("initializing roster for game " + id);

    var Roster = app.models.Roster.Promise;

    Roster.init(id)
      .then(function(roster) {

        cb(null, roster);

      }, function(err) {
        errCallback(err, cb);
      });

  };

  /**
   * /:id
   *
   * returns the roster for this game
   *
   **/
  Fantasy.updatePlayers = function(id, players, cb) {

    console.log("updating players in roster for game " + id);

    // look up this game's roster, then insert or update the player records

    var Roster = app.models.Roster.Promise;

    Roster.update(id, players).then(function(roster) {

      cb(null, roster);

    }, function(err) {
      errCallback(err, cb);
    });

  };

  /**
   * /:id
   *
   * returns the roster for this gamer
   *
   **/
  Fantasy.getRosterGamer = function(id, gamerid, cb) {

    console.log("getting roster for game " + id + " and gamer " + gamerid);

    var Gamer = app.models.Gamer.Promise;

    Gamer.getRoster(id, gamerid).then(function(roster) {

      cb(null, {
        "roster": roster
      });

    }, function(err) {
      errCallback(err, cb);
    });

  };

  /**
   * /:id/event/:eventid/gamer/:gamerid
   *
   * returns the picks for this gamer
   *
   **/
  Fantasy.getPicks = function(id, eventid, gamerid, cb) {

    console.log("getting picks for game " + id + " and event " + eventid + " and gamer " + gamerid);

    var Gamer = app.models.Gamer.Promise;

    Gamer.getPicks(id, eventid, gamerid).then(function(picks) {

      cb(null, {
        "picks": picks
      });

    }, function(err) {
      errCallback(err, cb);
    });

  };

  /**
   * /:id/event/:eventid/gamer/:gamerid
   *
   * saves the picks for this gamer
   *
   **/
  Fantasy.putPicks = function(id, eventid, gamerid, picks, cb) {

    console.log("saving picks for game " + id + " and event " + eventid + " and gamer " + gamerid);
    console.log("picks: " + JSON.stringify(picks));

    var Gamer = app.models.Gamer.Promise;

    Gamer.putPicks(id, eventid, gamerid, picks).then(function(picks) {

      cb(null, {
        "picks": picks
      });

    }, function(err) {
      errCallback(err, cb);
    });

  };


};
