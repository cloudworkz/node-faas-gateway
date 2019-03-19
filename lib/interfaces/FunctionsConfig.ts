
export interface SingleFunctionConfig {
    name: string;
    method: string;
    gatewayPath: string;
    functionUrl: string;
    authType: string;
    secret: string;
    timeout: number;
}

export interface FunctionsConfig {
    functions: SingleFunctionConfig[]
}
