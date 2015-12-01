import log from './log'
import _ from './util'
import cheerio from 'cheerio'

log.level = log.L_DEBUG;
const SCRIPT_REG = /(<script.*(myapp|qqbrowser)\/\2\.js.*<\/script>)/ig;

function VueParser(options = {modBaseDir: ""}) {
  var modBaseDir = options.modBaseDir;

  function readAllModFiles() {
    var files = _.find(modBaseDir, "{mod,css}-*/index.html", "publish/**");
    log.debug("files: ", files, ", \n\r total: ", files.length);

    var _modCaches = {};
    files.forEach((file) => {
      var modName = getModName(file, modBaseDir);
      _modCaches[modName] = {
        modName: modName,
        file: file,
        html: _.read(file)
      }
    });
    return _modCaches;
  }

  function handleModFile($comp, modCache) {
    log.debug("modCache html: ", modCache.html);
    var $ = cheerio.load(modCache.html, {
      decodeEntities: false
    });
    var comps = $("component");
    log.debug("[2] %s mod file has %d sub mods!", modCache.modName, comps.length);
    for (let i = comps.length - 1; i >= 0; i--) {
      var _$comp = $(comps[i]);
      var modName = _.trim(_$comp.attr("is") || ''),
        modLoadConf = _.trim(_$comp.attr("load") || '');

      if (!modName || modLoadConf === '!html') {
        _$comp.remove();
      } else {
        log.debug("[2] handle inner mod: ", modCache.modName);
        handleModFile(_$comp, modCaches[modName]);
      }
    }
    replaceVueComp($comp, modCache.modName, $);
    log.debug("[2] ", modCache.modName, " => html done!");
  }

  function replaceVueComp($comp, modName, $mod) {
    replaceContentElem($comp, $mod);
    var _class = $comp.attr('class');
    if (!!_class) {
      var $root = $mod.root().children().first(),
        _classes = _.trim(_class).split(/\s+/ig);

      _classes.forEach(item => {
        !$root.hasClass(item) && $root.addClass(item);
      });
    }
    handleImgDirective($comp, $mod);
    handleRepeatDirectiveForComp($comp, $mod);
    $comp.replaceWith($mod.html());
  }

  function replaceContentElem($comp, $mod) {
    let contents = $mod("content");
    let contentArr = [];
    for (let i = 0; i < contents.length; i++) {
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
    let waitRemoves = [];
    contentArr.map(($content) => {
      if (!!$content.attr('select')) {
        let selector = $content.attr("select");
        let $first = $comp.children(selector).first();
        log.debug("content selector: ", selector);
        if (!!$first) {
          log.debug("select hint: ", $first.attr('class'));
          $content.replaceWith($first.clone());
          waitRemoves.indexOf($first) === -1 && waitRemoves.push($first);
        } else {
          log.debug("select miss!");
          $content.remove();
        }
      } else {
        waitRemoves.map($item => $item.remove());
        waitRemoves.length = 0;
        $mod("content").replaceWith($comp.children().length ? $comp.html() : $mod("content").html());
      }
    });
  }

  function handleRepeatDirectiveForComp($comp, $mod) {
    let _repeat = $comp.attr('repeat');
    if (!!_repeat) {
      $mod('[v-repeat]').map((__, elem) => {
        let $elem = $mod(elem);
        if (/repeat\s*||\s*\d+/.test($elem.attr('v-repeat'))) {
          $elem.attr('v-repeat', _repeat);
        }
      });
    }
  }

  function handleImgDirective($comp, $mod) {
    let img = $comp.attr('img') || $comp.attr('v-img');
    if (!!img) {
      let imgElems = $mod('[v-img]');
      imgElems.map((__, elem) => {
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
    var $ = cheerio.load(html, {
      decodeEntities: false,
      normalizeWhitespace: false
    });

    $("[v-repeat], [repeat]").map((__, item) => {
      let $item = $(item);
      let repeatStr = $item.attr("repeat") || $item.attr("v-repeat");
      let repeatTimes = calcRepeatTimes(repeatStr);
      if (!!repeatTimes) {
        $item.removeAttr('v-repeat');
        $item.removeAttr('repeat');
        for (let i = 0; i < repeatTimes; i++) {
          $item.clone().insertAfter($item);
        }
      } else {
        try {
          repeatStr = repeatStr.replace(/'/ig, '"');
          let repeatArr = JSON.parse(repeatStr);
          $item.removeAttr('v-repeat');
          $item.removeAttr('repeat');

          if (repeatArr && repeatArr.length) {
            repeatArr.map((attr) => {
              let $clone = $item.clone();
              $clone.children('[v-text]').text(attr).removeAttr('v-text');
              $clone.insertAfter($item);
            });
            $item.remove();
          }
        } catch (e) {
          log.error("parse v-repeat attr error: ", e.stack, " \n\r from: ", $item.html());
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
      log.debug("[1] start handle entry html ");
      var $ = cheerio.load(srcHtml, {
        decodeEntities: false
      });
      var comps = $('component');
      log.debug("[1] entry file has %s mod!", comps.length);

      for (let i = comps.length - 1; i >= 0; i--) {
        var $comp = $(comps[i]);
        var modName = _.trim($comp.attr("is") || ''),
          modLoadConf = _.trim($comp.attr("load") || '');
        if (!modName || modLoadConf === '!html') {
          $comp.remove();
        } else {
          log.debug("[1] start handle mod: ", modName);
          log.debug("[1] entry %s has  %d child mod", modName, $comp.children('component').length);
          let modCache = modCaches[modName];
          if (!modCache) {
            return log.error("componenet %s not exists! please update guide project!", modName);
          }
          handleModFile($comp, modCache);
        }
      }

      log.debug("[1] success handled entry");
      var raw = $.html();
      return handleRepeatDirective(raw.replace(SCRIPT_REG, ""));
    }
  }
}

VueParser.util = util;
VueParser.log = log;

export default VueParser