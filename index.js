var VueParser = require('./lib/VueParser').default;

module.exports = function (ret, conf, settings, opt) {
  var modBaseDir = settings.modBaseDir;
  if (!modBaseDir) {
    return fis.log.error("miss modBaseDir settings!");
  }

  const vueParser = new VueParser({
    modBaseDir: modBaseDir
  });
  fis.util.map(ret.src, function (subpath, file) {
    if (file.isHtmlLike) {
      var destHtml = vueParser.parse(file.getContent());
      file.setContent(destHtml);
    }
  });
};