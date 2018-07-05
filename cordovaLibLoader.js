// @ts-check
const clobbersRegexp = /clobbers\(\s*['"](.*)['"]\s*,/g;
const requireRegexp = /require\s*([^\.:\(\w\d]|(\(\s*[^'"].*\s*\)))/g;
const defineRegexp = /define([,;])/g;
// cordova.js does not assign cordova object to window
// cordova_b.js assigns but does not define cordova.define()
const cordovaExportRegexp = /module\.exports\s*=\s*cordova\s*;/;

const defineStub = "(function (){ function stub() {}; stub.remove = function () {}; return stub; })()"

/**
 * @param {string} source
 */
module.exports = function cordovaLoader(source) {
    source = source
        .replace(clobbersRegexp, "clobbers(require.resolve('$1'),")
        .replace(requireRegexp, "__webpack_require__$1")
        .replace(defineRegexp, defineStub + "$1")
        .replace(cordovaExportRegexp, "window.cordova = module.exports = cordova;");
    return source;
}