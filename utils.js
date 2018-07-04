// @ts-check
const path = require("path");
const fs = require("fs");
const xml2js = require("xml2js");

function getJSFiles(obj, pluginDir) {
    if (!obj) {
        return [];
    }
    obj = Array.isArray(obj) ? obj : [obj];
    const resultFiles = [];
    for (const jsFile of obj) {
        if (!jsFile["$"] || !jsFile["$"].src) {
            continue;
        }
        const result = {
            name: jsFile["$"].name || "",
            file: path.join(pluginDir, jsFile["$"].src),
            clobbers: [],
            merges: [],
            runs: false,
        };
        if (jsFile.clobbers && jsFile.clobbers.length) {
            for (const clobber of jsFile.clobbers) {
                if (!clobber["$"] || !clobber["$"].target) {
                    continue;
                }
                result.clobbers.push(clobber["$"].target);
            }
        }
        if (jsFile.merges && jsFile.merges.length) {
            for (const merge of jsFile.merges) {
                if (!merge["$"] || !merge["$"].target) {
                    continue;
                }
                result.merges.push(merge["$"].target);
            }
        }
        if (jsFile.runs) {
            result.runs = true;
        }
        resultFiles.push(result);
    }
    return resultFiles;
}

module.exports = async function processPluginXML(pluginXmlPath, platform) {
    const pluginDir = path.dirname(pluginXmlPath);
    const source = fs.readFileSync(pluginXmlPath, "utf8");
    const parsed = await new Promise((resolve, reject) => {
        xml2js.parseString(source, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
    if (!parsed.plugin) {
        throw new Error(`Plugin xml: ${pluginXmlPath} does not define <plugin> xml tag`);
    }
    let resultFiles = [];
    if (parsed.plugin["js-module"]) {
        resultFiles.push(...getJSFiles(parsed.plugin["js-module"], pluginDir));
    }
    if (parsed.plugin.platform) {
        const platforms = Array.isArray(parsed.plugin.platform) ? parsed.plugin.platform : [parsed.plugin.platform];
        const thisPlatform = platforms.find(p => p["$"] && p["$"].name === platform);
        if (thisPlatform && thisPlatform["js-module"]) {
            resultFiles.push(...getJSFiles(thisPlatform["js-module"], pluginDir));
        }
    }
    // filter out files with same name. may happen with platform overrides??
    resultFiles = resultFiles.filter((v, i, arr) => !arr.find((n, ni) => n.name === v.name && ni > i));
    return resultFiles;
}