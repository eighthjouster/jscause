var thisModuleName = './jscvendor/formidable';
function jsModuleSupport(thisModuleName, name) {
  return ({
    './jscvendor/formidable': {
      './lib': require('./lib')
    }
  })[thisModuleName][name];
}
var _jscause_require = function(moduleName) { return jsModuleSupport(thisModuleName, moduleName); }

module.exports = _jscause_require('./lib');