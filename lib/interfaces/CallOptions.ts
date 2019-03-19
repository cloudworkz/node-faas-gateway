export interface CallOptions {
    method: string;
    url: string;
    headers: {[key: string]: string};
    timeout: number;
    body: any;
}
