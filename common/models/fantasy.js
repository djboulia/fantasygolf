'use strict';

var logger = require('../lib/logger.js');

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
    'getSchedule', {
      http: {
        path: '/:id/schedule',
        verb: 'get'
      },
      description: 'Get schedule of tour events for this game.',

      accepts: [{
        arg: 'id',
        type: 'string',
        required: true
      }],
      returns: {
        arg: 'schedule',
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
    'getEventRoster', {
      http: {
        path: '/:id/roster/event/:eventid',
        verb: 'get'
      },
      description: 'Get roster and highlight players in this event',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'eventid',
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
    'updateRoster', {
      http: {
        path: '/:id/roster/gamer/:gamerid/update',
        verb: 'put'
      },
      description: 'update or add player records',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'gamerid',
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
        path: '/:id/roster/event/:eventid/gamer/:gamerid',
        verb: 'get'
      },
      description: 'Get current gamer roster and highlight players in this event',

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
        arg: 'roster',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getEvent', {
      http: {
        path: '/:id/event/:eventid',
        verb: 'get'
      },
      description: 'Get the round details for this event in the game',

      accepts: [{
          arg: 'id',
          type: 'string',
          required: true
        },
        {
          arg: 'eventid',
          type: 'string',
          required: true
        }
      ],
      returns: {
        arg: 'event',
        type: 'object',
        root: true
      }
    }
  );

  Fantasy.remoteMethod(
    'getGolfer', {
      http: {
        path: '/:id/event/:eventid/golfer/:golferid',
        verb: 'get'
      },
      description: 'Get the scoring details for this golfer',

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
          arg: 'golferid',
          type: 'string',
          required: true
        }
      ],
      returns: {
        arg: 'scores',
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

  /**
   * /tour/:tour/year/:year/schedule
   *
   * saves the picks for this gamer
   *
   **/
  Fantasy.getTourSchedule = function(tour, year, cb) {

    console.log("getting tour schedule for tour " + tour + " and year " + year);

    var Game = app.models.Game.Promise;

    Game.getTourSchedule(tour, year)
      .then(function(records) {

        cb(null, {
          schedule: records
        });

      }, function(err) {
        cb(err, null);
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
   * /:id/schedule
   *
   * returns the schedule matching this id
   *
   **/
  Fantasy.getSchedule = function(id, cb) {

    console.log("getting schedule for game " + id);

    var Game = app.models.Game.Promise;

    Game.findSchedule(id)
      .then(function(record) {

        cb(null, {
          schedule: record
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

  /**
   * /:id/event/:eventid
   *
   * id is the game to get this roster for
   * eventid is the tournament event to apply to this roster
   *
   * returns a roster highlighting the players participating in the given event
   *
   **/
  Fantasy.getEventRoster = function(id, eventid, cb) {

    var Roster = app.models.Roster.Promise;

    console.log("getting roster for game " + id + " and event " + eventid);

    Roster.findByGameAndEventId(id, eventid)
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
   * /:id/gamer/:gamerid/update
   *
   * updates the roster for this game
   *
   **/
  Fantasy.updateRoster = function(id, gamerid, players, cb) {

    console.log("gamer " + gamerid + " updating players in roster for game " + id);

    // look up this game's roster, then insert or update the player records

    var Roster = app.models.Roster.Promise;

    Roster.update(id, gamerid, players)
    .then(function(roster) {

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
  Fantasy.getRosterGamer = function(id, eventid, gamerid, cb) {

    console.log("getting roster for game " + id + " event " + eventid + " and gamer " + gamerid);

    var Gamer = app.models.Gamer.Promise;

    Gamer.getRoster(id, eventid, gamerid).then(function(roster) {

      cb(null, {
        "roster": roster
      });

    }, function(err) {
      errCallback(err, cb);
    });

  };

  /**
   * /:id/event/:eventid
   *
   * returns the round scoring data for this event in the game
   *
   **/
  Fantasy.getEvent = function(id, eventid, cb) {

    console.log("getting event data for game " + id + " and event " + eventid);

    var Game = app.models.Game.Promise;

    Game.getEvent(id, eventid)
      .then(function(event) {

        cb(null, {
          "event": event
        });

      }, function(err) {
        errCallback(err, cb);
      });

  };

  /**
   * /:id/event/:eventid/golfer/:golferid
   *
   * returns the round scoring data for this event in the game
   *
   **/
  Fantasy.getGolfer = function(id, eventid, golferid, cb) {

    console.log("getting scores for golfer " + golferid + ", game " + id + " and event " + eventid);

    var Game = app.models.Game.Promise;

    Game.getGolfer(id, eventid, golferid)
      .then(function(scores) {

        cb(null, {
          "scores": scores
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
