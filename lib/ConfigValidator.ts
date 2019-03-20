import { GatewayConfig } from "./interfaces/gatewayConfig";
import { FunctionsConfig, SingleFunctionConfig } from "./interfaces/FunctionsConfig";
import { AUTH_TYPES, REQUEST_METHODS } from "./Gateway";

export default class ConfigValidator {

    private readonly gatewayConfig: GatewayConfig;
    private readonly functionsConfig: FunctionsConfig;

    constructor(gatewayConfig: GatewayConfig, functionsConfig: FunctionsConfig) {
        this.gatewayConfig = gatewayConfig;
        this.functionsConfig = functionsConfig;
    }

    public validate() {

        if (typeof this.gatewayConfig !== "object") {
            throw new Error("GatewayConfig must be an object.");
        }

        if (typeof this.functionsConfig !== "object") {
            throw new Error("FunctionsConfig must be an object.");
        }

        if (!Array.isArray(this.functionsConfig.functions)) {
            throw new Error("FunctionsConfig.functions must be an array.");
        }

        this.functionsConfig.functions.forEach(this.validateSingleFunctionConfig.bind(this));
    }

    private validateSingleFunctionConfig(config: SingleFunctionConfig) {

        if (typeof config !== "object") {
            throw new Error("A single function config must be an object.");
        }

        const allowedAuthTypes = Object.keys(AUTH_TYPES);
        if (allowedAuthTypes.indexOf(config.authType) === -1) {
            throw new Error("Single function config authType not allowed: " + JSON.stringify(config));
        }

        if (!config.functionUrl.startsWith("http")) {
            throw new Error("Single function config functionUrl should be an absolute url: " + JSON.stringify(config));
        }

        const allowedMethods = Object.keys(REQUEST_METHODS);
        if (allowedMethods.indexOf(config.method) === -1) {
            throw new Error("Single function config method not allowed: " + JSON.stringify(config));
        }

        if (!config.gatewayPath.startsWith("/")) {
            throw new Error("Single function config gatewayPath should be an relative url: " + JSON.stringify(config));
        }

        if (!config.secret) {
            throw new Error("Single function config should always have a secret: " + JSON.stringify(config));
        }

        if (typeof config.timeout !== "number") {
            throw new Error("Single function config timeout should be a number: " + JSON.stringify(config));
        }
    }
}
