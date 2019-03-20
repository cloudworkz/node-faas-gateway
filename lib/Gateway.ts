import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as uuid from "uuid";
import * as Debug from "debug";
const debug = Debug("apifs:gateway");

import { GatewayConfig } from "./interfaces/GatewayConfig";
import { FunctionsConfig } from "./interfaces/FunctionsConfig";
import { Server } from "http";
import * as pjson from "../package.json";
import RequestHandler from "./RequestHandler";
import CircuitClient from "./CircuitClient";
import ConfigValidator from "./ConfigValidator";

export const AUTH_TYPES = {
    NONE: "NONE",
    USER: "USER",
    MACHINE: "MACHINE",
    USER_AND_MACHINE: "USER_AND_MACHINE",
};

export const REQUEST_METHODS = {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    PATCH: "PATCH",
    DELETE: "DELETE",
    HEAD: "HEAD",
    OPTIONS: "OPTIONS",
};

export const CORRELATION_ID_HEADER = "correlation-id";
const WARNING_LOG_MS = 3000;

export const DEFAULT_TIMEOUT = 1500;
export const SECRET_HEADER = "apifs-secret";

export const BAD_PROXY_HEADERS = [
    "content-encoding",
    "content-language",
    "content-length",
    "content-location",
    "content-md5",
    "content-range",
    "connection",
    "date",
    "expect",
    "max-forwards",
    "pragma",
    "proxy-authorization",
    "te",
    "transfer-encoding",
    "via",
];

export default class Gateway {

    public readonly gatewayConfig: GatewayConfig;
    public readonly functionsConfig: FunctionsConfig;
    public readonly circuitClient: CircuitClient;
    private readonly app: express.Express;
    private server: Server | undefined;
    private requestHandler: RequestHandler;

    constructor(gatewayConfig: GatewayConfig, functionsConfig: FunctionsConfig) {

        try {
            new ConfigValidator(gatewayConfig, functionsConfig)
                .validate();
            debug("Configuration is valid.");
        } catch (error) {
            debug("Configuration Invalid:", error.message);
            process.exit(1);
        }

        this.gatewayConfig = gatewayConfig;
        this.functionsConfig = functionsConfig;
        this.app = express();
        this.circuitClient = new CircuitClient(this);
        this.requestHandler = new RequestHandler(this);
    }

    public init(): Gateway {

        debug("Init..");

        if (this.gatewayConfig.enableWCCors) {
            this.app.use(cors());
        }

        // NOTE: this is slow, we should do this ourselves and pipe
        // however, its fast enough for now ;)
        this.app.use(bodyParser.json());

        this.app.use((req: express.Request, res: express.Response, _) => {

            const onEndOfRequest = () => {
                res.removeListener("finish", onEndOfRequest);
                res.removeListener("close", onEndOfRequest);

                const diff = Date.now() - res.locals.startTime;
                debug(`Access-Log: ${req.method} : ${req.url} => ${res.statusCode} after ${diff} ms.`);

                if (diff >= WARNING_LOG_MS) {
                    debug(`Slow request alert: ${req.method} : ${req.url} took ${diff} ms.`);
                }
            };

            if (this.gatewayConfig.enableCorrelationIds &&
                !req.headers[CORRELATION_ID_HEADER]) {
                req.headers[CORRELATION_ID_HEADER] = uuid.v4();
            }

            res.set("x-powered-by", `${pjson.name}/${pjson.version}`);
            res.set("cache-control", "no-cache");

            // crawler check
            if (req.path === "/robots.txt") {
                res.status(200);
                res.set("content-type", "text/plain");
                return res.end("User-agent: *\nDisallow: /");
            }

            // dev browser check
            if (req.path === "/favicon.ico") {
                return res.status(404).end();
            }

            res.on("finish", onEndOfRequest);
            res.on("close", onEndOfRequest);

            res.locals.startTime = Date.now();

            this.requestHandler
                .handle(req, res)
                .catch((error: Error) => {
                    debug("An error occured during request handle:", error.message, error.stack);
                    res.status(500).json({
                        error: error.message,
                    });
                });
        });

        return this;
    }

    public run(): Promise<Gateway> {
        debug("Starting..");
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.gatewayConfig.port, (error: Error) => {

                if (error) {
                    return reject(error);
                }

                debug("Started, listening on port", this.gatewayConfig.port);
                resolve(this);
            });
        });
    }

    public close(): Promise<Gateway> {
        debug("Closing..");
        if (this.server) {
            return new Promise((resolve, reject) => {
                this.server!.close((error: Error | undefined) => {

                    if (error) {
                        return reject(error);
                    }

                    resolve(this);
                });
            });
        } else {
            return Promise.reject(new Error("No server initialised."));
        }
    }
}
