# Environment Variables Setup

This guide explains how to set up environment variables for the Food Ordering App.

## Quick Setup

### Step 1: Create `.env` file

Create a `.env` file in the root directory of your project (same level as `package.json`):

```bash
# Copy the example file
cp .env.example .env
```

### Step 2: Add your API Base URL

Open the `.env` file and add your API base URL:

**Important:** Use `EXPO_PUBLIC_` prefix for the variable name:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

**Examples:**
- Local development: `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000`
- Local network (for testing on device): `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000` (replace with your computer's IP)
- Production: `EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com`

**Note:** The `EXPO_PUBLIC_` prefix is required for Expo to expose the variable to your app code.

### Step 3: Restart Expo

After creating/updating the `.env` file, restart your Expo development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
# or
expo start
```

## How It Works

### For Web Platform

The app uses `EXPO_PUBLIC_API_BASE_URL` environment variable for web builds. This is automatically available in the browser.

### For iOS/Android

The app uses `app.json` configuration with `extra.apiBaseUrl` which reads from the `.env` file during build time.

## Environment Variable Priority

The app checks for the API base URL in this order:

1. `EXPO_PUBLIC_API_BASE_URL` (from `.env` file)
2. Default fallback: `http://localhost:3000`

## Important Notes

- ⚠️ **Never commit `.env` file to git** - it's already in `.gitignore`
- ✅ The `.env.example` file is safe to commit (it contains no sensitive data)
- 🔄 You need to restart Expo after changing environment variables
- 📱 For testing on physical devices, use your computer's local IP address instead of `localhost`

## Finding Your Local IP Address

### Windows:
```bash
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

### Mac/Linux:
```bash
ifconfig
# Look for "inet" address (usually starts with 192.168.x.x)
```

### Alternative (Mac/Linux):
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

## Troubleshooting

### API calls not working?

1. Check that your `.env` file exists in the root directory
2. Verify the `API_BASE_URL` is correct (no trailing slash)
3. Restart Expo development server
4. Check console logs for the actual API base URL being used
5. For physical devices, ensure you're using your computer's IP, not `localhost`

### Still having issues?

Check the console output - the app logs the API base URL on startup. Look for:
```
API Base URL: http://your-url-here
```
