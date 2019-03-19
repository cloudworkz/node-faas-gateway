import * as express from "express";
import * as Debug from "debug";
const debug = Debug("apifs:handler");

import Gateway, { BAD_PROXY_HEADERS, DEFAULT_TIMEOUT, SECRET_HEADER } from "./Gateway";
import { SingleFunctionConfig } from "./interfaces/FunctionsConfig";
import { CallOptions } from "./interfaces/CallOptions";
import * as pjson from "../package.json";

export default class RequestHandler {

    private readonly gateway: Gateway;
    private readonly functions: SingleFunctionConfig[];

    constructor(gateway: Gateway) {
        this.gateway = gateway;
        this.functions = this.gateway.functionsConfig.functions;
    }

    private findFunctionForRequest(request: express.Request): SingleFunctionConfig | null {

        // NOTE: this is slow and does not allow for custom (express like)
        // route matching.. however its fast enough for now
        for (const func of this.functions) {
            if (func.method === request.method &&
                func.gatewayPath === request.path) {
                    return func;
            }
        }

        return null;
    }

    private pipeHeaders(request: express.Request): { [key: string]: string } {

        const headers: any = request.headers;
        BAD_PROXY_HEADERS.forEach((badProxyHeader) => {
            if (headers[badProxyHeader]) {
                delete headers[badProxyHeader];
            }
        });

        return headers;
    }

    private async handleAuthentication(request: express.Request, authType: string): Promise<boolean> {
        // TODO: handle different authentication types
        return true;
    }

    public async handle(request: express.Request, response: express.Response) {

        debug("Handling request", request.url, request.method);

        const config = this.findFunctionForRequest(request);
        if (!config) {
            response.status(404).json({
                error: "No function is configured for this endpoint",
            });
            return;
        }

        if (!this.handleAuthentication(request, config.authType)) {
            response.status(403).json({
                error: "Provided authentication parameters are not satisfactory",
            });
            return;
        }

        const callOptions: CallOptions = {
            method: config.method,
            url: config.functionUrl,
            timeout: config.timeout || DEFAULT_TIMEOUT,
            headers: this.pipeHeaders(request),
            body: request.body,
        };

        // make sure to overwrite
        callOptions.headers[SECRET_HEADER] = config.secret;

        const {
            status,
            headers,
            body,
        } = await this.gateway.circuitClient.call(callOptions);

        response.status(status);
        response.set(headers);

        // overwrite
        response.set("x-powered-by", `${pjson.name}/${pjson.version}`);

        // NOTE: slow, this should be piped, but fine for now
        response.json(body);
    }
}
