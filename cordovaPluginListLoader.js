// @ts-check
const path = require("path");
const processPluginXML = require("./utils");


module.exports = async function cordovaPluginsLoader(emptySource) {
    // @ts-ignore
    const callback = this.async();
    /** @type {string[]} */
    // @ts-ignore
    const plugins = this.query.plugins || [];
    // @ts-ignore
    const platform = this.query.platform;
    if (!platform) {
        return callback(new Error("Platform was not specified"));
    }
    if (!plugins.length) {
        return callback(null, emptySource);
    }
    const pluginList = [];
    for (const plugin of plugins) {
        try {
            const pluginPath = require.resolve(path.join(plugin, "./plugin.xml"));
            const files = await processPluginXML(pluginPath, platform);
            if (!files.length) {
                continue;
                // return callback(null, emptySource);
            }
            pluginList.push(...files.map(f => {
                // since it's streated as source and we need require.resolve without quotes, build string manually instead of JSON.stringify()
                const str = `{
                    "id": require.resolve('${plugin}.${f.name}'),
                    "file": require.resolve('${plugin}.${f.name}'),
                    "pluginId": "${plugin}",
                    ${f.clobbers.length ? `"clobbers": ${JSON.stringify(f.clobbers)},` : ""}
                    ${f.merges.length ? `"merges": ${JSON.stringify(f.merges)},` : ""}
                    ${f.runs ? `"runs": true,` : ""}
                }`;
                return str;
            }));
        } catch (e) {
            return callback(e);
        }
    }
    const newSource = `module.exports = [${pluginList.join(",")}]; module.exports.metadata = {};`;
    return callback(null, newSource);
}