# Railway Deployment Instructions

## 🚀 Deploy Backend to Railway

Railway CLI is installed! Now you need to login and deploy.

### Step 1: Login to Railway

```bash
cd ~/Desktop/"flutter APP ADMIN WEB"/backend

railway login
```

Browser will open. Login with:
- GitHub account (recommended)
- Or Google account
- Or create new Railway account

### Step 2: Initialize Project

After login, run:

```bash
railway init
```

Enter project name: `video-call-backend`

### Step 3: Deploy!

```bash
railway up
```

This will:
- Upload all backend files
- Install dependencies (`npm install`)
- Start the server
- Give you a URL like: `https://video-call-backend-production-xxxx.up.railway.app`

### Step 4: Add Environment Variables

```bash
# Database (Hostinger MySQL)
railway variables set DB_HOST=your-mysql-host.com
railway variables set DB_USER=your_username  
railway variables set DB_PASSWORD=your_password
railway variables set DB_NAME=video_call_app

# JWT Secret
railway variables set JWT_SECRET=your-super-secret-key-123

# Environment
railway variables set NODE_ENV=production
```

### Step 5: Get Your URL

```bash
railway domain
```

This will show your backend URL!

---

## ✅ After Deployment

Update mobile app config with Railway URL:

```dart
// mobile_app/lib/config/app_config.dart
static const String baseUrl = 'https://your-app.railway.app/api';
static const String signalingUrl = 'https://your-app.railway.app';
```

---

**Let me know once you've logged in, and I'll help with the rest!** 🚀
