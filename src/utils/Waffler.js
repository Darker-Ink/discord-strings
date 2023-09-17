const { parse } = require('espree')
const fs = require("fs");
const path = require("path");

function fetchStrings(file) {
    const tree = parse(file, {
        ecmaVersion: 2022,
    });

    const webpackModules =
        tree.body[0].expression.arguments[0].elements[1].properties;

    const allStrings = {};

    function parseStrings(webpackModule) {
        const expression = webpackModule?.value?.body?.body?.[2]?.expression;
        if (!expression) {
            return;
        }

        if (
            expression.right?.callee?.object?.name === "Object" &&
            expression.right?.callee?.property?.name === "freeze" &&
            expression.right?.arguments?.[0].expressions?.[0]?.arguments?.[0]
        ) {
            const properties =
                expression.right.arguments[0].expressions[0].arguments[0].right
                    .properties;
            if (
                properties.some((suspectedLangModule) => {
                    if (
                        suspectedLangModule.key.name === "DISCORD_DESC_SHORT" ||
                        suspectedLangModule.key.name === "DISCORD_NAME"
                    ) {
                        return true;
                    }
                })
            ) {
                properties.forEach((langEntry) => {
                    allStrings[langEntry.key.name] = langEntry.value.raw;
                });
            }

            expression.right.arguments[0].expressions.forEach((callExpr) => {
                if (callExpr.arguments?.[1] && callExpr.arguments?.[2])
                    allStrings[callExpr.arguments[1].value] = callExpr.arguments[2].raw;
            });
        }
    }

    function parseUntranslatedStrings(webpackModule) {
        const expression = webpackModule?.value?.body?.body?.[0]?.expression;
        if (!expression) {
            return;
        }

        if (
            expression.right?.callee?.object?.name === "Object" &&
            expression.right?.callee?.property?.name === "freeze" &&
            expression.right?.arguments[0]?.properties
        ) {
            const properties = expression.right.arguments[0].properties;
            if (
                properties.every(
                    (suspectedLangModule) =>
                        suspectedLangModule.key.type === "Identifier" &&
                        suspectedLangModule.value.type === "Literal"
                )
            ) {
                properties.forEach((langEntry) => {
                    allStrings[langEntry.key.name] = langEntry.value.raw;
                });
            }
        }
    }

    webpackModules.forEach((webpackModule) => {
        parseStrings(webpackModule);
        parseUntranslatedStrings(webpackModule);
    });

    return allStrings;
}

const currentJs = fs.readFileSync(path.join(__dirname, "../saves/current.js"), "utf8");
const strings = fetchStrings(currentJs);

fs.writeFileSync(
    path.join(__dirname, "../saves/Strings.json"),
    JSON.stringify(strings, null, 4)
);
