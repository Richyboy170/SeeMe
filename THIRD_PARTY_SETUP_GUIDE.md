# SeeMe Third-Party Services Setup Guide

> **Last Updated:** January 2026
> **App Version:** SeeMe 3.0

This guide walks you through setting up all third-party services required for the SeeMe app. Follow each section in order.

---

## Table of Contents

1. [AWS Setup (S3 & CloudFront)](#1-aws-setup-s3--cloudfront)
2. [Google Cloud Setup (OAuth/Sign-In)](#2-google-cloud-setup-oauthsign-in)
3. [Firebase Setup (FCM & Auth)](#3-firebase-setup-fcm--auth)
4. [Summary Checklist](#summary-checklist)

---

## 1. AWS Setup (S3 & CloudFront)

AWS S3 is used for storing user images (avatars, posts). CloudFront serves as CDN for fast image delivery.

### Step 1.1: Create an AWS Account

1. Go to [https://aws.amazon.com/](https://aws.amazon.com/)
2. Click **"Create an AWS Account"** (top right)
3. Enter your email and choose a root account password
4. Choose **"Personal"** or **"Business"** account type
5. Enter payment information (required, but you get 12 months free tier)
6. Complete phone verification
7. Select the **"Basic Support - Free"** plan
8. Sign in to the AWS Console

### Step 1.2: Create an IAM User (Recommended for Security)

> **Important:** Never use your root account credentials in your app. Create an IAM user instead.

1. In AWS Console, search for **"IAM"** in the top search bar
2. Click **"Users"** in the left sidebar
3. Click **"Create user"**
4. User name: `seeme-backend`
5. Check **"Provide user access to the AWS Management Console"** (optional)
6. Click **"Next"**
7. Select **"Attach policies directly"**
8. Search and check these policies:
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
9. Click **"Next"** → **"Create user"**

### Step 1.3: Generate Access Keys

1. Click on your new user `seeme-backend`
2. Go to **"Security credentials"** tab
3. Scroll to **"Access keys"** section
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **"Next"** → **"Create access key"**
7. **IMPORTANT:** Download the `.csv` file or copy both keys NOW. You cannot see the secret key again!

```
Access key ID: AKIA...............
Secret access key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 1.4: Create an S3 Bucket

1. In AWS Console, search for **"S3"**
2. Click **"Create bucket"**
3. Configure:
   - **Bucket name:** `seeme-media-production` (must be globally unique)
   - **AWS Region:** `us-east-1` (or your preferred region)
   - **Object Ownership:** ACLs disabled (recommended)
   - **Block Public Access:** Uncheck "Block all public access" (we'll use CloudFront)
   - Acknowledge the warning checkbox
4. Click **"Create bucket"**

### Step 1.5: Configure Bucket CORS

1. Click on your bucket name
2. Go to **"Permissions"** tab
3. Scroll to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"** and paste:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

5. Click **"Save changes"**

### Step 1.6: Create CloudFront Distribution

1. In AWS Console, search for **"CloudFront"**
2. Click **"Create distribution"**
3. Configure:
   - **Origin domain:** Select your S3 bucket from dropdown
   - **Origin access:** Select **"Origin access control settings (recommended)"**
   - Click **"Create new OAC"** → Use defaults → **"Create"**
   - **Viewer protocol policy:** Redirect HTTP to HTTPS
   - **Cache policy:** CachingOptimized
   - **Price class:** Use all edge locations (best performance)
4. Click **"Create distribution"**
5. **IMPORTANT:** Copy the policy statement shown and apply it to your S3 bucket:
   - Go back to S3 → Your bucket → Permissions → Bucket policy → Edit
   - Paste the CloudFront policy
   - Save changes

6. Wait for distribution status to change from "Deploying" to "Enabled" (takes 5-15 minutes)
7. Copy your **Distribution domain name** (e.g., `d1234abcd.cloudfront.net`)

### Step 1.7: Update Your .env File

Open `backend/.env` and update these values:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...your-access-key...
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
S3_BUCKET_NAME=seeme-media-production
CLOUDFRONT_DOMAIN=d1234abcd.cloudfront.net
```

---

## 2. Google Cloud Setup (OAuth/Sign-In)

Google Sign-In allows users to authenticate with their Google accounts.

### Step 2.1: Create a Google Cloud Project

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown (top left, next to "Google Cloud")
4. Click **"New Project"**
5. Configure:
   - **Project name:** `SeeMe App`
   - **Organization:** Leave as default
6. Click **"Create"**
7. Wait for project creation, then select it from the dropdown

### Step 2.2: Enable Required APIs

1. Go to **"APIs & Services"** → **"Library"**
2. Search and enable these APIs (click each → "Enable"):
   - **Google Identity Services API**
   - **Google People API**
   - **Google+ API** (may be deprecated, but enable if available)

### Step 2.3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type → **"Create"**
3. Fill in App Information:
   - **App name:** `SeeMe`
   - **User support email:** Your email
   - **App logo:** Upload your app logo (optional)
   - **App domain:** Your website (optional for testing)
   - **Developer contact email:** Your email
4. Click **"Save and Continue"**
5. **Scopes:** Click "Add or Remove Scopes"
   - Select: `email`, `profile`, `openid`
   - Click **"Update"** → **"Save and Continue"**
6. **Test users:** Add your email addresses for testing
7. Click **"Save and Continue"** → **"Back to Dashboard"**

### Step 2.4: Create OAuth Client IDs

You need THREE client IDs: Web, Android, and iOS.

#### Web Client ID:

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Configure:
   - **Application type:** Web application
   - **Name:** `SeeMe Web Client`
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `http://localhost:8081`
     - Your production domain
   - **Authorized redirect URIs:**
     - `http://localhost:3000/auth/google/callback`
     - Your production callback URL
4. Click **"Create"**
5. Copy the **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)

#### Android Client ID:

1. Click **"+ Create Credentials"** → **"OAuth client ID"**
2. Configure:
   - **Application type:** Android
   - **Name:** `SeeMe Android Client`
   - **Package name:** `com.seeme.app` (check your `android/app/build.gradle`)
   - **SHA-1 certificate fingerprint:** Get this by running in your project:

   ```bash
   # For debug keystore:
   cd mobile/android
   ./gradlew signingReport
   ```

   Copy the SHA-1 from the output (looks like: `XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX`)

3. Click **"Create"**
4. Copy the **Client ID**

#### iOS Client ID:

1. Click **"+ Create Credentials"** → **"OAuth client ID"**
2. Configure:
   - **Application type:** iOS
   - **Name:** `SeeMe iOS Client`
   - **Bundle ID:** `com.seeme.app` (check your Xcode project)
3. Click **"Create"**
4. Copy the **Client ID**
5. **Download the plist file** (GoogleService-Info.plist) for iOS configuration

### Step 2.5: Update Your Configuration Files

#### Backend `.env`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID_WEB=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=123456789-yyyyy.apps.googleusercontent.com
GOOGLE_CLIENT_ID_IOS=123456789-zzzzz.apps.googleusercontent.com
```

#### Mobile App `mobile/src/services/googleAuth.ts`:

Replace the placeholder values:

```typescript
const config: ConfigureParams = {
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // Replace with actual Web Client ID
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com', // Replace with actual Android Client ID
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Replace with actual iOS Client ID
  offlineAccess: true,
  scopes: ['profile', 'email'],
};
```

---

## 3. Firebase Setup (FCM & Auth)

Firebase is used for push notifications (FCM) and optionally for authentication.

### Step 3.1: Access Firebase Console

1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Sign in with your Google account
3. You should see your project `seeme-b9e5c` already exists (from previous setup)
4. Click on the project to open it

### Step 3.2: Verify Project Settings

1. Click the **gear icon** (Settings) → **"Project settings"**
2. Note your **Project ID:** `seeme-b9e5c`
3. Go to **"Service accounts"** tab
4. If you need new credentials:
   - Click **"Generate new private key"**
   - Download the JSON file
   - This contains your `private_key` and `client_email`

### Step 3.3: Configure Android App

1. In Firebase Console, go to **"Project settings"**
2. Scroll to **"Your apps"** section
3. If Android app doesn't exist, click **"Add app"** → Android icon
4. Configure:
   - **Android package name:** `com.seeme.app`
   - **App nickname:** `SeeMe Android`
   - **Debug signing certificate SHA-1:** (same as Google OAuth step)
5. Click **"Register app"**
6. Download `google-services.json`
7. Place it in: `mobile/android/app/google-services.json`

### Step 3.4: Configure iOS App

1. In **"Your apps"** section, click **"Add app"** → iOS icon
2. Configure:
   - **Bundle ID:** `com.seeme.app`
   - **App nickname:** `SeeMe iOS`
3. Click **"Register app"**
4. Download `GoogleService-Info.plist`
5. Place it in: `mobile/ios/SeeMe/GoogleService-Info.plist`

### Step 3.5: Enable Cloud Messaging

1. In Firebase Console, go to **"Cloud Messaging"** (left sidebar under "Engage")
2. For iOS, you need to upload APNs certificates:
   - Go to **"Project settings"** → **"Cloud Messaging"** tab
   - Scroll to **"Apple app configuration"**
   - Upload your APNs key or certificate from Apple Developer Console

### Step 3.6: Update Backend `.env`

Your Firebase configuration should look like:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=seeme-b9e5c
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seeme-b9e5c.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=seeme-b9e5c.appspot.com
```

> **Note:** The private key must be in quotes and include the `\n` newline characters.

---

## Summary Checklist

Use this checklist to track your progress:

### AWS Setup
- [ ] Created AWS account
- [ ] Created IAM user `seeme-backend`
- [ ] Generated Access Keys (saved securely)
- [ ] Created S3 bucket
- [ ] Configured CORS on bucket
- [ ] Created CloudFront distribution
- [ ] Applied bucket policy for CloudFront
- [ ] Updated `.env` with AWS credentials

### Google Cloud Setup
- [ ] Created Google Cloud project
- [ ] Enabled required APIs
- [ ] Configured OAuth consent screen
- [ ] Created Web Client ID
- [ ] Created Android Client ID (with SHA-1)
- [ ] Created iOS Client ID
- [ ] Updated backend `.env` with Client IDs
- [ ] Updated `mobile/src/services/googleAuth.ts`

### Firebase Setup
- [ ] Accessed Firebase project `seeme-b9e5c`
- [ ] Downloaded/verified service account credentials
- [ ] Added Android app + downloaded `google-services.json`
- [ ] Added iOS app + downloaded `GoogleService-Info.plist`
- [ ] Configured APNs for iOS push notifications
- [ ] Updated backend `.env` with Firebase credentials

---

## Environment Variables Summary

Here's a complete list of all environment variables you need to configure:

```env
# ============================================
# AWS Configuration
# ============================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=seeme-media-production
CLOUDFRONT_DOMAIN=dxxxxxxxxxx.cloudfront.net

# ============================================
# Google OAuth Configuration
# ============================================
GOOGLE_CLIENT_ID_WEB=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_IOS=xxxxx.apps.googleusercontent.com

# ============================================
# Firebase Configuration
# ============================================
FIREBASE_PROJECT_ID=seeme-b9e5c
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seeme-b9e5c.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=seeme-b9e5c.appspot.com
```

---

## Troubleshooting

### AWS S3 Issues

**Error: "Access Denied"**
- Verify your IAM user has `AmazonS3FullAccess` policy
- Check bucket policy allows your IAM user
- Verify Access Key ID and Secret are correct

**Error: "No such bucket"**
- Verify `S3_BUCKET_NAME` matches exactly (case-sensitive)
- Check you're using the correct AWS region

### Google Sign-In Issues

**Error: "DEVELOPER_ERROR" on Android**
- SHA-1 fingerprint doesn't match
- Run `./gradlew signingReport` and update in Google Console
- Make sure package name matches exactly

**Error: "Invalid client ID"**
- Verify you're using the correct Client ID for each platform
- Web Client ID goes in the `webClientId` field for mobile apps too

### Firebase Issues

**Error: "Failed to parse private key"**
- Make sure private key is wrapped in quotes
- Include the `\n` characters (don't convert to actual newlines)
- Copy the entire key including BEGIN/END markers

---

## Next Steps After Setup

1. **Install AWS SDK in backend:**
   ```bash
   cd backend
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

2. **Test S3 Upload:**
   - Start your backend server
   - Try uploading an image through the app
   - Check S3 bucket for uploaded files

3. **Test Google Sign-In:**
   - Build and run mobile app
   - Try signing in with Google
   - Check backend logs for authentication

4. **Test Push Notifications:**
   - Register device for notifications
   - Send test notification from Firebase Console
   - Verify device receives notification

---

*Created for SeeMe App - January 2026*
