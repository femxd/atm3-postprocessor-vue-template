import fs from 'fs'
import path from 'path'
import cheerio from 'cheerio'
import log from './../lib/log'
import _ from './../lib/util'
import VueParser from '../lib/VueParser.es6'

const vueParser = new VueParser({
  modBaseDir: "D:/workspace/guide/qqbrowser/"
});

describe("posthtml demo", function () {
  this.timeout(10000);

  it("demo1", () => {
    var htmls = _.find(path.join(__dirname, './150908-native-v6'), "**.html");
    htmls.forEach(htmlFile => {
      var html = vueParser.parse(_.read(htmlFile));
      _.write(htmlFile.replace('/html/', '/dest/'), html);
    })
  });
});


