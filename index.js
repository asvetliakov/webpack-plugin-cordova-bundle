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
        this.cordovaJSPath = path.join(path.dirname(require.resolve("cordova-js/package.json")), "src");
        this.cordovaJSCommonPath = path.join(this.cordovaJSPath, "common");
        this.cordovaPlatformPath = path.join(path.dirname(require.resolve(`cordova-${this.platform}/package.json`)), "cordova-js-src");
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
            path.join(this.cordovaJSCommonPath, modulePath) + ".js",
        ];
        return tryPaths.find(p => fs.existsSync(p));
    }
    apply(compiler) {
        compiler.resolverFactory.hooks.resolver.tap("normal", this.pluginName, resolver => {
            resolver.hooks.module.tapPromise(this.pluginName, async (request, context) => {
                if (request.request && request.request === "cordova/plugin_list") {
                    const stubPluginListPath = path.resolve(__dirname, "plugin_list.js");
                    const obj = {
                        ...request,
                        request: stubPluginListPath,
                    };
                    return await new Promise((res, rej) => {
                        resolver.doResolve("resolve", obj, "cordova resolved file: " + stubPluginListPath, context, (err, result) => {
                            if (err) {
                                rej(err);
                            } else {
                                res(result);
                            }
                        });
                    })
                }
                if (request.request && (request.request.startsWith("cordova/") || request.request === "cordova")) {
                    const obj = {
                        ...request,
                    };
                    // special handling for wkwebview-engine since we need to redirect cordova/exec to plugin version
                    const modulePath = request.request.startsWith("cordova/") ? request.request.substring(8) : request.request;
                    let cordovaPath = this.getCordovaPath(modulePath);
                    if (!cordovaPath) {
                        return;
                    }
                    if (request.request === "cordova/exec" && this.plugins.includes("cordova-plugin-wkwebview-engine") && this.platform === "ios") {
                        const pluginPath = require.resolve(path.join("cordova-plugin-wkwebview-engine", "./plugin.xml"));
                        const pluginDir = path.dirname(pluginPath);
                        cordovaPath = path.resolve(pluginDir, "src/www/ios/ios-wkwebview-exec.js");
                    }
                    obj.request = cordovaPath;
                    return await new Promise((res, rej) => {
                        resolver.doResolve("resolve", obj, "cordova resolved file: " + cordovaPath, context, (err, result) => {
                            if (err) {
                                rej(err);
                            } else {
                                res(result);
                            }
                        });
                    })
                } else if (request.request && !!this.plugins.find(p => request.request.startsWith(p + "."))) {
                    // require("cordova-plugin.a"); shit
                    const pluginName = request.request.split(".")[0];
                    const moduleName = request.request.split(".").slice(1).join(".");
                    if (pluginName) {
                        try {
                            const pluginPath = require.resolve(path.join(pluginName, "./plugin.xml"));
                            const files = await processPluginXML(pluginPath, this.platform);
                            const filePluginEntry = files.find(f => f.name === moduleName);
                            if (filePluginEntry) {
                                return await new Promise((res, rej) => {
                                    resolver.doResolve(
                                        "resolve",
                                        { ...request, request: filePluginEntry.file },
                                        `cordova plugin module, plugin: ${pluginPath}, module: ${moduleName}, file: ${filePluginEntry}`,
                                        context,
                                        (err, result) => {
                                            if (err) {
                                                rej(err);
                                            } else {
                                                res(result);
                                            }
                                        }
                                    )
                                })
                            }
                        } catch (e) {
                            // ignore
                        }
                    }
                }
                return;
            });
        });
        compiler.hooks.normalModuleFactory.tap(this.pluginName, factory => {
            factory.hooks.afterResolve.tapPromise(this.pluginName, async data => {
                if (data.rawRequest) {
                    if (data.rawRequest === "cordova/plugin_list") {
                        data.loaders = [{
                            loader: path.resolve(__dirname, "cordovaPluginListLoader.js"),
                            options: {
                                plugins: this.plugins,
                                platform: this.platform,
                            }
                        }];
                    } else if (data.rawRequest.startsWith("cordova/") || data.rawRequest === "cordova") {
                        data.loaders = [{
                            loader: path.resolve(__dirname, "cordovaLibLoader.js"),
                        }];
                    }
                }
                return data;
            });
        });
        compiler.hooks.compilation.tap(this.pluginName, compilation => {
            compilation.hooks.moduleIds.tap(this.pluginName, modules => {
                modules.forEach(module => {
                    if (module.rawRequest && (
                        module.rawRequest === "cordova" || module.rawRequest.startsWith("cordova/") ||
                        !!this.plugins.find(p => module.rawRequest.startsWith(p + "."))
                    )) {
                        module.id = module.rawRequest;
                    }
                })
            });
        });
    }
}