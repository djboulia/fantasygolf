# Fantasy Golf

To build this project for the first time, you will need npm, node bower and gulp installed.  Once you have those, do this:

```
sudo npm install

bower install

gulp
```

For this project to run successfully, you will need to configure your cloudant database
name and credentials in the file:


server/datasources.json

## What the app does

This app allows a group of players to compete against each other by drafting a set of golfers and
accumulating points based on their play throughout the season.

Each player will draft 12 golfers, 5 of which will start on any given week.

## Overall Design

- There is a client side, Angular (https://angularjs.org) based app located under the /client directory.  /client/src/index.html is the main entry point
- The server side is implemented in Node and uses StrongLoop (https://strongloop.com). It is located in the /server directory.  /server/server.js is the main entry point for the backend server.
- You can browse the server side API at the URL http://localhost:3000/explorer
- For the most part, the server side API provides access to the game data, which is stored in a Cloudant database.  The one exception is scoring data, which comes from the tourdata.mybluemix.net site.



## Change History:

March 28, 2018:
Initial version adapted from GolfPicks app
