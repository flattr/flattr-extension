/**
 * @file Provides command line related functionality
 */

"use strict";

const parseArgs = require("minimist");

let argv = process.argv.slice(2);

/**
 * Retrieve arguments from command line
 * @param {string[]} options.array - list of arguments that should be returned
 *   as an array
 * @param {string[]} options.boolean - see minimist
 * @param {string[]} options.string - see minimist
 * @return {boolean|boolean[]|string|string[]} - argument value or array of
 *   argument values
 */
function getArgs({array = [], boolean = [], string = []})
{
  // Node doesn't support rest properties yet for extracting minimist's options
  // so we're listing each option individually
  let args = parseArgs(argv, {boolean, string});

  // Depending on the number of occurrences, an argument's value can be a
  // boolean, a string or an array. We convert values either to or from arrays
  // to achieve a predictable return type.
  for (let name in args)
  {
    if (array.indexOf(name) > -1)
    {
      args[name] = [].concat(args[name]);
    }
    else if (args[name] instanceof Array)
    {
      args[name] = args[name][0];
    }
  }

  return args;
}
exports.getArgs = getArgs;
