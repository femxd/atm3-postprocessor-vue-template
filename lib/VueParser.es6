import log from './log'
import _ from './util'
import cheerio from 'cheerio'

function VueParser(options = {modBaseDir: ""}) {
  var modBaseDir = options.modBaseDir;

  function readAllModFiles() {
    var files = _.find(modBaseDir, "mod-*/index.html", "publish/**");
    log.allan("files: ", files, ", \n\r total: ", files.length);

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
    var $ = cheerio.load(modCache.html, {
      decodeEntities: false
    });
    var comps = $("component");
    log.allan("[2] %s mod file has %d sub mods!", modCache.modName, comps.length);
    for (let i = comps.length - 1; i >= 0; i--) {
      var _$comp = $(comps[i]);
      var modName = _.trim(_$comp.attr("is") || ''),
        modLoadConf = _.trim(_$comp.attr("load") || '');

      if (!modName || modLoadConf === '!html') {
        _$comp.remove();
      } else {
        log.allan("[2] handle inner mod: ", modCache.modName);
        handleModFile(_$comp, modCaches[modName]);
      }
    }
    replaceVueComp($comp, modCache.modName, $);
    log.allan("[2] ", modCache.modName, " => html done!");
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
        _classes = _.trim(_class).split(/\s+/ig);

      _classes.forEach(item => {
        !$root.hasClass(item) && $root.addClass(item);
      });
    }
    handleImgDirective($comp, $mod);
    handleRepeatDirectiveForComp($comp, $mod);
    $comp.replaceWith($mod.html());
  }

  function handleRepeatDirectiveForComp($comp, $mod) {
    let _repeat = $comp.attr('repeat');
    if (!!_repeat) {
      $mod('[v-repeat]').map((__, elem) => {
        let $elem = $mod(elem);
        if (/repeat\s*||\s*\d+/.test($elem.attr('v-repeat'))) {
          log.allan("elem: ", $elem.html());
        }
        $elem.attr('v-repeat', _repeat);
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
    var $ = cheerio.load(html, {
      decodeEntities: false,
      normalizeWhitespace: false
    });

    $("[v-repeat], [repeat]").map((__, item) => {
      let $item = $(item);
      let repeatTimes = calcRepeatTimes($item);
      $item.removeAttr('v-repeat');
      $item.removeAttr('repeat');
      for (let i = 0; i < repeatTimes; i++) {
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
      log.allan("[1] start handle entry html");
      var $ = cheerio.load(srcHtml, {
        decodeEntities: false
      });
      var comps = $('component');
      log.allan("[1] entry file has %s mod!", comps.length);

      for (let i = comps.length - 1; i >= 0; i--) {
        var $comp = $(comps[i]);
        var modName = _.trim($comp.attr("is") || ''),
          modLoadConf = _.trim($comp.attr("load") || '');
        if (!modName || modLoadConf === '!html') {
          $comp.remove();
        } else {
          log.allan("[1] start handle mod: ", modName);
          log.allan("[1] entry %s has  %d child mod", modName, $comp.children('component').length);
          handleModFile($comp, modCaches[modName]);
        }
      }

      log.allan("[1] success handled entry");
      var raw = $.html();
      return handleRepeatDirective(raw);
    }
  }
}

export default VueParser