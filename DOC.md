# Documentation

## Deployment

### Start-Up via bin

```bash
# install globally
npm install -g apifs

apifs -h # display help
apifs -l -j # write log-output in JSON message format (ELK stack)
apifs -p 1993 # change port
apifs -l -j ./baseConfig.json ./baseFunctions.json # pass configs
```

### Start-Up via Script

```typescript
import Gateway from "apifs";
import * as config from "./config.json";
import * as functions from "./functions.json";

const apifs = new Gateway(config, functions);
apifs
    .init()
    .run()
    .catch(console.error);
```

### Configuration File

```json
{
    "port": 18018,
    "enableWCCors": true,
    "enableCorrelationIds": true
}
```

### Functions Configuration File

```json
{
    "functions": [
        {
            "name": "my-example-function",
            "method": "POST",
            "gatewayPath": "/some/path/woop",
            "functionUrl": "http://localhost:18081/function/url",
            "authType": "NONE",
            "secret": "my-secret",
            "timeout": 1500
        }
    ]
}
```

### Misc

#### Health Endpoints

* `GET /admin/healthcheck`
* `GET /admin/health`

#### Ready Endpoints

* `GET /admin/ready`

#### Ignoring SSL Certificates

You can set the `IGNORE_SSL=1` env variable to disable strictSSL and rejection of bad certificates.