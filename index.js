'use strict';

const {load} = require('cheerio');
const css = require('css');
const {JSDOM} = require("jsdom");
const decode = require('unescape');
const parse = require('style-parser');

function HtmlWebpackInlinerPlugin(options) {
  // Initialize
}

const findSelector = ($, nextStyles) => selector => {
  $('body').find(selector).each(function () {
    if ($(this).attr('style')) {
      const prevStyles = parse($(this).attr('style'));
      const styles = {...prevStyles, ...nextStyles};
      $(this).css(styles);
    } else {
      $(this).css(nextStyles);
    }
  });
};

const findRule = $ => rule => {
  const {selectors, declarations} = rule;
  let nextStyles = {};
  declarations
    .filter(({type}) => type === 'declaration')
    .map(({property, value}) => {
      nextStyles[property] = value
    });
  selectors && selectors.length && selectors.map(findSelector($, nextStyles));
};

HtmlWebpackInlinerPlugin.prototype.apply = compiler => {
  (compiler.hooks
    ? compiler.hooks.compilation.tap.bind(compiler.hooks.compilation, 'html-webpack-inline-styles-plugin')
    : compiler.plugin.bind(compiler, 'compilation'))(compilation => {

    (compilation.hooks
      ? compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tapAsync.bind(compilation.hooks.htmlWebpackPluginAfterHtmlProcessing, 'html-webpack-inline-style-plugin')
      : compilation.plugin.bind(compilation, 'html-webpack-plugin-after-html-processing'))((htmlPluginData, callback) => {

      //console.log(htmlPluginData.html)
      const $ = load(htmlPluginData.html);

      const dom = new JSDOM(htmlPluginData.html);
      const inlineStyles = dom.window.document.querySelector("style").textContent;
      const ast = css.parse(inlineStyles);
      const {stylesheet: {rules}} = ast;
      rules && rules.length && rules.map(findRule($));
      $('*').remove('style').find('*').each(function () {
        if ($(this).attr('id')) {
          $(this).removeAttr('id');
        }

        if ($(this).attr('class')) {
          $(this).removeAttr('class');
        }
      });
      const iosFix = `<style>
      a[x-apple-data-detectors] {
          color: inherit !important;
          text-decoration: none !important;
          font-size: inherit !important;
          font-family: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
      }
      </style>`;
      htmlPluginData.html = decode($('body').before(iosFix).html(), 'all');
      callback(null, htmlPluginData);
    });
  });
};

module.exports = HtmlWebpackInlinerPlugin;
