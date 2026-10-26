# Accessing World Builder from a phone

World Builder can be opened in a phone browser while the computer running the
app and the phone are connected to the same trusted Wi-Fi network.

Start both servers with one command from the repository root:

```bash
./scripts/start-world-builder.sh
```

The script starts the API bound to the computer and the Vite frontend on the
LAN interface. On the computer, open:

```text
http://localhost:5173
```

In the app, open **Phone access** in the sidebar, or tap the Wi-Fi icon in the
mobile header. It lists the addresses Vite detected and labels them as Wi-Fi /
LAN, VPN / CGNAT, or another network. Use a Wi-Fi / LAN address when both
devices are on the same network. A VPN / CGNAT address works only when the phone
is connected to the same VPN or overlay network.

The Vite development server proxies `/api` requests to the API on the same
computer, so the API itself does not need to listen on the network. Do not
forward port 5173 or 8000 through the router or expose this development server
to the public internet; the API can modify world and campaign data and has no
user authentication.

Map authoring remains intended for a desktop browser. Entity, campaign, plot,
event, lore, and scratchpad workflows are the mobile focus.
