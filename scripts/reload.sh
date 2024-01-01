#!/bin/bash

function execute() {
    local error
    error=$(eval "$1" 2>&1 >/dev/null)

    if [ -n "$error" ]; then
      echo -e "\x1b[1;31m✖ ${2}\x1b[0m"

      if [ -z "$3" ]; then
        echo -e "\n\x1b[0;31m$error\x1b[0m"
        exit 1
      fi
    else
      echo -e "\x1b[1;32m✔\x1b[0m ${2}"
    fi
}

VERSION=$(gnome-shell --version)

echo -e "  \x1b[1;33m${VERSION}\x1b[0m"

execute "gnome-extensions disable tailscale-connect@itsib.github.com" "Disable extension" true

execute "gnome-extensions uninstall tailscale-connect@itsib.github.com" "Uninstall extension" true


execute "npm run clean" "Clean previous build"
execute "npm run build" "Build extension"


execute "gnome-extensions install tailscale-connect@itsib.github.com.zip --force" "Install extension"

execute "killall -3 gnome-shell" "Restart gnome shell"

sleep 6s

export GTK_DEBUG=interactive

execute "gnome-extensions enable tailscale-connect@itsib.github.com" "Enable extension"