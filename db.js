/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var fs = require('fs');
var path = require('path');
var util = require('util');
var utils = require('./utils');

var _ = require('underscore');
var async = require('async');
var sqlite3 = require('sqlite3').verbose();

var log = require('./log');

var db;

var INTEGRITY_ERROR = 19;

var SCHEMA = [
  "CREATE TABLE IF NOT EXISTS urls " +
  "(long_url VARCHAR(1024) NOT NULL, " +
  "short_url VARCHAR(1024) NOT NULL, " +
  "notes TEXT, " +
  "created_at TIMESTAMP, " +
  "updated_at TIMESTAMP, " +
  "UNIQUE(short_url)); "
];

// a wrapper for interacting with sqlite3
module.exports = new utils.make_class({
  init: function(){
    var self = this;
    var _path = path.join(__dirname, '.', 'db.sqlite');
    self.db = new sqlite3.Database(_path);
    self.db.on('trace', function(event){
      log.debug(event.toString());
    });
  },
  create_tables: function(cb){
    var self = this;
    var queries = [];
    console.log("Creating tables...");
    // create schema if needed
    _.each(SCHEMA, function(create_table){
      queries.push(_.bind(self.db.run, self.db, create_table));
    });
    async.series(queries, function(err, results){
      if (err){
        utils.die("Creating tables failed:", err);
      }
      cb(err, results);
    });
  },
  squelch_integrity_error: function (cb) {
    var self = this;
    return function (err, result) {
      if (err && err.errno === INTEGRITY_ERROR) {
        err = null;
      }
      if (cb) {
        cb(err, result);
      }
    };
  },
  get_db: function () {
    var self = this;
    return self.db;
  },
  get_by_short_url: function(short_url, cb){
    var self = this;
    return self.db.get("SELECT * FROM urls WHERE short_url=?;",
      short_url, cb);
  },
  add_url: function (long_url, short_url, notes, created_at, cb) {
    var self = this;
    // try{
    //   long_url = validate_url(long_url);
    //   short_url = validate_url(short_url);
    // } catch(e){
    //   return cb(e);
    // }
    return self.db.run("INSERT INTO urls (long_url, short_url, notes, created_at) VALUES (?, ?, ?, ?);", [long_url, short_url, notes, created_at], function(err){
      if (err){
        console.log(err);
        return cb(err);
      }
      self.db.get("SELECT * FROM urls WHERE long_url = ?", long_url, function(err, results){
        cb(err, results);
      });
    });
  }
})();