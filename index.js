// @ts-check
const path = require("path");
const fs = require("fs");

const processPluginXML = require("./utils");

module.exports.defaults = module.exports.WebpackCordovaBundlePlugin = class WebpackCordovaBundlePlugin {
  constructor(options = {}) {
    if (!options.platform) {
      throw new Error("Please specify the cordova platform");
    }
    this.pluginName = "WepbackCordovaBundlePlugin";
    this.platform = options.platform;
    this.plugins = options.plugins || [];
    this.cordovaJSPath = path.join(
      path.dirname(require.resolve("cordova-js/package.json")),
      "src"
    );
    this.cordovaJSCommonPath = path.join(this.cordovaJSPath, "common");
    this.cordovaPlatformPath = path.join(
      path.dirname(require.resolve(`cordova-${this.platform}/package.json`)),
      "cordova-js-src"
    );
  }
  getCordovaPath(modulePath) {
    const tryPaths = [
      path.join(this.cordovaPlatformPath, modulePath) + "_b.js",
      path.join(this.cordovaPlatformPath, modulePath) + ".js",
      // use cordova.js instead of cordova_b.js since we need to have cordova.define for cordova-plugin-wkwebview-engine
      // except additional define member there are no other differences between cordova and cordova_b
      path.join(this.cordovaJSPath, modulePath) + ".js",
      path.join(this.cordovaJSPath, modulePath) + "_b.js",
      path.join(this.cordovaJSCommonPath, modulePath) + "_b.js",
      path.join(this.cordovaJSCommonPath, modulePath) + ".js"
    ];
    return tryPaths.find(p => fs.existsSync(p));
  }
  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap(this.pluginName, factory => {
      factory.hooks.resolve.tapPromise(this.pluginName, async data => {
        if (data.request === "cordova/plugin_list") {
          data.cordova = "plugin_list";
          data.request = path.resolve(__dirname, "plugin_list.js");
        } else if (
          (data.request && data.request.startsWith("cordova/")) ||
          data.request === "cordova"
        ) {
          data.cordova = "lib";
          const modulePath = data.request.startsWith("cordova/")
            ? data.request.substring(8)
            : data.request;
          let cordovaPath = this.getCordovaPath(modulePath);
          if (
            data.request === "cordova/exec" &&
            this.plugins.includes("cordova-plugin-wkwebview-engine") &&
            this.platform === "ios"
          ) {
            const pluginPath = require.resolve(
              path.join("cordova-plugin-wkwebview-engine", "./plugin.xml")
            );
            const pluginDir = path.dirname(pluginPath);
            cordovaPath = path.resolve(
              pluginDir,
              "src/www/ios/ios-wkwebview-exec.js"
            );
          }
          data.request = cordovaPath;
        } else if (
          data.request &&
          !!this.plugins.find(p => data.request.startsWith(p + "."))
        ) {
          // require("cordova-plugin.a"); shit
          const pluginName = data.request.split(".")[0];
          const moduleName = data.request
            .split(".")
            .slice(1)
            .join(".");
          if (pluginName) {
            try {
              const pluginPath = require.resolve(
                path.join(pluginName, "./plugin.xml")
              );
              const files = await processPluginXML(pluginPath, this.platform);
              const filePluginEntry = files.find(f => f.name === moduleName);
              if (filePluginEntry) {
                data.request = filePluginEntry.file;
              }
            } catch (e) {
              // ignore
            }
          }
        }
      });
      factory.hooks.afterResolve.tapPromise(this.pluginName, async data => {
        if (data.cordova === "lib") {
          data.createData.loaders = [
            {
              loader: path.resolve(__dirname, "cordovaLibLoader.js"),
              options: { plugins: this.plugins, platform: this.platform }
            }
          ];
        } else if (data.cordova === "plugin_list") {
          data.createData.loaders = [
            {
              loader: path.resolve(__dirname, "cordovaPluginListLoader.js"),
              options: { plugins: this.plugins, platform: this.platform }
            }
          ];
        }
      });
    });
    // compiler.hooks.compilation.tap(this.pluginName, compilation => {
    //     compilation.hooks.moduleIds.tap(this.pluginName, modules => {
    //         modules.forEach(module => {
    //             if (
    //                 module.rawRequest &&
    //                 (module.rawRequest === "cordova" ||
    //                     module.rawRequest.startsWith("cordova/") ||
    //                     !!this.plugins.find(p => module.rawRequest.startsWith(p + ".")))
    //             ) {
    //                 module.id = module.rawRequest;
    //             }
    //         });
    //     });
    // });
  }
};
