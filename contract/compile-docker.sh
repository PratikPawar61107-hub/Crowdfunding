#!/bin/bash
set -euo pipefail
apt-get update -qq
apt-get install -y -qq curl xz-utils ca-certificates tar gzip unzip bzip2 >/dev/null
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/download/compact-v0.5.1/compact-installer.sh | sh
export PATH="$HOME/.local/bin:$PATH"
compact --version
compact update
compact compile src/crowdfunding.compact ./src/managed/crowdfunding
