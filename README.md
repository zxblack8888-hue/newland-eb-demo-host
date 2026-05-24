# Newland EB Demo Host

Customer-facing validation host for Newland EB.

It provides:

- HTTP web workflow demo for browser/SAP-like profile validation.
- TCP VT terminal demo for terminal-emulation profile validation.
- TCP TN5250 and TN3270 demo screens for host-profile validation.
- Scanner-first flows where barcode input plus Enter advances the workflow.

This is intentionally small and dependency-free so it can be deployed quickly for customer PoCs.

## Run Locally

```bash
npm install
npm start
```

Defaults:

- HTTP: `http://localhost:8080`
- VT100/VT220 TCP: `localhost:2323`
- TN5250 TCP: `localhost:25250`
- TN3270 TCP: `localhost:23270`

Override ports:

```bash
HTTP_PORT=8080 VT_PORT=2323 TN5250_PORT=25250 TN3270_PORT=23270 npm start
```

## Newland EB Profiles

Profile JSON endpoint:

- `http://<host>:8080/host-profiles.json`

Web profile:

- Type: `WEB HTTPS/HTTP`
- URL: `http://<public-ip>:8080` or `https://<your-domain>`

VT profile:

- Type: `VT100/VT220 Telnet`
- Host: public IP or domain
- Port: `2323`

TN5250 profile:

- Type: `TN5250 Telnet`
- Host: public IP or domain
- Port: `25250`
- Code page: `CP037`
- Device type: `IBM-3477-FC`

TN3270 profile:

- Type: `TN3270 Telnet`
- Host: public IP or domain
- Port: `23270`
- Code page: `CP037`
- Device type: `IBM-3278-2`

SSH and TN5250 TLS templates are exposed by `/host-profiles.json`, but this Node demo host does not run a production SSH daemon or certificate-backed raw TLS service by itself.

## Oracle Cloud VM

Oracle Cloud Always Free is the preferred deployment target for the full demo because it can expose both HTTP and raw TCP for VT/Telnet testing.

See [deploy/oracle-vm.md](deploy/oracle-vm.md).

Quick install on an Ubuntu VM:

```bash
curl -fsSL https://raw.githubusercontent.com/zxblack8888-hue/newland-eb-demo-host/main/deploy/install-oracle-ubuntu.sh | sudo bash
```

Open these ports in both Oracle Cloud networking and the VM firewall:

- TCP `8080` for the web demo
- TCP `2323` for the VT terminal demo
- TCP `25250` for the TN5250 terminal demo
- TCP `23270` for the TN3270 terminal demo

## Demo Credentials

The web and VT demos accept any non-empty user and password. This avoids creating security expectations for a public demo server.

## Supported Scenarios

- Login with Enter-to-next-field.
- Outbound picking with task, location, item, quantity confirmation.
- Inbound putaway with pallet and destination scan.
- Inventory lookup with readable result screen.
- Long/small-screen page for zoom and handheld usability validation.
- Error-recovery screen for wrong location.
