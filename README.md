# Newland EB Demo Host

Customer-facing validation host for Newland EB.

It provides:

- HTTP web workflow demo for browser/SAP-like profile validation.
- TCP VT terminal demo for terminal-emulation profile validation.
- Scanner-first flows where barcode input plus Enter advances the workflow.

This is intentionally small and dependency-free so it can be deployed quickly for customer PoCs.

## Run Locally

```bash
npm install
npm start
```

Defaults:

- HTTP: `http://localhost:8080`
- VT TCP: `localhost:2323`

Override ports:

```bash
HTTP_PORT=8080 VT_PORT=2323 npm start
```

## Newland EB Profiles

Web profile:

- Type: `WEB HTTPS/HTTP`
- URL: `http://<public-ip>:8080` or `https://<your-domain>`

VT profile:

- Type: `VT100 Telnet`
- Host: public IP or domain
- Port: `2323`

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

## Demo Credentials

The web and VT demos accept any non-empty user and password. This avoids creating security expectations for a public demo server.

## Supported Scenarios

- Login with Enter-to-next-field.
- Outbound picking with task, location, item, quantity confirmation.
- Inbound putaway with pallet and destination scan.
- Inventory lookup with readable result screen.
- Long/small-screen page for zoom and handheld usability validation.
- Error-recovery screen for wrong location.
