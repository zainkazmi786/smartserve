# Network Setup Guide - Access Server from Mobile Devices

## 🚀 Quick Setup

Your server is now configured to listen on all network interfaces (`0.0.0.0`), making it accessible from other devices on your network.

## 📱 Access from Mobile Device (Same WiFi Network)

### Step 1: Find Your Computer's IP Address

Your current local IP address is: **192.168.1.9**

To find it manually:
- **Windows**: Run `ipconfig` in Command Prompt, look for "IPv4 Address"
- **Mac/Linux**: Run `ifconfig` or `ip addr`, look for your WiFi adapter

### Step 2: Start Your Server

```bash
cd Backend
npm start
# or
npm run dev
```

The server will display:
```
🚀 Server is running on port 3000
📡 Socket.io server ready

📍 Access your server from:
   Local:    http://localhost:3000
   Network:  http://192.168.1.9:3000
   External: http://<your-public-ip>:3000 (if port forwarded)

💡 To access from mobile device:
   1. Make sure your mobile device is on the same WiFi network
   2. Use: http://192.168.1.9:3000
   3. Or configure port forwarding for external access
```

### Step 3: Configure Frontend

Update your frontend `.env` file or environment variable:

**For development (same network):**
```env
VITE_API_BASE_URL=http://192.168.1.9:3000/api
```

**For production (if using public IP):**
```env
VITE_API_BASE_URL=http://<your-public-ip>:3000/api
```

### Step 4: Test from Mobile Device

1. Make sure your mobile device is connected to the **same WiFi network** as your computer
2. Open browser on mobile and go to: `http://192.168.1.9:3000/health`
3. You should see: `{"status":"OK","message":"Server is running"}`

---

## 🌐 Access from Internet (External Access)

### Option 1: Port Forwarding (Recommended for Testing)

1. **Find your router's admin panel** (usually `192.168.1.1` or `192.168.0.1`)
2. **Login** to your router
3. **Navigate to Port Forwarding** section
4. **Add a new rule:**
   - External Port: `3000` (or any port you prefer)
   - Internal IP: `192.168.1.9` (your computer's IP)
   - Internal Port: `3000`
   - Protocol: `TCP`
5. **Find your public IP:**
   - Visit: https://whatismyipaddress.com
   - Or run: `curl ifconfig.me` (if you have curl)
6. **Access from anywhere:**
   - Use: `http://<your-public-ip>:3000`

### Option 2: Use ngrok (Quick Testing)

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

This will give you a public URL like: `https://abc123.ngrok.io`

**Note:** ngrok URLs change on free tier, use for testing only.

### Option 3: Cloud Deployment (Production)

For production, deploy to:
- **Heroku**
- **AWS EC2**
- **DigitalOcean**
- **Railway**
- **Render**

---

## 🔥 Firewall Configuration

### Windows Firewall

1. Open **Windows Defender Firewall**
2. Click **Advanced Settings**
3. Click **Inbound Rules** → **New Rule**
4. Select **Port** → **Next**
5. Select **TCP** → Enter port **3000** → **Next**
6. Select **Allow the connection** → **Next**
7. Check all profiles → **Next**
8. Name it "Smart Cafe Server" → **Finish**

### Mac Firewall

1. System Preferences → **Security & Privacy** → **Firewall**
2. Click **Firewall Options**
3. Click **+** and add Node.js or allow incoming connections for port 3000

### Linux (UFW)

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `Backend` folder:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/smartcafe

# JWT Secret (change this!)
JWT_SECRET=your-secret-key-here

# Environment
NODE_ENV=development
```

---

## 🧪 Testing

### Test from Same Network:
```bash
# From your computer
curl http://192.168.1.9:3000/health

# From mobile device browser
http://192.168.1.9:3000/health
```

### Test from Internet:
```bash
# Replace with your public IP
curl http://<your-public-ip>:3000/health
```

---

## ⚠️ Security Notes

1. **Development Only**: Exposing your server to the internet without proper security is risky
2. **Use HTTPS**: For production, use HTTPS (Let's Encrypt, Cloudflare, etc.)
3. **Authentication**: Make sure all sensitive endpoints require authentication
4. **Rate Limiting**: Consider adding rate limiting for public endpoints
5. **CORS**: Current CORS is set to `*` (all origins). Restrict in production:
   ```javascript
   app.use(cors({
     origin: ['http://your-frontend-domain.com'],
     credentials: true
   }));
   ```

---

## 🐛 Troubleshooting

### Can't access from mobile device:

1. **Check WiFi**: Ensure both devices are on the same network
2. **Check Firewall**: Windows/Mac firewall might be blocking
3. **Check IP**: Your computer's IP might have changed (DHCP)
4. **Check Port**: Make sure port 3000 is not blocked
5. **Try ping**: From mobile, try to ping your computer's IP

### Connection refused:

- Server might not be running
- Firewall blocking the port
- Wrong IP address

### Timeout:

- Router might be blocking
- Need port forwarding for external access
- ISP might be blocking incoming connections

---

## 📝 Quick Reference

- **Local Access**: `http://localhost:3000`
- **Network Access**: `http://192.168.1.9:3000` (your current IP)
- **Public Access**: `http://<your-public-ip>:3000` (after port forwarding)
- **Health Check**: `http://<ip>:3000/health`

---

**Need Help?** Check server logs for connection errors and ensure all services (MongoDB, etc.) are running.
