import * as request from "request";
import * as Debug from "debug";
const debug = Debug("apifs:circuit");

import Gateway from "./Gateway";
import { FunctionResponse } from "./interfaces/FunctionResponse";
import { CallOptions } from "./interfaces/CallOptions";

export default class CircuitClient {

    private readonly request: any;
    private readonly gateway: Gateway;
    // TODO: circuit breaker missing

    constructor(gateway: Gateway) {
        this.gateway = gateway;

        if (process.env.IGNORE_SSL) {
            this.request = request.defaults({
                strictSSL: false,
                rejectUnauthorized: false,
             });
        } else {
            this.request = request;
        }
    }

    public call(options: CallOptions): Promise<FunctionResponse> {
        const startT = Date.now();
        (options as any).json = true;
        debug(`Calling ${options.method} ${options.url}`);
        return new Promise((resolve, reject) => {
            this.request(options, (error: Error, response: any, body: any) => {

                if (error) {
                    return reject(error);
                }

                const difference = Date.now() - startT;
                debug(`Resolved call to ${options.method} ${options.url} after ${difference} ms.`);

                resolve({
                    status: response.statusCode,
                    headers: response.headers,
                    body,
                });
            });
        });
    }
}
