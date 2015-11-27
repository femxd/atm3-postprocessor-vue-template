'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _log = require('./log');

var _log2 = _interopRequireDefault(_log);

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

var _cheerio = require('cheerio');

var _cheerio2 = _interopRequireDefault(_cheerio);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function VueParser() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? { modBaseDir: "" } : arguments[0];

  var modBaseDir = options.modBaseDir;

  function readAllModFiles() {
    var files = _util2.default.find(modBaseDir, "mod-*/index.html", "publish/**");
    _log2.default.allan("files: ", files, ", \n\r total: ", files.length);

    var _modCaches = {};
    files.forEach(function (file) {
      var modName = getModName(file, modBaseDir);
      _modCaches[modName] = {
        modName: modName,
        file: file,
        html: _util2.default.read(file)
      };
    });
    return _modCaches;
  }

  function handleModFile($comp, modCache) {
    var $ = _cheerio2.default.load(modCache.html, {
      decodeEntities: false
    });
    var comps = $("component");
    _log2.default.allan("[2] %s mod file has %d sub mods!", modCache.modName, comps.length);
    for (var i = comps.length - 1; i >= 0; i--) {
      var _$comp = $(comps[i]);
      var modName = _util2.default.trim(_$comp.attr("is") || ''),
          modLoadConf = _util2.default.trim(_$comp.attr("load") || '');

      if (!modName || modLoadConf === '!html') {
        _$comp.remove();
      } else {
        _log2.default.allan("[2] handle inner mod: ", modCache.modName);
        handleModFile(_$comp, modCaches[modName]);
      }
    }
    replaceVueComp($comp, modCache.modName, $);
    _log2.default.allan("[2] ", modCache.modName, " => html done!");
  }

  function replaceVueComp($comp, modName, $mod) {
    if ($comp.children().length === 0) {
      $mod("content").replaceWith($mod("content").html());
    } else {
      $mod("content").replaceWith($comp.html());
    }
    var _class = $comp.attr('class');
    if (!!_class) {
      var $root = $mod.root().children().first(),
          _classes = _util2.default.trim(_class).split(/\s+/ig);

      _classes.forEach(function (item) {
        !$root.hasClass(item) && $root.addClass(item);
      });
    }
    handleImgDirective($comp, $mod);
    handleRepeatDirectiveForComp($comp, $mod);
    $comp.replaceWith($mod.html());
  }

  function handleRepeatDirectiveForComp($comp, $mod) {
    var _repeat = $comp.attr('repeat');
    if (!!_repeat) {
      $mod('[v-repeat]').map(function (__, elem) {
        var $elem = $mod(elem);
        if (/repeat\s*||\s*\d+/.test($elem.attr('v-repeat'))) {
          _log2.default.allan("elem: ", $elem.html());
        }
        $elem.attr('v-repeat', _repeat);
      });
    }
  }

  function handleImgDirective($comp, $mod) {
    var img = $comp.attr('img') || $comp.attr('v-img');
    if (!!img) {
      var imgElems = $mod('[v-img]');
      imgElems.map(function (__, elem) {
        $mod(elem).removeAttr('v-img');
        $mod(elem).attr('src', 'http://temp.im/' + img || '56x56');
      });
    }
  }

  function calcRepeatTimes($comp) {
    var _repeatAttr = $comp.attr("repeat") || $comp.attr("v-repeat");
    if (!!_repeatAttr) {
      var repeatTimes = parseInt(_repeatAttr);
      if (isNaN(repeatTimes)) {
        repeatTimes = parseInt(_repeatAttr.split('||')[1]);
      }
      if (!isNaN(repeatTimes)) {
        return repeatTimes - 1;
      }
      return 0;
    }
    return 0;
  }

  function handleRepeatDirective(html) {
    var $ = _cheerio2.default.load(html, {
      decodeEntities: false,
      normalizeWhitespace: false
    });

    $("[v-repeat], [repeat]").map(function (__, item) {
      var $item = $(item);
      var repeatTimes = calcRepeatTimes($item);
      $item.removeAttr('v-repeat');
      $item.removeAttr('repeat');
      for (var i = 0; i < repeatTimes; i++) {
        $item.clone().insertAfter($item);
      }
    });
    return $.html();
  }

  function getModName(modIndexFile, modBaseDir) {
    var prefixIdx = modIndexFile.indexOf(modBaseDir),
        suffixIdx = modIndexFile.lastIndexOf('/index.html');

    return modIndexFile.substring(prefixIdx + modBaseDir.length, suffixIdx);
  }

  var modCaches = readAllModFiles();

  return {
    parse: function handleEntryHtml(srcHtml) {
      _log2.default.allan("[1] start handle entry html");
      var $ = _cheerio2.default.load(srcHtml, {
        decodeEntities: false
      });
      var comps = $('component');
      _log2.default.allan("[1] entry file has %s mod!", comps.length);

      for (var i = comps.length - 1; i >= 0; i--) {
        var $comp = $(comps[i]);
        var modName = _util2.default.trim($comp.attr("is") || ''),
            modLoadConf = _util2.default.trim($comp.attr("load") || '');
        if (!modName || modLoadConf === '!html') {
          $comp.remove();
        } else {
          _log2.default.allan("[1] start handle mod: ", modName);
          _log2.default.allan("[1] entry %s has  %d child mod", modName, $comp.children('component').length);
          handleModFile($comp, modCaches[modName]);
        }
      }

      _log2.default.allan("[1] success handled entry");
      var raw = $.html();
      return handleRepeatDirective(raw);
    }
  };
}

exports.default = VueParser;
