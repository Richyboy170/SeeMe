# Cloud Infrastructure Setup Guide

This guide walks you through setting up all required cloud services for the SeeMe application.

**Estimated Time:** 45-60 minutes

---

## Table of Contents

1. [AWS Account & S3 Setup](#1-aws-account--s3-setup)
2. [CloudFront CDN Configuration](#2-cloudfront-cdn-configuration)
3. [Firebase Authentication Setup](#3-firebase-authentication-setup)
4. [MongoDB Atlas Cluster](#4-mongodb-atlas-cluster)
5. [Environment Configuration](#5-environment-configuration)
6. [Security Checklist](#6-security-checklist)

---

## 1. AWS Account & S3 Setup

### Create AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the registration process (requires credit card)
4. Choose the **Free Tier** option

### Create S3 Bucket

1. **Log into AWS Console**
   - Navigate to [console.aws.amazon.com](https://console.aws.amazon.com)

2. **Open S3 Service**
   - Search for "S3" in the services search bar
   - Click "S3"

3. **Create Bucket**
   - Click "Create bucket"
   - **Bucket name:** `seeme-images-dev` (must be globally unique)
   - **Region:** `us-east-1` (or your preferred region)
   - **Block Public Access:** Keep ALL options checked (CloudFront will handle access)
   - **Bucket Versioning:** Disabled (for now)
   - **Encryption:** Enable with SSE-S3
   - Click "Create bucket"

4. **Configure CORS**
   - Select your bucket
   - Go to "Permissions" tab
   - Scroll to "Cross-origin resource sharing (CORS)"
   - Click "Edit" and paste:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

### Create IAM User

1. **Navigate to IAM**
   - Search for "IAM" in services
   - Click "Users" in sidebar
   - Click "Add users"

2. **User Details**
   - **User name:** `seeme-app-dev`
   - **Access type:** Select "Access key - Programmatic access"
   - Click "Next"

3. **Set Permissions**
   - Select "Attach policies directly"
   - Search for and select: `AmazonS3FullAccess`
   - Click "Next" then "Create user"

4. **Save Credentials**
   - **IMPORTANT:** Download the CSV or copy:
     - Access Key ID
     - Secret Access Key
   - Store these securely (you won't see the secret again)

### Create IAM Policy (Principle of Least Privilege)

For production, replace `AmazonS3FullAccess` with a custom policy:

1. Go to IAM → Policies → Create policy
2. Use JSON editor:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::seeme-images-dev",
                "arn:aws:s3:::seeme-images-dev/*"
            ]
        }
    ]
}
```

3. Name it `SeeMeS3Policy`
4. Attach to the `seeme-app-dev` user

---

## 2. CloudFront CDN Configuration

**Important Notes:**
- These instructions are for the **current AWS Console (2026)**
- If you see different options, you may be in the classic console - switch to the new console
- CloudFront deployment takes 5-15 minutes - be patient after clicking "Create"
- The new interface uses simplified settings with "recommended" options
- AWS will automatically create Origin Access Control (OAC) and update your S3 bucket policy

### Create CloudFront Distribution

1. **Navigate to CloudFront**
   - In AWS Console, search for "CloudFront" in the search bar
   - Click "CloudFront"
   - **Verify you're in the new console:** The page should have a modern AWS design with orange/blue colors

2. **Create Distribution**
   - Click the orange "Create distribution" button or "Create a CloudFront distribution" button
   - You'll see the new distribution creation wizard

3. **Distribution Information**

   **Distribution name (optional):**
   - Enter: `seeme-cdn-dev`

   **Description (optional):**
   - Enter: `SeeMe development image CDN`

   **Distribution type:**
   - Select **"Single website or app"** (recommended for SeeMe)
   - Do NOT select "Multi-tenant architecture" (that's for SaaS platforms with multiple domains)

   - Click **"Next"** or **"Continue"**

4. **Specify Origin**

   **Origin type:**
   - Select **"Amazon S3"** (first option)
   - Description shows: "Deliver static assets like files and images, statically generated websites or single page applications (SPA)."

   **S3 origin:**
   - Click **"Browse S3"** button
   - Select your S3 bucket: `seeme-images-dev`
   - Or manually enter: `seeme-images-dev.s3.us-east-1.amazonaws.com` (use your region)

   **Origin path (optional):**
   - Leave blank

5. **Settings**

   **Allow private S3 bucket access to CloudFront:**
   - Select **"Allow private S3 bucket access to CloudFront - Recommended"** ✓
   - This checkbox option tells AWS to automatically:
     - Create Origin Access Control (OAC)
     - Update your S3 bucket policy to allow CloudFront access
     - Restrict S3 access to only this CloudFront distribution

6. **Origin Settings**

   - Select **"Use recommended origin settings"** (radio button)
   - Do NOT select "Customize origin settings" (unless you need advanced config)
   
   This applies these defaults:
   - Connection attempts: 3
   - Connection timeout: 10 seconds
   - Origin Shield: Disabled (saves costs)

7. **Cache Settings**

   - Select **"Use recommended cache settings tailored to serving S3 content"** (radio button)
   - Do NOT select "Customize cache settings" (unless you need advanced config)
   
   This applies optimized defaults for S3 content delivery.

8. **Web Application Firewall (WAF)**

   You'll see two radio button options:

   - ○ Enable security protections
   - **● Do not enable security protections** ← **SELECT THIS ONE**

   **What to select:**
   - Select **"Do not enable security protections"**
   - This is the free option for development

   **Why "Do not enable" for now:**
   - Saves ~$14/month during development
   - You can enable WAF later when ready for production
   - Not necessary for local testing

   **Note:** If you select "Enable security protections":
   - Costs ~$14 for 10 million requests/month
   - Includes protection against common vulnerabilities
   - Optional checkboxes appear:
     - ☐ Use monitor mode
     - ☐ Protection against Layer 7 DDoS attacks (Recommended)

9. **Additional Settings** (if shown)

   Depending on your AWS interface, you may see these additional settings. If you don't see them, they'll use default values:

   **Price class:**
   - Select "Use only North America and Europe" (to reduce costs in dev)
   - Or select "Use all edge locations" if you need global coverage

   **Alternate domain name (CNAME):**
   - Leave empty (we'll use the CloudFront domain for now)

   **Custom SSL certificate:**
   - Select "Default CloudFront Certificate (*.cloudfront.net)"

   **Standard logging:**
   - Select "Off" (for development)

   **IPv6:**
   - Select "On" (recommended)

10. **Review and Create**

    You'll see a summary page showing:

    **General configuration:**
    - Distribution name: `seeme-cdn-dev`
    - Description: `SeeMe development image CDN`
    - Billing: Pay-as-you-go ($0/month)

    **Origin:**
    - S3 origin: `seeme-images-dev.s3.us-east-1.amazonaws.com`
    - Origin path: -
    - Grant CloudFront access to origin: Yes
    - Enable Origin Shield: No
    - Connection attempts: 3
    - Connection timeout: 10

    **Cache settings:**
    - Default cache settings tailored to serving content from S3

    **Security:**
    - Security protections: None
    - Use monitor mode: No

    **Verify everything looks correct**, then click **"Create distribution"**

11. **Wait for Creation**

    - The distribution will be created in a few seconds
    - You'll be redirected to the CloudFront distributions list
    - **Status** will show "Deploying"
    - **Wait 5-15 minutes** for deployment to complete

12. **Verify S3 Bucket Policy Was Updated**

    Since you selected "Allow private S3 bucket access to CloudFront", AWS should automatically update your bucket policy.

    **Verify it worked:**
    
    - Go to S3 service → `seeme-images-dev` bucket
    - Click "Permissions" tab
    - Scroll to "Bucket policy" section
    - You should see a policy similar to:
```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowCloudFrontServicePrincipal",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudfront.amazonaws.com"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::seeme-images-dev/*",
                "Condition": {
                    "StringEquals": {
                        "AWS:SourceArn": "arn:aws:cloudfront::YOUR-ACCOUNT-ID:distribution/YOUR-DISTRIBUTION-ID"
                    }
                }
            }
        ]
    }
```

    **If the policy wasn't automatically added:**
    - Go back to CloudFront distributions
    - Look for a blue banner saying "The S3 bucket policy needs to be updated"
    - Click "Copy policy" button
    - Go to S3 → `seeme-images-dev` → Permissions → Bucket policy → Edit
    - Paste the policy and click "Save changes"

13. **Note the Distribution Details**

    Go to CloudFront distributions list and find your `seeme-cdn-dev` distribution:

    - **Distribution domain name:** Copy this (e.g., `d111111abcdef8.cloudfront.net`)
    - **Status:** Should show "Deploying" → Wait for it to change to "Enabled"
    - **State:** Should show "Enabled" when ready (takes 5-15 minutes)

    **Save the distribution domain for your `.env` file:**
```env
    CLOUDFRONT_URL=https://d111111abcdef8.cloudfront.net
```

14. **Test the Distribution (After Deployment)**

    Once status shows "Enabled" and state shows "Deployed":

    **Method 1: Using AWS Console**
    - Go to S3 → `seeme-images-dev`
    - Upload a test image (e.g., `test-image.jpg`)
    - Try accessing it via CloudFront URL:
```
      https://d111111abcdef8.cloudfront.net/test-image.jpg
```
    - Should load successfully!

    **Method 2: Using AWS CLI** (if installed)
```bash
    # Upload test image
    aws s3 cp test-image.jpg s3://seeme-images-dev/test-image.jpg
    
    # Test CloudFront URL
    Invoke-WebRequest -Uri "https://d2kdnvrdpp8w48.cloudfront.net/Screenshot%202025-04-29%20111840.png" -Method Head
```

    **Expected result:**
    - Status: `200 OK`
    - Headers should include `X-Cache: Miss from cloudfront` (first request)
    - Subsequent requests: `X-Cache: Hit from cloudfront`

    **If you get 403 Forbidden error:**
    - Verify the S3 bucket policy was updated correctly (step 12)
    - Verify the distribution is fully deployed ("Enabled" status)
    - Check that "Block all public access" is still ON in S3 (CloudFront handles access via OAC)
    - Wait a few more minutes - CloudFront can take up to 15 minutes to fully propagate

---

## Troubleshooting

### Distribution Won't Delete
- Must disable first, then wait for "Disabled" status
- Then you can delete

### 403 Forbidden Errors
1. Verify S3 bucket policy includes CloudFront OAC policy
2. Wait for CloudFront to fully deploy (up to 15 min)
3. Ensure "Block all public access" is enabled in S3
4. Verify the file exists in S3 bucket

### Slow Performance
- CloudFront caches content at edge locations
- First request to each location will be slower (cache miss)
- Subsequent requests will be fast (cache hit)

### Cost Concerns
- Free tier: 1 TB data transfer out per month
- First 10 million requests free per month
- Monitor usage in AWS Billing dashboard

---

## Summary

Your CloudFront distribution is now configured with:
- ✅ Secure access to private S3 bucket via OAC
- ✅ HTTPS-only delivery (HTTP redirects to HTTPS)
- ✅ Optimized caching for S3 content
- ✅ No WAF costs during development ($0/month)
- ✅ Ready to serve images globally with low latency

**Next step:** Update your `.env` file with the CloudFront URL and continue with Firebase Authentication setup!
---

## 3. Firebase Authentication Setup

### Create Firebase Project

1. **Go to Firebase Console**
   - Navigate to [console.firebase.google.com](https://console.firebase.google.com)
   - Sign in with Google account

2. **Create New Project**
   - Click "Add project"
   - **Project name:** `seeme-app-dev`
   - **Google Analytics:** Disable for now (or enable if desired)
   - Click "Create project"
   - Wait for project creation

3. **Enable Authentication**
   - Click "Authentication" in sidebar
   - Click "Get started"
   - Go to "Sign-in method" tab

4. **Enable Sign-in Methods**
   - **Email/Password:** Enable this provider
   - Click "Save"
   - Optional: Enable Google, Facebook, etc. (for Phase 2+)

5. **Configure Settings**
   - Go to "Settings" tab
   - **Authorized domains:** Add your domains (localhost is already there)
     - Add: `localhost:3000`, `localhost:19006` (Expo dev server)

### Generate Service Account Key

1. **Project Settings**
   - Click the gear icon → Project settings
   - Go to "Service accounts" tab

2. **Generate New Private Key**
   - Click "Generate new private key"
   - Confirm the dialog
   - A JSON file will be downloaded

3. **Save the JSON File**
   - **IMPORTANT:** Keep this file secure
   - Place it outside your repository (e.g., `~/secrets/seeme-firebase-dev.json`)
   - Never commit this to git

4. **Extract Credentials**
   From the downloaded JSON, you need:
   - `project_id`
   - `private_key`
   - `client_email`

### Get Firebase Config

1. **Add Web App**
   - In Project settings → General tab
   - Scroll to "Your apps"
   - Click the web icon `</>`
   - **App nickname:** `seeme-web`
   - Click "Register app"

2. **Copy Configuration**
   - Copy the `firebaseConfig` object
   - Save these values for mobile app configuration

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "seeme-app-dev.firebaseapp.com",
  projectId: "seeme-app-dev",
  storageBucket: "seeme-app-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 4. MongoDB Atlas Cluster

### Create MongoDB Atlas Account

1. **Sign Up**
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Click "Try Free"
   - Sign up with email or Google

2. **Create Organization**
   - **Organization name:** `SeeMe`
   - **Cloud Service:** MongoDB Atlas
   - Click "Next"

3. **Create Project**
   - **Project name:** `seeme-dev`
   - Click "Next"
   - Click "Create Project"

### Deploy Free Cluster

1. **Build a Database**
   - Click "Build a Database"
   - Choose **FREE** tier (M0 Sandbox)
   - **Cloud Provider:** AWS
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
   - **Cluster Name:** `seeme-cluster-dev`
   - Click "Create"

2. **Security Quickstart**

   **Authentication:**
   - **Username:** `seeme_app`
   - **Password:** Auto-generate or create strong password
   - **IMPORTANT:** Save these credentials securely
   - Click "Create User"

   **Network Access:**
   - Click "Add My Current IP Address"
   - For development: Also add `0.0.0.0/0` (allows access from anywhere)
     - **CAUTION:** In production, restrict to specific IPs
   - Click "Finish and Close"

3. **Connect to Cluster**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - **Driver:** Node.js
   - **Version:** 4.1 or later
   - Copy the connection string:

```
mongodb+srv://seeme_app:<password>@seeme-cluster-dev.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

4. **Update Connection String**
   - Replace `<password>` with your actual password
   - Add database name: `mongodb+srv://seeme_app:PASSWORD@seeme-cluster-dev.xxxxx.mongodb.net/seeme?retryWrites=true&w=majority`

### Configure Database

1. **Collections (will be created automatically)**
   - `avatar_configs`
   - `marketplace_items`
   - `artist_profiles`

2. **Optional: Pre-create Database**
   - Go to "Collections" tab
   - Click "Add My Own Data"
   - **Database name:** `seeme`
   - **Collection name:** `avatar_configs`
   - Click "Create"

---

## 5. Environment Configuration

### Update .env File

1. **Copy the template file:**
   ```bash
   cp .env.example .env
   ```

2. **Update the following cloud service credentials in `.env`:**

   **AWS S3:**
   - `AWS_REGION` - Your AWS region (e.g., `us-east-1`)
   - `AWS_ACCESS_KEY_ID` - From IAM user creation (Step 1)
   - `AWS_SECRET_ACCESS_KEY` - From IAM user creation (Step 1)
   - `S3_BUCKET` - Your S3 bucket name (e.g., `seeme-images-dev`)
   - `CLOUDFRONT_URL` - Your CloudFront distribution URL (Step 2)

   **Firebase:**
   - `FIREBASE_PROJECT_ID` - From Firebase project settings
   - `FIREBASE_PRIVATE_KEY` - From service account JSON file
   - `FIREBASE_CLIENT_EMAIL` - From service account JSON file

   **MongoDB Atlas:**
   - `MONGODB_URI` - Your MongoDB connection string (Step 4)

   **Security:**
   - `JWT_SECRET` - Generate a secure random string (minimum 32 characters)
     ```bash
     # Generate using Node.js:
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

3. **See `.env.example` for complete configuration options and defaults**

4. **Verify `.env` is in `.gitignore` to prevent committing secrets**

### Verify Configuration

1. **Test AWS Connection**
```bash
# Using AWS CLI (install if needed: pip install awscli)
aws s3 ls s3://seeme-images-dev --profile seeme
```

2. **Test MongoDB Connection**
```bash
# Using mongosh (install if needed)
mongosh "mongodb+srv://seeme_app:PASSWORD@seeme-cluster-dev.xxxxx.mongodb.net/seeme"
```

3. **Test Firebase**
   - Will be tested when backend is implemented

---

## 6. Security Checklist

### Credentials Management

- [ ] All credentials stored in `.env` file
- [ ] `.env` file added to `.gitignore`
- [ ] Firebase JSON key stored outside repository
- [ ] AWS credentials never committed to git
- [ ] Strong passwords used for all services

### AWS Security

- [ ] S3 bucket has public access blocked
- [ ] IAM user has minimal required permissions
- [ ] CloudFront is the only access point to S3
- [ ] MFA enabled on AWS root account (recommended)

### MongoDB Security

- [ ] Strong password for database user
- [ ] IP whitelist configured (not 0.0.0.0/0 in production)
- [ ] Connection string uses SSL/TLS (mongodb+srv://)

### Firebase Security

- [ ] Service account JSON kept secure
- [ ] Only necessary domains authorized
- [ ] Authentication methods properly configured

### General

- [ ] All API keys rotatable
- [ ] Separate dev/staging/prod credentials
- [ ] Team members have individual credentials
- [ ] Audit log monitoring enabled (production)

---

## Cost Estimates (Free Tier)

### AWS
- **S3:** 5 GB storage, 20,000 GET requests, 2,000 PUT requests (free tier)
- **CloudFront:** 50 GB data transfer, 2,000,000 HTTP requests (free tier)
- **After free tier:** ~$0.023/GB for S3, ~$0.085/GB for CloudFront

### Firebase
- **Authentication:** 50,000 MAU (free forever)
- **After limit:** $0.0055 per monthly active user

### MongoDB Atlas
- **M0 Free Tier:** 512 MB storage (free forever)
- **M10 (upgrade):** $57/month (2 GB RAM, 10 GB storage)

**Total Development Cost:** $0/month (within free tiers)

---

## Troubleshooting

### S3 Access Denied
- Verify IAM user has correct permissions
- Check bucket policy allows CloudFront access
- Ensure CORS configuration is correct

### CloudFront 403 Errors
**Cause:** S3 bucket policy not updated or CloudFront not fully deployed

**Solutions:**
1. **Verify Bucket Policy:**
   - Go to S3 → seeme-images-dev → Permissions → Bucket policy
   - Should contain CloudFront service principal policy
   - If missing, go back to CloudFront distribution and click "Copy policy" banner

2. **Check Distribution Status:**
   - CloudFront → Distributions → Your distribution
   - **Status** must be "Enabled"
   - **State** must show "Deployed" (not "Deploying")
   - Initial deployment takes 5-15 minutes

3. **Verify Origin Access Control:**
   - Edit your distribution → Origins tab
   - Click on your S3 origin
   - "Origin access" should show "Origin access control settings"
   - OAC should be listed (e.g., seeme-s3-oac)

4. **Test S3 Access Directly:**
   - Try accessing file directly: `https://seeme-images-dev.s3.amazonaws.com/test.jpg`
   - Should get AccessDenied (this is correct - means public access is blocked)
   - Then try via CloudFront: `https://YOUR-DISTRIBUTION.cloudfront.net/test.jpg`
   - Should work via CloudFront

### CloudFront Options Not Appearing
**Cause:** AWS console UI has changed or browser cache issue

**Solutions:**
1. **Clear browser cache and refresh**
2. **Try a different browser** (Chrome, Firefox, Edge)
3. **Check AWS region** - CloudFront is global but S3 buckets are regional
4. **Verify you're using the new console** (not the classic console)
5. **Look for similar option names:**
   - "Origin access control" (not "Origin access identity" - that's old)
   - "Cache policy and origin request policy" (not "Legacy cache settings")
   - "Do not enable security protections" for WAF (not "Disable WAF")

### Firebase Connection Failed
- Verify service account JSON is valid
- Check project_id matches your project
- Ensure private_key includes full key with newlines

### MongoDB Connection Timeout
- Verify IP is whitelisted (or use 0.0.0.0/0 for dev)
- Check username and password are correct
- Ensure connection string format is correct
- Test with mongosh CLI first

---

## Next Steps

After completing cloud setup:

1. Test all connections
2. Verify environment variables
3. Document any custom configurations
4. Proceed to WORKSTREAM 0.2 (Backend Setup)

---

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)

---

**Security Note:** This guide uses development configurations. For production, implement additional security measures including VPCs, private endpoints, stricter IAM policies, and comprehensive monitoring.
