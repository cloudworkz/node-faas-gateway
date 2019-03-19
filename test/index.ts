import * as express from "express";
import * as bodyParser from "body-parser";
import * as request from "request";
import * as assert from "assert";
import * as Debug from "debug";
const debug = Debug("apifs:test");

import Gateway from "../index";
import * as config from "./config.json";
import * as functions from "./functions.json";

const firstFunction = functions.functions[0];
const app = express();
app.use(bodyParser.json());
app.post("/function/url", (req, res) => {
    if (req.headers["apifs-secret"] !== firstFunction.secret) {
        throw new Error("Bad secret.");
    }
    res.status(205).json({ message: req.body.message + " rick" + req.headers.somextra });
});
const server = app.listen(18081);

const apifs = new Gateway(config, functions);
apifs
    .init()
    .run()
    .then(() => {
        request({
            method: "POST",
            json: true,
            url: `http://localhost:${config.port}${firstFunction.gatewayPath}`,
            body: { message: "pickle?" },
            headers: {
                somextra: "!",
            },
        }, (error, response, body) => {

            assert.ifError(error);
            assert.equal(response.statusCode, 205);
            assert.equal(body.message, "pickle? rick!");

            debug(body.message);

            server.close();
            apifs.close();
        });
    })
    .catch(debug);
