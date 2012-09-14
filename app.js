
/**
 * Module dependencies.
 */

var url = require('url'),
    path = require('path'),
    http = require('http'),
    util = require('util'),

    _ = require('underscore'),
    express = require('express'),
    db = require('./db'),
    log = require('./log'),

    ldap = require('./node_modules/node-ldapauth/ldapauth'),
    utils = require('./utils'),
    qr = require('./qrcode'),
    memStore = new express.session.MemoryStore(),
    settings = require('./settings'),

    app = express();


// Middlware and utilities.
function url_lookup(req, res, next) {
  var short_url = req.params.url;

  db.get_by_short_url(short_url, function(err, results){
    var parsed_url;

    if (err){
      return console.error(err);
    }

    if (results === undefined) {
      res.status(404);
      return res.render('404.jade');
    }

    console.log("Success! Redirecting to", results.long_url);

    // don't wait on the db to redirect
    db.increment_url(short_url);

    parsed_url = url.parse(results.long_url);

    if (parsed_url.protocol){
      return res.redirect(results.long_url);
    }

    return res.redirect("http://"+results.long_url);

  });
}

function requiresLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}



// Configuration
app.configure(function(){
  app.set('port', settings.port || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({secret: "hello world",  store: memStore }));
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

app.locals({
  time: utils.format_time
});

// ROUTES

app.get('/login', function(req,res){
  res.render('login');
});


app.post('/login', function(req, res){
  var username = req.body.username,
      password = req.body.password;

  ldap_auth(username, password, function(err) {
    if (err) {
      console.log(JSON.stringify(err));
      return err;
    }
    else {
      return "success";
    }

  ldap.authenticate(LDAP_HOST, LDAP_PORT, username+'@DOMAIN', password, function(err, success) {
    if (username && password && success) {
      req.session.username = username;
      return res.redirect(req.body.next || '/');
    } else {
      return res.redirect("back");
    }
  });
  });
});


app.get('/all', requiresLogin, function(req, res){
  db.get_db().all("SELECT * FROM urls ORDER BY count DESC LIMIT 100;", function(err, rows){
    if (err){
      console.log(err);
    }
    headers = rows.length > 0 ? _.keys(rows[0]) : [];
    res.render('by-count.jade', {rows: rows, headers: headers});
  });
});


// Root and Queries
app.get('/', requiresLogin, function(req, res) {
  var query;
  if (_.isEmpty(req.query)) {
    return res.render('index');
  }
  query = _.keys(req.query);
  res.redirect( "https://search.rackspace.com/search?q=" +
     query +
    "&proxystylesheet=default_frontend");
});


app.get('/edit/:url', requiresLogin, function(req,res){
  var short_url = req.params.url;
  db.get_by_short_url(short_url, function(err, results){
    if (results === undefined) {
      res.redirect("/");
    } else {
      res.render('edit', {results: results});
    }
  });
});


app.get('/qr/:url', function (req,res) {
  var size = req.query.size;
  if (size === undefined || size <= 1 || size >= 90) {size = 6;}
  var short_url = req.params.url;
  qr.return_qr("http://rax.io/" + short_url, function(png_data) {
    res.set('Content-Type', 'image/png');
    res.send(png_data);
  }, size);
});



// This is where the magic happens!
app.get('/:url', url_lookup);
app.post('/edit/:url', requiresLogin, function(req, res) {
  var data = req.body;
  var long_url = data.long_url;
  var short_url = req.params.url;
  var notes = data.notes;
  var updated_at = new Date();
  var err;

  if (long_url === undefined){
    return res.render('edit.jade', {form_err: 'You must specify a long url.'});
  }
  db.edit_url(long_url, notes, updated_at, short_url, function(err, results){
    db.get_by_short_url(short_url, function(err, results){
      if (results === undefined) {
        res.redirect("/");
      } else {
        res.render('edit', {results: results});
      }
    });
  });
});


app.post('/', requiresLogin, function(req, res) {
  var data = req.body;
  var long_url = data.long_url;
  var short_url = data.short_url;
  var notes = data.notes;
  var date_created = new Date();
  var err;

  if (!long_url || !short_url){
    return res.render('index.jade', {form_err: 'You must specify a long and short url.'});
  }

  db.add_url(long_url, short_url, notes, date_created, function(err, results){
    var form = {msg: null, err: null, long_url: long_url, short_url: short_url, notes: notes};

    if (utils.is_integrity_error(err)){
      form.err = util.format("<strong>That short url already exists.</strong><br>Do you want to <a href='edit/%s'>edit</a> it?", short_url);
    } else if (err){
      form.err = err.toString();
    }else{
      form.msg = util.format("Successfully created your link: <br><a href='/%s'>http://rax.io/%s</a> <br>Generate your QR code here: <br><a href='edit/%s'>http://rax.io/edit/%s</a>", short_url, short_url, short_url, short_url);
    }

    res.render('index.jade', form);
  });
});



db.create_tables(function(err, res){
  if (err){
    return console.error(err);
  }
  process.on('uncaughtException', function(err) {
    console.log(err.stack ? err.stack : err.toString());
  });

  http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });
});
