#!/bin/bash
cd "$(dirname "$0")/.."
export PORT=5000
exec node server.js
