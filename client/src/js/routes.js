'use strict';

/**
 * Route configuration for the RDash module.
 */
angular.module('CloudApp').config(['$stateProvider', '$routeProvider', '$urlRouterProvider',
    function ($stateProvider, $routeProvider, $urlRouterProvider) {

        console.log("In routes");

        // For unmatched routes
        $urlRouterProvider.otherwise('/');

        // Application routes
        $stateProvider
            .state('index', {
                url: '/',
                templateUrl: 'templates/games.html',
                label: 'My Games',
                crumbs: 'Home / My Games'
            })
            .state('allgames', {
                url: '/allgames',
                templateUrl: 'templates/allgames.html',
                label: 'Games',
                crumbs: 'Home / Games'
            })
            .state('game', {
                url: '/game',
                templateUrl: 'templates/game.html',
                label: 'Game',
                crumbs: 'Home / Games / Game'
            })
            .state('game/id', {
                url: '/game/id/:id',
                templateUrl: 'templates/game.html',
                label: 'Game',
                crumbs: 'Home / Games / Game'
            })
            .state('gameplayers', {
                url: '/gameplayers/id/:id',
                templateUrl: 'templates/gameplayers.html',
                label: 'Game Players',
                crumbs: 'Home / Games / Game Players'
            })
            .state('about', {
                url: '/about',
                templateUrl: 'templates/about.html',
                label: 'About',
                crumbs: 'Home / About'
            })
            .state('support', {
                url: '/support',
                templateUrl: 'templates/support.html',
                label: 'Support',
                crumbs: 'Home / Support'
            })
            .state('leaderboard/id', {
                url: '/leaderboard/id/:id',
                templateUrl: 'templates/leaderboard.html',
                label: 'Leaderboard',
                crumbs: 'Home / Games / Leaderboard'
            })
            .state('eventleaders/id/eventid', {
                url: '/eventleaders/id/eventid/:id/:eventid',
                templateUrl: 'templates/eventleaders.html',
                label: 'Tournament Scores',
                crumbs: 'Home / Golf Tournaments / Tournament Scores'
            })
            .state('golfer/id/eventid/golferid', {
                url: '/golfer/id/eventid/golferid/:id/:eventid/:golferid',
                templateUrl: 'templates/golfer.html',
                label: 'Scores',
                crumbs: 'Home / Golf Tournaments / Golfer'
            })
            .state('rosterevent/id/eventid', {
                url: '/rosterevent/id/eventid/:id/:eventid',
                templateUrl: 'templates/rosterevent.html',
                label: 'Event Roster',
                crumbs: 'Home / Games / Event Roster'
            })
            .state('roster/id', {
                url: '/roster/id/:id',
                templateUrl: 'templates/roster.html',
                label: 'Roster',
                crumbs: 'Home / Games / Roster'
            })
            .state('roster/id/available', {
                url: '/roster/id/available/:id',
                templateUrl: 'templates/rosterfa.html',
                label: 'Free Agents',
                crumbs: 'Home / Games / Free Agents'
            })
            .state('rosteredit/id', {
                url: '/rosteredit/id/player/:id',
                templateUrl: 'templates/rosteredit.html',
                label: 'Roster Edit',
                crumbs: 'Home / Games / Roster Edit'
            })
            .state('rosteredit/id/player', {
                url: '/rosteredit/id/player/:id/:playerid',
                templateUrl: 'templates/rosteredit.html',
                label: 'Roster Edit',
                crumbs: 'Home / Games / Roster Edit'
            })
            .state('picks/id/event', {
                url: '/picks/id/event/:id/:eventid',
                templateUrl: 'templates/picks.html',
                label: 'Picks',
                crumbs: 'Home / Games / Picks'
            })
            .state('profile', {
                url: '/profile',
                templateUrl: 'templates/profile.html',
                label: 'Profile',
                crumbs: 'Home / Profile'
            })
            .state('events', {
                url: '/events',
                templateUrl: 'templates/events.html',
                label: 'Golf Tournament',
                crumbs: 'Home / Golf Tournament'
            })
            .state('scores', {
                url: '/scores',
                templateUrl: 'templates/scores.html',
                label: 'Scores',
                crumbs: 'Home / Scores'
            })
            .state('score', {
                url: '/score',
                templateUrl: 'templates/score.html',
                label: 'Score',
                crumbs: 'Home / Scores / Score'
            })
            .state('scoreedit', {
                url: '/scoreedit',
                templateUrl: 'templates/scoreedit.html',
                label: 'Score',
                crumbs: 'Home / Scores / Score'
            })
            .state('users', {
                url: '/users',
                templateUrl: 'templates/users.html',
                label: 'Users',
                crumbs: 'Home / Users'
            })
            .state('user/id', {
                url: '/user/id/:id',
                templateUrl: 'templates/user.html',
                label: 'User',
                crumbs: 'Home / Users / User'
            })
            .state('user', {
                url: '/user',
                templateUrl: 'templates/user.html',
                label: 'User',
                crumbs: 'Home / Users / User'
            })
            .state('login', {
                url: '/login',
                templateUrl: 'templates/login.html',
                label: 'FantasyGolf',
                crumbs: ''
            });

    }
]);
