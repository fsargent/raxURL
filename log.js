
var _ = require('underscore');

var utils = require('./utils').common;

var function_name_regex = /\s*(function[^\(\)]*\([^\(\)]*\))/;

var log_levels = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3
};

var log_levels_to_string = {};

var log_levels_to_func = {
  error: console.error,
  warn: console.warn,
  log: console.log,
  debug: console.log
};

_.each(log_levels, function (value, key) {
  log_levels_to_string[value] = "__" + key.toUpperCase() + "__";
});

var log_level = "log";

var set_log_level = function (new_log_level) {
  if (log_levels[new_log_level] === undefined) {
    utils.die(new_log_level, "is not a valid log level");
  }
  else {
    log_level = log_levels[new_log_level];
  }
};

var log = function (level_name, args, caller) {
  var now = new Date();
  var log_fn;
  var level = log_levels[level_name];
  args = Array.prototype.slice.call(args);

  if (args.length === 0) {
    args.push(caller, "called log with no message");
    level = log_levels.error;
  }

  if (log_levels_to_func[level_name] === undefined) {
    console.error("Invalid log level:", level);
    return;
  }

  if (level <= log_level) {
    args.unshift(log_levels_to_string[level], now);
    log_levels_to_func[level_name].apply(null, args);
    if (level === log_levels.error &&
        args[0] !== undefined &&
        args[0].stack !== undefined) {
      console.error(args[0].stack);
    }
  }
};

_.each(log_levels, function (value, key) {
  exports[key] = function () {
    var caller = arguments.callee.caller.toString().match(function_name_regex);
    caller = caller === undefined ? caller : caller[0];
    log(key, arguments, caller);
  };
});

exports.set_log_level = set_log_level;
