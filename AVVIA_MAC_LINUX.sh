#!/bin/sh
cd "$(dirname "$0")" || exit 1
if [ -f .env ]; then
  node --env-file=.env server.mjs
else
  node server.mjs
fi
