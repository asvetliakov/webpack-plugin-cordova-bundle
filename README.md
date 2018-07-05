## Wepback cordova bundle plugin

Easy include cordova platform and cordova plugins into your webpack application

### Why do you need it

* You're using custom cordova platform-based workflow (involving building the app from android-studio/xcode)
* You're not using/don't want to use cordova CLI
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

You also need ```cordova-js``` package (contains common cordova js sources, without platform overrides), normally it comes with cordova package, but let's make sure to install it:

```
    npm install cordova-js --save-dev
```
or
```
    yarn add cordova-js --dev
```

And make sure you have installed your cordova platform package (cordova-ios/cordova-android/etc...)

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

1) Buffer polyfill. Cordova sources has ```Buffer.from()``` which is not being used in the cordova apps (i think this is for testing), but webpack automatically includes a polyfill. To disable this behavior, add to your webpack.config.js:
```js
    ...
    node: {
        Buffer: false,
    },
```

2) Cordova.js references PLATFORM_VERSION_BUILD_LABEL for specific platform, just define it by using DefinePlugin:
```js
    plugins: [
        new webpack.DefinePlugin({
            PLATFORM_VERSION_BUILD_LABEL: JSON.stringify(require("cordova-ios/package.json").version), // substitute cordova-ios with your platform package
        }),
    ],

```

3) Few plugins are bad-written and contains invalid require references, for example ```cordova-plugin-file```, the temporary fix can be by adding the webpack alias, i.e.:
```js
    resolve: {
        alias: {
            "./isChrome$": "cordova-plugin-file/www/browser/isChrome.js",
        }
    }
```