echo -e "GET /localapi/v0/prefs HTTP/1.1\r\nHost: local-tailscaled.sock\r\n" | nc -U -N /var/run/tailscale/tailscaled.sock