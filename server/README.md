# @oacp/server

Reference HTTP server for OACP — message ingress and agent lookup on a network node.

## Endpoints (Day 8)

| Method | Path                               | Description                                                       |
| ------ | ---------------------------------- | ----------------------------------------------------------------- |
| `GET`  | `/health`                          | Liveness and node status                                          |
| `POST` | `/send-message`                    | Validate and route an OACP message                                |
| `GET`  | `/agent/:id`                       | Look up a registered agent (`summarizer` or `agent://summarizer`) |
| `POST` | `/agents`                          | Register an agent identity on this node                           |
| `GET`  | `/agents`                          | List registered agents (optional `?capability=` filter, Day 10)   |
| `GET`  | `/capabilities/:capability/agents` | Discover agents by capability (Day 10)                            |
| `GET`  | `/agent/:id/messages`              | Pull next mailbox message (remote client, Day 9)                  |

## Quick start

```bash
pnpm --filter @oacp/server build
pnpm --filter @oacp/server start
```

Default listen address: `http://0.0.0.0:3847`

## Environment

| Variable                         | Default   | Description        |
| -------------------------------- | --------- | ------------------ |
| `OACP_SERVER_HOST`               | `0.0.0.0` | Bind host          |
| `OACP_SERVER_PORT`               | `3847`    | Bind port          |
| `OACP_SERVER_REQUEST_TIMEOUT_MS` | `30000`   | Request timeout    |
| `OACP_SERVER_BODY_LIMIT_BYTES`   | `1048576` | Max JSON body size |
| `OACP_SERVER_LOG_LEVEL`          | `info`    | Fastify log level  |
| `OACP_CAPABILITY_ROUTING_MODE`   | `first`   | `first` or `all`   |

## Documentation

See [docs/http-server.md](../docs/http-server.md).
