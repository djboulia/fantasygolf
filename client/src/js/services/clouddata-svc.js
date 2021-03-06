console.log("loading GolfPicks.cloud");

angular.module('GolfPicks.cloud', [])
  .factory('cloudData', ['$q', function($q) {

    //
    // cloudData is a wrapper for the back end StrongLoop data API
    //
    // To insulate us from the details of the back end, this class performs actions to
    // synchronize the cloud object with a local object representation
    //
    // Each cloud object is backed by a StrongLoop model which represents the type of the object
    // Data returned from the model consists of a unique identifier named "_id"
    // and a set of fields representing the data elements of the object
    //
    // In golfpicks, examples of valid models are:
    //      Gamer, Game, Event, Course
    //
    // to insulate us from the representation in the data store, we also
    // define a list of field names which are the ONLY things that will be synced
    // with the back end.  the field names is an object where the keys are the name
    // in the cloud-object, and the values represent the name that will be used in the
    // local object.
    //
    // So, for instance, if you wanted to map the "username" field in
    // the cloud object to a field named "email" in the local object, it would look like this:
    //
    // var fieldNames = {
    //      username : "email"
    // }
    //
    // this will cause the cloudData factory to synchronize one field (username) from the
    // cloud with the local object where the field is named "email".  This means that
    // any other fields contained in the original cloud object would be invisible to the
    // local object.  And conversely, any local fields added to the local would be ignored
    // when updating the back end cloud object.
    //

    var _setProperties = function(cloudObj, fieldMap, objData) {

      for (var prop in fieldMap) {
        var mappedProp = fieldMap[prop];

        cloudObj.data[prop] = objData[mappedProp];
      }

    };

    var _newCloudObject = function(fieldMap, objData) {
      var cloudObj = {};
      cloudObj.data = {};

      _setProperties(cloudObj, fieldMap, objData);

      return cloudObj;
    };

    var _makeLocalObject = function(cloudObj, fieldMap) {
      var localObj = {};

      if (!fieldMap) console.error("_makeLocalObject: fieldMap is " + JSON.stringify(fieldMap));

      for (var prop in fieldMap) {
        var mappedProp = fieldMap[prop];

        localObj[mappedProp] = cloudObj.data[prop];
      }

      localObj._id = cloudObj.id;
      localObj._cloudObject = cloudObj;
      localObj._fieldMap = fieldMap;

      // console.debug("_makeLocalObject: localObj: " + JSON.stringify(localObj));

      return localObj;
    };

    return {

      delete: function(model, localObj) {
        console.debug("cloudData.delete: " + JSON.stringify(localObj));

        var deferred = $q.defer();
        var obj = localObj._cloudObject;
        var id = localObj._id;

        if (obj) {
          model.deleteById({
              id: id
            },
            function(result) {
              deferred.resolve(result);
            },
            function(err) {
              deferred.reject(err);
            });
        } else {
          deferred.reject("cloudData.delete: cloudObject is " + JSON.stringify(obj));
        }

        return deferred.promise;
      },

      add: function(model, fieldNames, objData) {
        console.debug("cloudData.add: objData " + JSON.stringify(objData));

        var deferred = $q.defer();

        if (objData) {
          var cloudObj = _newCloudObject(fieldNames, objData);

          var obj = model.create(cloudObj,
            function(obj) {
              var localObj = _makeLocalObject(obj, fieldNames);

              deferred.resolve(localObj);
            },
            function(err) {
              deferred.reject(err);
            });

        } else {
          deferred.reject("cloudData.add: objData: " + JSON.stringify(objData));
        }

        return deferred.promise;
      },

      save: function(localObj) {
        console.debug("cloudData.save: " + JSON.stringify(localObj));

        var deferred = $q.defer();

        if (localObj._cloudObject && localObj._fieldMap) {

          var cloudObj = localObj._cloudObject;
          var fieldMap = localObj._fieldMap;

          _setProperties(cloudObj, fieldMap, localObj);

          cloudObj.$save(
            function(obj) {
              // return the saved object back
              deferred.resolve(localObj);
            },
            function(err) {
              deferred.reject(err);
            }
          );
        } else {
          deferred.reject("cloudData.save: _cloudObject is " + localObj._cloudObject +
            " and _fieldMap is " + localObj._fieldMap);
        }

        return deferred.promise;
      },

      get: function(model, fieldNames, id) {
        console.debug("cloudData.get: id " + id);

        var deferred = $q.defer();

        model.findById({
            id: id
          },
          function(obj) {
            console.log("found object!");

            var localObj = _makeLocalObject(obj, fieldNames);

            deferred.resolve(localObj);
          },
          function(err) {
            console.error("cloudData.get error :" + JSON.stringify(err));
            deferred.reject(err);
          });

        return deferred.promise;
      },

      getList: function(model, fieldNames, ids) {
        console.debug("cloudData.getList: ids: " + JSON.stringify(ids));

        var deferred = $q.defer();

        // if a list of ids is given, then filter based on that
        var filter = "";

        if (ids) {
          filter = {
            filter: {
              where: {
                id: {
                  inq: ids
                }
              }
            }
          };
        }

        model.find(filter,
          function(objects) {

            console.log("found objects!");
            var localObjs = [];
            var i;

            for (i = 0; i < objects.length; i++) {
              var obj = objects[i];
              var localObj = _makeLocalObject(obj, fieldNames);

              localObjs.push(localObj);
            }

            deferred.resolve(localObjs);
          },
          function(err) {
            console.error("cloudData.getList error :" + JSON.stringify(err));
            deferred.reject(err);
          });

        return deferred.promise;
      }
    };

  }])
  .factory('cloudDataCurrentUser', ['$q', 'Gamer', function($q, Gamer) {

    var _cookieName = "fantasygolf";
    var _currentUser = null;

    var _getCurrentUser = function() {

      if (!_currentUser) {
        // look at the cookies to fluff up our user object if it exists
        var cookie = _getCookie(_cookieName);

        if (cookie && cookie.length > 0) {
          _setCurrentUser(_deserialize(cookie));
        }
      }

      return _currentUser;
    };


    var _setCurrentUser = function(value) {
      _currentUser = value;
    };

    var _serialize = function(obj) {
      return JSON.stringify(obj);
    };

    var _deserialize = function(str) {
      var obj = JSON.parse(str);

      return obj;
    };

    var _getCookie = function(name) {
      var val = document.cookie;
      var start = val.indexOf(" " + name + "=");

      if (start == -1) {
        start = val.indexOf(name + "=");
      }

      if (start == -1) {
        val = null;
      } else {
        start = val.indexOf("=", start) + 1;

        var end = val.indexOf(";", start);

        if (end == -1) {
          end = val.length;
        }

        val = unescape(val.substring(start, end));
      }

      return val;
    };

    var _setCookie = function(name, value, daysValid) {
      var expires = new Date();

      expires.setDate(expires.getDate() + daysValid);

      var escapedValue = escape(value) +
        ((expires == null) ? "" : "; expires=" + expires.toUTCString());

      document.cookie = name + "=" + escapedValue;
    };


    // convenience functions for logging in, out current user
    return {
      isLoggedIn: function() {
        return (_getCurrentUser()) ? true : false;
      },

      logIn: function(user, pass) {
        var deferred = $q.defer();

        Gamer.login({
            user: user,
            password: pass
          },
          function(result) {
            if (result) {
              var gamer = result;

              // save our result as a cookie so we stay logged in across pages/reloads
              _setCookie(_cookieName, _serialize(gamer), 7);
              _setCurrentUser(gamer);

              deferred.resolve(user);
            } else {
              deferred.reject({
                "user": user,
                "err": "Couldn't find user"
              });
            }
          },
          function(err) {
            console.error("error logging in user :" + user + " err: " + JSON.stringify(err));

            deferred.reject({
              "user": user,
              "err": err
            });
          });

        return deferred.promise;
      },

      logOut: function() {
        if (this.isLoggedIn()) {
          // unset the cookie to show we're logged out
          _setCookie(_cookieName, "");

          _setCurrentUser(undefined);
        } else {
          console.error("logOut error: Not logged in.");
        }
      },

      getDisplayName: function() {
        var current = _getCurrentUser();

        if (current && current.data) {
          return current.data.name;
        }
        return null;
      },

      isAdmin: function() {
        var current = _getCurrentUser();

        if (current && current.data) {
          if (current.data.admin) {
            return true;
          }
        }

        return false;
      },

      getId: function() {
        var current = _getCurrentUser();

        return current.id;
      },

      isEqualTo: function(obj) {
        return this.getId() == obj._id;
      }
    };
  }])
  .factory('cdFantasy', ['$q', 'Fantasy', 'Gamer', function($q, Fantasy, gamer) {

    var fantasyPick = function(pick) {
      this.name = pick.name;
      this.id = pick.id;

      if (pick.score_details) {
        this.total = pick.score_details.total;
      }
    };

    var fantasyPicks = function(picks) {
      var picksArray = [];

      for (var i = 0; i < picks.length; i++) {
        var pick = picks[i];

        picksArray.push(new fantasyPick(pick));
      }

      this.picks = picksArray;
    };

    var fantasyGamer = function(gamer) {
      this.total = gamer.total;
      this.name = gamer.name;
      this.id = gamer.id;

      var picks = gamer.picks;
      var picksArray = [];

      if (picks) {
        for (var i = 0; i < picks.length; i++) {
          var pick = picks[i];

          picksArray.push(new fantasyPick(pick));
        }

        this.picks = picksArray;
      }
    };

    var fantasyEvent = function(event) {
      this.id = event.id;
      this.name = event.name;
      this.future = event.future;

      var gamers = event.gamers;
      var gamerArray = [];

      for (var i = 0; i < gamers.length; i++) {
        var gamer = gamers[i];

        gamerArray.push(new fantasyGamer(gamer));
      }

      this.gamers = gamerArray;
    };

    var fantasyGamerTotal = function(gamer) {
      this.id = gamer.id;
      this.total = gamer.total;
      this.name = gamer.name;
      this.leader = gamer.leader;
    };

    var fantasyRoster = function(roster) {

      this.id = roster.id;
      this.game = roster.data.game;
      this.event = roster.data.event;
      this.gamers = roster.data.gamers;
      this.players = roster.data.roster;
      this.transactions = roster.data.transactions;
    };

    var fantasySeason = function(game) {

      this.id = game.id;
      this.name = game.data.name;
      this.tour = game.data.tour;
      this.season = game.data.season;
      this.schedule = game.data.schedule;
      this.nextEvent = game.data.nextEvent;

      var gamedata = game.data;
      var gamerArray = [];

      for (var i = 0; i < gamedata.gamers.length; i++) {
        var gamer = gamedata.gamers[i];

        gamerArray.push(new fantasyGamerTotal(gamer));
      }

      this.gamers = gamerArray;

      var eventArray = [];

      for (var i = 0; i < gamedata.events.length; i++) {
        var event = gamedata.events[i];

        eventArray.push(new fantasyEvent(event));
      }

      this.events = eventArray;
    };

    var newFantasySeasons = function(obj) {

      return {
        getCurrentSeasons: function() {
          console.log("length = " + obj.games.length + " " + JSON.stringify(obj.games));

          var seasons = [];

          if (obj.games && obj.games.length > 0) {

            // look for any seasons with a "nextEvent", indicating that
            // events for this season are still under way, making this
            // a current season
            for (var i = 0; i < obj.games.length; i++) {
              var game = obj.games[i];

              var season = new fantasySeason(game);
              if (season.nextEvent) {
                seasons.push(season);
              }
            }
          }

          return seasons;
        },
        getPriorSeasons: function() {
          var seasons = [];

          if (obj.games && obj.games.length > 0) {

            // look for any seasons without a "nextEvent", indicating that
            // all events for the season have already completed, making this
            // a prior season
            for (var i = 0; i < obj.games.length; i++) {
              var game = obj.games[i];

              var season = new fantasySeason(game);
              if (!season.nextEvent) {
                seasons.push(season);
              }
            }
          }

          return seasons;
        },
        getSeasons: function() {
          var seasons = [];

          if (obj.games && obj.games.length > 0) {

            for (var i = 0; i < obj.games.length; i++) {
              var game = obj.games[i];

              seasons.push(new fantasySeason(game));
            }
          }

          return seasons;
        }
      };
    };

    var fantasySchedule = function(obj) {

      return {
        get: function() {

          var events = [];

          if (obj && obj.length > 0) {

            for (var i = 0; i < obj.length; i++) {
              var event = obj[i];

              events.push(event);
            }
          }

          return events;
        }
      };

    };

    var fantasyGamers = function(obj) {

      return {
        get: function() {

          var gamers = [];

          if (obj && obj.length > 0) {

            for (var i = 0; i < obj.length; i++) {
              var gamer = obj[i];

              gamers.push({
                id: gamer.id,
                name: gamer.data.name
              });
            }
          }

          return gamers;
        }
      };

    };


    // entry points for acessing fantasy data
    return {
      getAllGames: function() {
        var deferred = $q.defer();

        Fantasy.search({
            details: false // summary info only
          },
          function(obj) {
            deferred.resolve(newFantasySeasons(obj));
          },
          function(err) {
            deferred.reject({
              "user": user.getId(),
              "err": err
            });
          });

        return deferred.promise;
      },
      getGames: function(user) {
        var deferred = $q.defer();

        Fantasy.search({
            gamer: user.getId(),
            details: true
          },
          function(obj) {
            deferred.resolve(newFantasySeasons(obj));
          },
          function(err) {
            deferred.reject({
              "user": user.getId(),
              "err": err
            });
          });

        return deferred.promise;
      },
      getGame: function(gameid) {
        var deferred = $q.defer();

        Fantasy.getGame({
            id: gameid
          },
          function(obj) {
            console.log(JSON.stringify(obj));
            deferred.resolve(new fantasySeason(obj.game));
          },
          function(err) {
            deferred.reject({
              "gameid": gameid,
              "err": err
            });
          });

        return deferred.promise;
      },
      getRoster: function(gameid) {
        var deferred = $q.defer();

        console.log("About to get roster");

        Fantasy.getRoster({
            id: gameid
          },
          function(obj) {
            console.log("Got roster");
            console.log(JSON.stringify(obj));
            deferred.resolve(new fantasyRoster(obj.roster));
          },
          function(err) {
            deferred.reject({
              "gameid": gameid,
              "err": err
            });
          });

        return deferred.promise;
      },
      updateRoster: function(gameid, user, records) {
        var deferred = $q.defer();

        console.log("About to update roster for user " + user.getId());

        Fantasy.updateRoster({
            id: gameid,
            gamerid: user.getId(),
            players: records
          }, {},
          function(obj) {
            console.log("updated roster");
            console.log(JSON.stringify(obj));
            deferred.resolve(new fantasyRoster(obj.roster));
          },
          function(err) {
            deferred.reject({
              "gameid": gameid,
              "err": err
            });
          });

        return deferred.promise;
      },
      getRosterGamer: function(gameid, eventid, user) {
        var deferred = $q.defer();

        console.log("About to get roster for this gamer");

        Fantasy.getRosterGamer({
            id: gameid,
            eventid: eventid,
            gamerid: user.getId()
          },
          function(obj) {
            console.log("Got roster");
            console.log(JSON.stringify(obj));
            deferred.resolve(new fantasyRoster(obj.roster));
          },
          function(err) {
            deferred.reject({
              "gameid": gameid,
              "err": err
            });
          });

        return deferred.promise;
      },
      getPicks: function(gameid, eventid, user) {
        var deferred = $q.defer();

        console.log("About to get picks for game " + gameid + " and event " + eventid);

        Fantasy.getPicks({
            id: gameid,
            eventid: eventid,
            gamerid: user.getId()
          },
          function(obj) {
            console.log("Got picks");
            console.log(JSON.stringify(obj));
            deferred.resolve(new fantasyPicks(obj.picks));
          },
          function(err) {
            deferred.reject({
              "gameid": gameid,
              "err": err
            });
          });

        return deferred.promise;
      },
      putPicks: function(gameid, eventid, user, picks) {
        var deferred = $q.defer();

        console.log("About to put picks for game " + gameid + " and event " + eventid);

        Fantasy.putPicks({
            id: gameid,
            eventid: eventid,
            gamerid: user.getId(),
            picks: picks
          }, {},
          function(obj) {
            console.log("Got picks");
            console.log(JSON.stringify(obj));
            deferred.resolve(new fantasyPicks(obj.picks));
          },
          function(err) {
            deferred.reject({
              "gameid": gameid,
              "err": err
            });
          });

        return deferred.promise;
      },
      getTourSchedule: function(tour, year) {
        var deferred = $q.defer();

        console.log("About to get schedule for " + tour + " and season " + year);

        Fantasy.getTourSchedule({
            tour: tour,
            year: year
          },
          function(obj) {
            console.log("Got schedule");
            console.log(JSON.stringify(obj));
            deferred.resolve(new fantasySchedule(obj.schedule));
          },
          function(err) {
            deferred.reject({
              "tour": tour,
              "year": year,
              "err": err
            });
          });

        return deferred.promise;
      },
      getAllGamers: function() {
        var deferred = $q.defer();

        console.log("About to get all gamers");

        Fantasy.getGamers(
          function(obj) {
            console.log("Got gamers");
            console.log(JSON.stringify(obj));
            deferred.resolve(new fantasyGamers(obj.gamers));
          },
          function(err) {
            deferred.reject({
              "err": err
            });
          });

        return deferred.promise;
      },
      newGame: function(year, tour, name, schedule, gamers) {
        var deferred = $q.defer();

        console.log("About to create game " + name);

        Fantasy.newGame({
            season: year,
            tour: tour,
            name: name,
            schedule: schedule,
            gamers: gamers
          }, {},
          function(obj) {
            console.log("Created game");
            console.log(JSON.stringify(obj));
            deferred.resolve(obj);
          },
          function(err) {
            deferred.reject({
              "err": err
            });
          });

        return deferred.promise;
      },
      updateGame: function(id, name, schedule, gamers) {
        var deferred = $q.defer();

        console.log("About to update game " + id);

        Fantasy.updateGame({
            id: id,
            name: name,
            schedule: schedule,
            gamers: gamers
          }, {},
          function(obj) {
            console.log("Updated game");
            console.log(JSON.stringify(obj));
            deferred.resolve(obj);
          },
          function(err) {
            deferred.reject({
              "err": err
            });
          });

        return deferred.promise;
      },
      getSchedule: function(id) {
        var deferred = $q.defer();

        console.log("About to get schedule for game" + id);

        Fantasy.getSchedule({
            id: id
          },
          function(obj) {
            console.log("Got schedule");
            console.log(JSON.stringify(obj));
            deferred.resolve(obj.schedule);
          },
          function(err) {
            deferred.reject({
              "err": err
            });
          });

        return deferred.promise;
      },
      getEvent: function(gameid, eventid) {
        var deferred = $q.defer();

        console.log("About to get event " + eventid + " for game " + gameid);

        Fantasy.getEvent({
            id: gameid,
            eventid: eventid
          },
          function(obj) {
            console.log("Got event");
            console.log(JSON.stringify(obj));
            deferred.resolve(obj.event);
          },
          function(err) {
            deferred.reject({
              "err": err
            });
          });

        return deferred.promise;
      },
      getGolfer: function(gameid, eventid, golferid) {
        var deferred = $q.defer();

        console.log("About to get event " + eventid + " for game " + gameid + " and golfer " + golferid);

        Fantasy.getGolfer({
            id: gameid,
            eventid: eventid,
            golferid: golferid
          },
          function(obj) {
            console.log("Got golfer");
            console.log(JSON.stringify(obj));
            deferred.resolve(obj.scores);
          },
          function(err) {
            deferred.reject({
              "err": err
            });
          });

        return deferred.promise;
      },
      getEventRoster: function(gameid, eventid) {
        var deferred = $q.defer();

        console.log("About to get roster for " + gameid + " and event " + eventid);

        Fantasy.getEventRoster({
            id: gameid,
            eventid: eventid
          },
          function(obj) {
            console.log("Got event roster");
            console.log(JSON.stringify(obj));
            deferred.resolve(new fantasyRoster(obj.roster));
          },
          function(err) {
            deferred.reject({
              "err": err
            });
          });

        return deferred.promise;
      }
    };
  }]);
