# Vercel Deployment - Manual Steps

Vercel CLI में कुछ authentication issue है। आप manually deploy कर सकते हैं:

## Option 1: Vercel Dashboard से Deploy करें (Easiest!)

1. **https://vercel.com/dashboard** पर जाएं
2. **"Add New Project"** click करें
3. **"Import Git Repository"** या **"Deploy from CLI"** select करें

### If using Git:
- Backend folder को GitHub पर push करें
- Vercel में GitHub repo connect करें
- Auto-deploy होगा

### If using CLI (Manual):
```bash
cd ~/Desktop/"flutter APP ADMIN WEB"/backend

# Fresh login
vercel login

# Deploy
vercel
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **video-call-backend**
- Directory? **./backend** (or just press enter)
- Override settings? **N**

---

## Option 2: Alternative FREE Platforms

### Render.com (Highly Recommended!)

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect GitHub repo (or upload files)
5. Settings:
   - Name: `video-call-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add environment variables
7. Click "Create Web Service"

**FREE tier:** 750 hours/month

---

## Option 3: Hostinger Shared Hosting

अगर आपके पास Hostinger है तो:
- Hostinger में Node.js support check करें
- या subdomain पर static files host करें
- Backend के लिए VPS की जरूरत होगी

---

**Recommendation:** Render.com सबसे आसान है और 100% FREE!

क्या आप Render.com try करना चाहेंगे?
