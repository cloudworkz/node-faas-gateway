"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const assert = require("assert");

const { Gateway } = require("./../dist/index.js");
const config = require("./config.json");
const functions = require("./functions.json");

describe("Integration Test", () => {

    const firstFunction = functions.functions[0];
    let server = null;
    let apifs = null;

    before(async () => {

        const app = express();
        app.use(bodyParser.json());
        app.post("/function/url", (req, res) => {
            if (req.headers["apifs-secret"] !== firstFunction.secret) {
                throw new Error("Bad secret.");
            }
            res.status(205).json({ message: req.body.message + " rick" + req.headers.somextra });
        });

        server = await (new Promise((resolve, reject) => {
            let s = app.listen(18081, (error) => {
                if (error) {
                    return reject(error);
                }
                resolve(s);
            });
        }));
       
        apifs = new Gateway(config, functions);
        await apifs.init().run();
    });

    after(async () => {
        await apifs.close();
        await server.close();
    });

    it("should be able to check health check", (done) => {
        request({
            method: "GET",
            json: true,
            url: `http://localhost:${config.port}/admin/health`
        }, (error, response, body) => {
            try {
                assert.ifError(error);
                assert.equal(response.statusCode, 200);
                assert.equal(body.status, "UP");
                done();
            } catch(error) {
                done(error);
            }
        });
    });

    it("should be able to pipe post request", (done) => {
        request({
            method: "POST",
            json: true,
            url: `http://localhost:${config.port}${firstFunction.gatewayPath}`,
            body: { message: "pickle?" },
            headers: {
                somextra: "!",
            },
        }, (error, response, body) => {
            try {
                assert.ifError(error);
                assert.equal(response.statusCode, 205);
                assert.equal(body.message, "pickle? rick!");
                done();
            } catch(error) {
                done(error);
            }
        });
    });
});
