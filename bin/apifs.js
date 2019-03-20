#!/usr/bin/env node

const program = require("commander");
const pjson = require("./../package.json");

program
    .usage("[options] <config_file ..> <functions_file ..>")
    .version(pjson.version, "-v, --version")
    .option("-p, --port <n>", "HTTP port (optional)")
    .option("-l, --logs", "Log to stdout (optional)")
    .option("-j, --json", "Parses log output as JSON (optional)")
    .parse(process.argv);

let debugBase = null;
if(program.json){

    process.env.DEBUG_HIDE_DATE = "true";
    process.env.DEBUG_COLORS = "false";
    
    debugBase = require("debug"); //overwrite
    const oldDebug = debugBase.log;
    debugBase.log = (arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) => {
        try {
            if(arg1 && typeof arg1 !== "string"){
                arg1 = JSON.stringify(arg1);
            }
        
            if(arg2 && typeof arg2 !== "string"){
                arg2 = JSON.stringify(arg2);
            }
        
            if(arg3 && typeof arg3 !== "string"){
                arg3 = JSON.stringify(arg3);
            }

            if(arg4 && typeof arg4 !== "string"){
                arg4 = JSON.stringify(arg4);
            }

            if(arg5 && typeof arg5 !== "string"){
                arg5 = JSON.stringify(arg5);
            }

            if(arg6 && typeof arg6 !== "string"){
                arg6 = JSON.stringify(arg6);
            }

            if(arg7 && typeof arg7 !== "string"){
                arg7 = JSON.stringify(arg7);
            }

            if(arg8 && typeof arg8 !== "string"){
                arg8 = JSON.stringify(arg8);
            }

            if(arg9 && typeof arg9 !== "string"){
                arg9 = JSON.stringify(arg9);
            }

            if(arg10 && typeof arg10 !== "string"){
                arg10 = JSON.stringify(arg10);
            }
    
            const msgs = [arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10];
            
            oldDebug(JSON.stringify({
                msg: msgs.filter(m => typeof m !== "undefined").join(" ")
            }));
        } catch(error){
            oldDebug("Dropped log message because of error " + error.message);
        }
    }
} else {
    debugBase = require("debug"); //overwrite
}

//require here because of potential debug usage
const path = require("path");
const fs = require("fs");
const debug = debugBase("apifs:bin");

const { Gateway } = require("./../dist/index.js");

let overwritePort = false;
let port = 18018;
if(program.port){
    overwritePort = true;
    port = program.port;
}

if(program.logs){
    debugBase.enable("apifs:*");
} else {
    debugBase.enable("apifs:bin");
}

const defaultOptions = require("./baseConfig.json");
const defaultFunctionOptions = require("./baseFunctions.json");

if(!program.args || !program.args.length){
    debug("No config JSON file path passed, exiting.");
    // return process.exit(1);
    program.args[0] = "./baseConfig.json"; // faked
}

if(program.args.length < 2){
    debug("No functions config JSON file path passed, exiting.");
    // return process.exit(1);
    program.args[1] = "./baseFunctions.json"; // faked
}

let uri = program.args[0];
if(uri && !path.isAbsolute(uri)){
    uri = path.join(__dirname, uri);
}

debug(`Loading conf: ${uri}.`);
let options = {};

try {
    options = require(uri);
    if(!options || typeof options !== "object"){
        throw new Error("Config content is not a JSON object.");
    }
} catch(error){
    debug(`Failed to load JSON config file ${error.message}.`);
    return process.exit(2);
}

options = Object.assign(defaultOptions, options);

let funcUri = program.args[1];
if(funcUri && !path.isAbsolute(funcUri)){
    funcUri = path.join(__dirname, funcUri);
}

debug(`Loading function conf: ${funcUri}.`);
let funcOptions = {};

try {
    funcOptions = require(funcUri);
    if(!funcOptions || typeof funcOptions !== "object"){
        throw new Error("Function config content is not a JSON object.");
    }
} catch(error){
    debug(`Failed to load JSON config file ${error.message}.`);
    return process.exit(2);
}

funcOptions = Object.assign(defaultFunctionOptions, funcOptions);

const readAndDisplayBanner = () => {

    if(program.json){
        debug("Skipping banner..");
        return Promise.resolve();
    }

    return new Promise((resolve, _) => {
        fs.readFile(path.join(__dirname, "./banner.txt"), "utf8", (error, banner) => {
            if(error || !banner){
                debug("Failed to display banner :(.");
            } else {
                //allow console
                console.log(banner);
                //forbid console
            }
            resolve();
        });
    });
};

debug(`apifs in version`, pjson.version);
//overwrite secrets via env variables (easier for kubernetes setups)

Object.keys(process.env)
.map(key => { return {key: key, val: process.env[key]}; })
.forEach(iter => {

    switch(iter.key){

        // place to map env vars here

        default:
        return;
    }

    debug("Env var used for config overwrite", iter.key);
});

// start server

if(overwritePort){
    options.port = port;
} else {
    port = options.port;
}

debug("Starting..");
const gateway = new Gateway(options, funcOptions);
gateway.init().run().then(() => {
    readAndDisplayBanner().then(() => {
        debug(`HTTP interface running @ ${port}.`);
        debug(`apifs is ready to accept connections.`);
    });
}, error => {
    debug(`Exception during start-up: ${error.message}.`);
    process.exit(3);
});