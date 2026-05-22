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
- URL: `https://<your-domain>`

VT profile:

- Type: `VT100 Telnet`
- Host: Railway TCP proxy host or local host
- Port: Railway TCP proxy port or `2323`

## Railway

Railway can expose the HTTP app with Public Networking and the VT service with TCP Proxy.

Suggested deployment:

1. Push this directory to GitHub as its own repository.
2. Create a Railway project from the GitHub repo.
3. Expose HTTP port `8080` with Public Networking.
4. Add a TCP Proxy for internal port `2323`.
5. Configure Newland EB host profiles with the generated domains/ports.

## Demo Credentials

The web and VT demos accept any non-empty user and password. This avoids creating security expectations for a public demo server.

## Supported Scenarios

- Login with Enter-to-next-field.
- Outbound picking with task, location, item, quantity confirmation.
- Inbound putaway with pallet and destination scan.
- Inventory lookup with readable result screen.
- Long/small-screen page for zoom and handheld usability validation.
- Error-recovery screen for wrong location.
