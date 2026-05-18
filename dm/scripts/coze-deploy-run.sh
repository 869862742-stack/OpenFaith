#!/bin/bash
cd "$(dirname "$0")/.."
export PORT=5000
nohup node server.js > /tmp/server.log 2>&1 &
sleep 2
curl -s -o /dev/null http://localhost:5000/
exit 0
