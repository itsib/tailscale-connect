# HEADERS="GET /localapi/v0/watch-ipn-bus HTTP/1.1\r\nHost: local-tailscaled.sock\r\n"
#HEADERS="GET /localapi/v0/prefs HTTP/1.1\r\nHost: local-tailscaled.sock\r\n"
HEADERS="GET /localapi/v0/status HTTP/1.1\r\nHost: local-tailscaled.sock\r\n"
#HEADERS="POST /localapi/v0/login-interactive HTTP/1.1\r\nHost: local-tailscaled.sock\r\n"
#HEADERS="POST /localapi/v0/component-debug-logging?component=magicsock&secs=99 HTTP/1.1\r\nHost: local-tailscaled.sock\r\n"

# -N Should stop reading when receive EOF word
# -U Use UNIX Sock connection
# magicsock | sockstats

echo -e "${HEADERS}" \
 | nc -U -N /var/run/tailscale/tailscaled.sock