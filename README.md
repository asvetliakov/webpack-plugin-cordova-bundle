## Wepback cordova bundle plugin

Easy include cordova platform and cordova plugins into your webpack application

### Why do you need it

* You're using custom cordova platform-based workflow (involving building the app from android-studio/xcode)
* You don't use cordova CLI
* You want to NPM/Yarn to take control of your cordova versioning
* You want to build cordova/cordova-plugin sources directly from node_modules
* You want to bundle whole cordova stuff into one file/let webpack control it

### You don't need it if you

* You're using cordova CLI-based workflow and happy with it

## Installation

```
    npm install webpack-cordova-bundle-plugin --save-dev
```
or
```
    yarn add webpack-cordova-bundle-plugin --dev
```

Add to your webpack.config.js:

```js
const { WebpackCordovaBundlePlugin } = require("webpack-cordova-bundle-plugin");

module.exports = {
    entry: [
        "cordova/init", // add new entry
        "./your_app.js",
    ],
    plugins: [
        new WebpackCordovaBundlePlugin({
            // your platform
            platform: "ios",
            // list of plugins to include into bundle
            // you can use something like this to automatically include Object.keys(require("./package.json").cordova.plugins)
            plugins: [
                "cordova-plugin-keyboard",
                ...
            ],
        }),
    ]
}

```

And build your app with webpack normally. The cordova.js and all dependencies will be bundled into your app chunk based on your webpack configuration. You also don't need platform_www/plugins folder with cordova/plugins JS source files.

*Note*:
If you're using platform-centered workflow, you can also delete plugins/cordova native source files, and include them from node_modules directly as references.
Also it's recommended to use ```nohoist``` in yarn workspaces for cordova projects

## Caveats/Issues

1) ```cordova.require('SomePlugin.someFile')``` won't work now in your app. Use standard ```require("SomePlugin.someFile")/import "SomePlugin.someFile"/import "some-cordova-plugin/www/someFile"``` and webpack will do the job for you. Or just use global reference from plugin, i.e. ```window.StatusBar.hide()```

2) Few plugins are bad-written and contains invalid require references, for example ```cordova-plugin-file```, the temporary fix can be by adding the webpack alias, i.e.:
```js
    resolve: {
        alias: {
            "./isChrome$": "cordova-plugin-file/www/browser/isChrome.js",
        }
    }
```