var arg = process.argv.slice(0);
require('babel-core/register');
require("../" + arg[arg.length - 1]);