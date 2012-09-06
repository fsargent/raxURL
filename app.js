
/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    db = require('./db'),
    log = require('./log'),
    _ = require('underscore'),
    url = require('url'),
    path = require('path');

var app = express();


app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

db.init(function(){});
db.create_tables(function(){});

function url_lookup(req, res, next) {
  var short_url = req.params.url;
  var long_url;
  db.get_by_short_url(short_url, function(err, results){
    if (results === undefined) {
      res.redirect("/");
    } else {
      // TODO: setup a validator on the form so this can be removed.
      try {
        long_url = url.parse(results.long_url);
      } catch(e) {
        console.log("Long URL is not a URL: ", results.long_url, e);
      }
      console.log("Success! Redirecting to", long_url.href);
      if (long_url.protocol){
        res.redirect(long_url.href);
      } else {
        res.redirect("http://"+long_url.href);
      }
    }
  });
}

// Root and Queries
app.get('/', function(req, res) {
  if (_.isEmpty(req.query) === false) {
    var query = _.keys(req.query);
    console.log(query);
    res.redirect(
      "https://search.rackspace.com/search?q=" +
       query +
      "&proxystylesheet=default_frontend");
  }
  res.render('index');
});

// Lookups
app.get('/:url', url_lookup);

app.post('/', function(req, res) {
  var data = req.body;
  var long_url = data.long_url;
  var short_url = data.short_url;
  var notes = data.notes;
  var date_created = new Date();

  // Validation
  console.log(data);
  console.log(long_url);

  db.add_url(long_url, short_url, notes, date_created, function(err, results){
    res.render('index.jade', {err: err, results: results});
  });
});



http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});