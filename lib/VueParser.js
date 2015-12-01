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

_log2.default.level = _log2.default.L_DEBUG;
var SCRIPT_REG = /(<script.*(myapp|qqbrowser)\/\2\.js.*<\/script>)/ig;

function VueParser() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? { modBaseDir: "" } : arguments[0];

  var modBaseDir = options.modBaseDir;

  function readAllModFiles() {
    var files = _util2.default.find(modBaseDir, "{mod,css}-*/index.html", "publish/**");
    _log2.default.debug("files: ", files, ", \n\r total: ", files.length);

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
    _log2.default.debug("modCache html: ", modCache.html);
    var $ = _cheerio2.default.load(modCache.html, {
      decodeEntities: false
    });
    var comps = $("component");
    _log2.default.debug("[2] %s mod file has %d sub mods!", modCache.modName, comps.length);
    for (var i = comps.length - 1; i >= 0; i--) {
      var _$comp = $(comps[i]);
      var modName = _util2.default.trim(_$comp.attr("is") || ''),
          modLoadConf = _util2.default.trim(_$comp.attr("load") || '');

      if (!modName || modLoadConf === '!html') {
        _$comp.remove();
      } else {
        _log2.default.debug("[2] handle inner mod: ", modCache.modName);
        handleModFile(_$comp, modCaches[modName]);
      }
    }
    replaceVueComp($comp, modCache.modName, $);
    _log2.default.debug("[2] ", modCache.modName, " => html done!");
  }

  function replaceVueComp($comp, modName, $mod) {
    replaceContentElem($comp, $mod);
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

  function replaceContentElem($comp, $mod) {
    var contents = $mod("content");
    var contentArr = [];
    for (var i = 0; i < contents.length; i++) {
      contentArr.push($mod(contents[i]));
    }
    contentArr.sort(function (a, b) {
      if (!!a.attr('select')) {
        return -1;
      } else if (!!b.attr('select')) {
        return 1;
      } else {
        return 0;
      }
    });
    var waitRemoves = [];
    contentArr.map(function ($content) {
      if (!!$content.attr('select')) {
        var selector = $content.attr("select");
        var $first = $comp.children(selector).first();
        _log2.default.debug("content selector: ", selector);
        if (!!$first) {
          _log2.default.debug("select hint: ", $first.attr('class'));
          $content.replaceWith($first.clone());
          waitRemoves.indexOf($first) === -1 && waitRemoves.push($first);
        } else {
          _log2.default.debug("select miss!");
          $content.remove();
        }
      } else {
        waitRemoves.map(function ($item) {
          return $item.remove();
        });
        waitRemoves.length = 0;
        $mod("content").replaceWith($comp.children().length ? $comp.html() : $mod("content").html());
      }
    });
  }

  function handleRepeatDirectiveForComp($comp, $mod) {
    var _repeat = $comp.attr('repeat');
    if (!!_repeat) {
      $mod('[v-repeat]').map(function (__, elem) {
        var $elem = $mod(elem);
        if (/repeat\s*||\s*\d+/.test($elem.attr('v-repeat'))) {
          $elem.attr('v-repeat', _repeat);
        }
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

  function calcRepeatTimes(_repeatAttr) {
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
      var repeatStr = $item.attr("repeat") || $item.attr("v-repeat");
      var repeatTimes = calcRepeatTimes(repeatStr);
      if (!!repeatTimes) {
        $item.removeAttr('v-repeat');
        $item.removeAttr('repeat');
        for (var i = 0; i < repeatTimes; i++) {
          $item.clone().insertAfter($item);
        }
      } else {
        try {
          repeatStr = repeatStr.replace(/'/ig, '"');
          var repeatArr = JSON.parse(repeatStr);
          $item.removeAttr('v-repeat');
          $item.removeAttr('repeat');

          if (repeatArr && repeatArr.length) {
            repeatArr.map(function (attr) {
              var $clone = $item.clone();
              $clone.children('[v-text]').text(attr).removeAttr('v-text');
              $clone.insertAfter($item);
            });
            $item.remove();
          }
        } catch (e) {
          _log2.default.error("parse v-repeat attr error: ", e.stack, " \n\r from: ", $item.html());
        }
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
      _log2.default.debug("[1] start handle entry html ");
      var $ = _cheerio2.default.load(srcHtml, {
        decodeEntities: false
      });
      var comps = $('component');
      _log2.default.debug("[1] entry file has %s mod!", comps.length);

      for (var i = comps.length - 1; i >= 0; i--) {
        var $comp = $(comps[i]);
        var modName = _util2.default.trim($comp.attr("is") || ''),
            modLoadConf = _util2.default.trim($comp.attr("load") || '');
        if (!modName || modLoadConf === '!html') {
          $comp.remove();
        } else {
          _log2.default.debug("[1] start handle mod: ", modName);
          _log2.default.debug("[1] entry %s has  %d child mod", modName, $comp.children('component').length);
          var modCache = modCaches[modName];
          if (!modCache) {
            return _log2.default.error("componenet %s not exists! please update guide project!", modName);
          }
          handleModFile($comp, modCache);
        }
      }

      _log2.default.debug("[1] success handled entry");
      var raw = $.html();
      return handleRepeatDirective(raw.replace(SCRIPT_REG, ""));
    }
  };
}

VueParser.util = util;
VueParser.log = _log2.default;

exports.default = VueParser;