console.log("loading GolfPicks.data");

angular.module('GolfPicks.data', [])
    .factory('cloudDataLog', ['cloudData', 'cloudDataCurrentUser', 'Log', function (cloudData, currentUser, model) {
        var _fieldNames = {
            user: "user",
            type: "type",
            message: "message",
            time: "time"
        };

        // convenience functions for logging
        return {
            access: function (message) {

                var data = {
                    user: currentUser.getDisplayName(),
                    type: "access",
                    message: message,
                    time: Date.now()
                };

                return cloudData.add(model, _fieldNames, data);
            }
        }
    }])
    .factory('cloudDataPlayer', ['cloudData', 'Gamer', function (cloudData, model) {

        var _fieldNames = {
            name: "name",
            username: "email",
            password: "password"
        };

        return {
            delete: function (player) {
                return cloudData.delete(model, player);
            },

            save: function (player) {
                return cloudData.save(player);
            },

            add: function (playerData) {
                return cloudData.add(model, _fieldNames, playerData);
            },

            get: function (id) {
                return cloudData.get(model, _fieldNames, id);
            },

            getList: function (ids) {
                return cloudData.getList(model, _fieldNames, ids);
            },

            getAll: function () {
                return cloudData.getList(model, _fieldNames);
            }

        }
    }]);
