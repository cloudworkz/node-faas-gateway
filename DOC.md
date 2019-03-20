# Documentation

## Deployment

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

### Start-Up Script

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