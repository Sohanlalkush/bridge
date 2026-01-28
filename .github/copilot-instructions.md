# Copilot Instructions – WebRTC to SIP Bridge Server

## Role
You are a **DevOps + VoIP automation agent** with strong expertise in:
- Kamailio
- RTPengine
- SIP (UDP)
- WebRTC (WSS, SRTP)
- Asterisk / FreePBX
- Linux system optimization

Your task is to provision a **production-ready WebRTC gateway** that bridges **browser-based softphones** with an existing **FreePBX server that supports SIP over UDP only**.

---

## Problem Statement

- Browsers require **WebRTC over WSS**
- FreePBX supports **SIP over UDP only**
- Direct browser → FreePBX communication is impossible
- A **bridge server** is required

---

## Target Architecture

```
Browser Softphone (WebRTC, WSS)
            ↓
        Kamailio
            ↓
      FreePBX (SIP UDP)

Media Flow:
Browser ↔ RTPengine ↔ FreePBX
```

All components below must run on **one new server**:
- Kamailio (signaling)
- RTPengine (media)
- Nginx (HTTPS + WSS)
- Browser softphone (static files)

FreePBX runs on a **separate existing server** and must NOT be modified to support WebRTC.

---

## Target Environment

- OS: Ubuntu 22.04 LTS
- VPS RAM: 512 MB – 1 GB
- CPU: 1 vCPU
- No Docker
- Use systemd services only
- Optimize for low memory usage

---

## Configuration Variables (Use Placeholders)

Use placeholders in all configs — do NOT hardcode values.

```
BRIDGE_PUBLIC_IP=<BRIDGE_SERVER_PUBLIC_IP>
FREEPBX_IP=<FREEPBX_SERVER_IP>
DOMAIN_NAME=<DOMAIN_FOR_WSS>
TLS_EMAIL=<LETSENCRYPT_EMAIL>
SIP_PORT=5060
WSS_PORT=443
RTP_START=10000
RTP_END=20000
```

---

## Required Tasks

### 1. System Preparation
- Update system packages
- Enable UFW firewall
- Open required ports:
  - TCP 443 (HTTPS/WSS)
  - UDP 5060 (SIP)
  - UDP 10000–20000 (RTP)
- Disable unnecessary services

---

### 2. Install Dependencies
Install and configure:
- Kamailio (with modules: tls, websocket, nathelper, rtpengine)
- RTPengine (kernel + userspace)
- Nginx
- Certbot (Let’s Encrypt)

---

### 3. Kamailio Configuration
Kamailio must:
- Accept WebSocket Secure (WSS) connections
- Forward SIP signaling to FreePBX via UDP
- Handle REGISTER, INVITE, ACK, BYE, CANCEL
- Authenticate SIP users against FreePBX
- Integrate with RTPengine for media handling
- Properly rewrite SDP for NAT traversal

Use:
- WSS for browsers
- UDP for FreePBX

---

### 4. RTPengine Configuration
RTPengine must:
- Handle SRTP ↔ RTP conversion
- Use public IP awareness
- Expose RTP port range (10000–20000)
- Communicate with Kamailio via control socket
- Be optimized for low memory usage

---

### 5. Nginx Configuration
Nginx must:
- Serve static browser softphone files
- Proxy WSS traffic to Kamailio
- Enforce HTTPS only
- Use Let’s Encrypt TLS certificates
- Use secure TLS ciphers

---

### 6. Browser Softphone
Implement a browser-based softphone using **JsSIP**.

Required features:
- Extension login (username + password)
- Dial pad
- Call / Hangup
- Mute / Unmute
- Audio-only calls
- Codec preference: Opus, fallback to PCMU

Softphone must connect via **WSS only**.

---

### 7. Security Requirements
- WSS only (no WS)
- SIP access limited to FreePBX IP
- Fail2Ban enabled
- TLS certificates from Let’s Encrypt
- No open SIP ports to the public internet

---

## Output Structure

Generate the following files and directories:

```
/docs/architecture.md
/install/install.sh
/kamailio/kamailio.cfg
/rtpengine/rtpengine.conf
/nginx/webrtc.conf
/softphone/index.html
/softphone/app.js
/softphone/config.js
```

Rules:
- Files must be production-ready
- Include clear comments
- Use placeholders for all IPs/domains
- No hardcoded credentials

---

## Validation Checklist (Must Be Included)

Provide steps to verify:
- WSS connection from browser
- Successful SIP REGISTER to FreePBX
- Outbound and inbound calls
- Two-way audio
- NAT traversal correctness
- RTPengine media flow

---

## Explicit Rules

- Do NOT enable WebRTC on FreePBX
- Do NOT use Docker
- Do NOT use GUI installers
- Do NOT invent tools or services
- Prefer simplicity and stability
- Follow SIP and WebRTC best practices

---

## Goal

Deliver a **stable, secure, low-resource WebRTC gateway** that allows browser-based calling through an existing UDP-only FreePBX system.

This setup must be suitable for real-world production use.
