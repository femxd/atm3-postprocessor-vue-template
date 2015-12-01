import fs from 'fs'
import path from 'path'
import cheerio from 'cheerio'
import log from './../lib/log'
import _ from './../lib/util'
import VueParser from '../lib/VueParser.es6'

const vueParser = new VueParser({
  modBaseDir: "D:/workspace/guide/myapp/"
});

describe("posthtml demo", function () {
  this.timeout(10000);

  it("demo1", () => {
    var htmls = _.find('D:/tmp/client', "**.html");
    htmls.forEach(htmlFile => {
      var html = vueParser.parse(_.read(htmlFile));
      _.write(htmlFile.replace('/html/', '/publish/html/'), html);
    })
  });
});


