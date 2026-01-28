# 📱 Web Phone Gateway

A minimal, production-ready WebRTC-to-SIP bridge that connects browser softphones to existing FreePBX/Asterisk servers.

## 🚀 Quick Start

```bash
cd app
npm install
npm start
```

Then open: **http://localhost:8000**

Login with:
- Extension: 112
- Password: admin

## ✨ Features

- ✅ Browser-based softphone (no app needed)
- ✅ Make & receive calls
- ✅ Mute, hold, hangup controls
- ✅ Works with existing FreePBX/Asterisk
- ✅ No Docker, no complex setup
- ✅ Minimal dependencies (1 package)

## 🏗️ How It Works

```
Browser (WebRTC)
    ↓ WebSocket
Node.js Proxy
    ↓ UDP SIP
PBX Server (FreePBX/Asterisk)
```

## ⚙️ Configure

Edit `app/proxy.js`:

```javascript
const PBX_IP = '139.84.175.21';      // Your PBX IP
const PBX_PORT = 65236;               // Your SIP port
```

## 📂 Project Structure

```
/app/
├── README.md        (detailed docs)
├── package.json     (dependencies)
├── index.html       (web UI)
├── app.js          (SIP client)
└── proxy.js        (WebSocket→UDP bridge)
```

## 🔧 Tech Stack

- **Frontend**: HTML5 + CSS3 + JavaScript
- **SIP**: JsSIP 3.x
- **Backend**: Node.js + ws
- **Protocols**: WebSocket → SIP/UDP

## 📋 Requirements

- Node.js >= 14
- Access to SIP/UDP server
- Modern browser

## 📖 Documentation

See [app/README.md](app/README.md) for detailed documentation.

## 📝 License

MIT

## Requirements

- Ubuntu 22.04 LTS+
- 512 MB - 1 GB RAM
- 1 vCPU
- Public IP + domain name
- Existing FreePBX server

## Browser Support

Chrome 50+, Firefox 55+, Safari 14+, Edge 79+

## Services

- Kamailio (SIP signaling)
- RTPengine (media handling)
- Nginx (HTTPS/WSS)
- Fail2Ban (security)
- UFW (firewall)

## Monitoring

```bash
journalctl -u kamailio -f      # SIP logs
journalctl -u rtpengine -f     # Media logs
tail -f /var/log/nginx/webrtc*.log
```

## Testing

See [VALIDATION.md](VALIDATION.md) for comprehensive testing guide including:
- Service health checks
- WebSocket connectivity
- SIP registration
- Call testing
- Audio verification
- Troubleshooting

## Support

- [Kamailio](https://www.kamailio.org/wiki/)
- [RTPengine](https://github.com/sipwise/rtpengine/)
- [JsSIP](https://jssip.net/)

---

**Status**: Production Ready ✅ | **Version**: 1.0