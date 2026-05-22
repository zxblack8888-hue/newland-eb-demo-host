# Oracle Cloud VM Deployment

This guide deploys Newland EB Demo Host on an Oracle Cloud Always Free Ubuntu VM.

The demo host needs two public ports:

- HTTP demo: TCP `8080`
- VT terminal demo: TCP `2323`

## 1. Create the VM

Recommended minimal setup:

- Image: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
- Shape: Always Free eligible Ampere A1 or AMD Micro shape
- Public IPv4: enabled
- SSH key: add your local public key

Keep the public IP address. Newland EB profiles will use it until a domain is attached.

## 2. Open Oracle Cloud Network Ports

In the VM's VCN security list or Network Security Group, add ingress rules:

| Purpose | Source CIDR | Protocol | Destination Port |
| --- | --- | --- | --- |
| SSH admin | your IP, or `0.0.0.0/0` for temporary setup | TCP | `22` |
| Web demo | `0.0.0.0/0` | TCP | `8080` |
| VT demo | `0.0.0.0/0` | TCP | `2323` |

Do not open all ports. Keep the rule set narrow for customer demo safety.

## 3. Install the Demo Host

SSH into the VM:

```bash
ssh ubuntu@<public-ip>
```

Run:

```bash
curl -fsSL https://raw.githubusercontent.com/zxblack8888-hue/newland-eb-demo-host/main/deploy/install-oracle-ubuntu.sh | sudo bash
```

The script installs Node.js 20, clones the GitHub repo to `/opt/newland-eb-demo-host`, creates a restricted `newland-eb` service user, installs a systemd service, and opens the VM firewall for ports `8080` and `2323`.

## 4. Verify

On the VM:

```bash
systemctl status newland-eb-demo-host
curl http://127.0.0.1:8080/health
```

From your computer:

```bash
curl http://<public-ip>:8080/health
nc <public-ip> 2323
```

The VT test should show the demo login screen. Press `Ctrl+C` to exit `nc`.

## 5. Configure Newland EB Profiles

Web profile:

- Type: `WEB`
- Name: `Newland EB Web Demo`
- URL: `http://<public-ip>:8080`

VT profile:

- Type: `VT100 Telnet`
- Name: `Newland EB VT Demo`
- Host: `<public-ip>`
- Port: `2323`

## 6. Operations

Restart:

```bash
sudo systemctl restart newland-eb-demo-host
```

View logs:

```bash
sudo journalctl -u newland-eb-demo-host -f
```

Update to the latest GitHub version:

```bash
sudo /opt/newland-eb-demo-host/deploy/install-oracle-ubuntu.sh
```

## Notes

- Use a domain later if customers need a stable hostname.
- HTTPS can be added later with Caddy or Nginx, but the first customer PoC can run on `http://<public-ip>:8080`.
- Telnet-style VT demo traffic is plaintext. This is acceptable for a public demo with fake data, but not for real customer credentials.
