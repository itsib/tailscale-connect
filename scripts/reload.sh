#!/bin/bash

gnome-extensions disable tailscale-connect@itsib.github.com

gnome-extensions uninstall tailscale-connect@itsib.github.com

npm run build

gnome-extensions install tailscale-connect@itsib.github.com.zip --force

killall -3 gnome-shell