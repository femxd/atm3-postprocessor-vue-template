var VueParser = require('./lib/VueParser');

module.exports = function (content, file, settings) {
  var modBaseDir = settings.modBaseDir;
  if (!modBaseDir) {
    return fis.log.error("miss modBaseDir settings!");
  }
  const vueParser = new VueParser({
    modBaseDir: modBaseDir
  });

  return vueParser.parse(content);
};