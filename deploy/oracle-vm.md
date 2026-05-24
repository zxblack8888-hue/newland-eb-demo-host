# Oracle Cloud VM Deployment

This guide deploys Newland EB Demo Host on an Oracle Cloud Always Free Ubuntu VM.

The demo host needs four public ports:

- HTTP demo: TCP `8080`
- VT100/VT220 terminal demo: TCP `2323`
- TN5250 terminal demo: TCP `25250`
- TN3270 terminal demo: TCP `23270`

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
| TN5250 demo | `0.0.0.0/0` | TCP | `25250` |
| TN3270 demo | `0.0.0.0/0` | TCP | `23270` |

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

The script installs Node.js 20, clones the GitHub repo to `/opt/newland-eb-demo-host`, creates a restricted `newland-eb` service user, installs a systemd service, and opens the VM firewall for ports `8080`, `2323`, `25250`, and `23270`.

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
nc <public-ip> 25250
nc <public-ip> 23270
```

The VT test shows readable ANSI text in `nc`. The TN5250/TN3270 tests emit binary terminal data, so a raw `nc` check only proves the port is reachable; use Newland EB profiles for visual validation.

## 5. Configure Newland EB Profiles

Web profile:

- Type: `WEB`
- Name: `Newland EB Web Demo`
- URL: `http://<public-ip>:8080`

VT profile:

- Type: `VT100/VT220 Telnet`
- Name: `Newland EB VT100/VT220 Demo`
- Host: `<public-ip>`
- Port: `2323`

TN5250 profile:

- Type: `TN5250 Telnet`
- Name: `Newland EB TN5250 Demo`
- Host: `<public-ip>`
- Port: `25250`
- Code page: `CP037`
- Device type: `IBM-3477-FC`

TN3270 profile:

- Type: `TN3270 Telnet`
- Name: `Newland EB TN3270 Demo`
- Host: `<public-ip>`
- Port: `23270`
- Code page: `CP037`
- Device type: `IBM-3278-2`

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
