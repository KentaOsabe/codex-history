#!/usr/bin/env bash
set -euo pipefail

# Remove pre-existing server PID when present
rm -f tmp/pids/server.pid 2>/dev/null || true

exec "$@"
