# Credentials Tracking Template

**IMPORTANT:** This template helps you track what credentials you need. NEVER fill this file with actual credentials. Store actual credentials in `.env` file only.

---

## AWS Credentials

### S3 Bucket
- [ ] Bucket created
- **Bucket Name:** `seeme-images-dev`
- **Region:** `________________`
- **Created Date:** `________________`

### IAM User
- [ ] IAM user created
- **Username:** `seeme-app-dev`
- **Access Key ID:** Stored in `.env`
- **Secret Access Key:** Stored in `.env`
- **Created Date:** `________________`

### CloudFront Distribution
- [ ] Distribution created
- **Distribution ID:** `________________`
- **Domain Name:** `________________.cloudfront.net`
- **Status:** `________________`
- **Created Date:** `________________`

---

## Firebase

### Project
- [ ] Project created
- **Project ID:** `________________`
- **Project Name:** `seeme-app-dev`
- **Created Date:** `________________`

### Service Account
- [ ] Service account key generated
- **Service Account Email:** `________________@________________.iam.gserviceaccount.com`
- **JSON Key Location:** `________________` (outside repo!)
- **Created Date:** `________________`

### Web App Config
- [ ] Web app registered
- **App ID:** Stored in mobile config
- **API Key:** Stored in mobile config

---

## MongoDB Atlas

### Cluster
- [ ] Cluster created
- **Cluster Name:** `seeme-cluster-dev`
- **Region:** `________________`
- **Tier:** M0 (Free)
- **Created Date:** `________________`

### Database User
- [ ] User created
- **Username:** `seeme_app`
- **Password:** Stored in `.env`
- **Created Date:** `________________`

### Connection
- [ ] Connection string configured
- **Connection String:** Stored in `.env`
- **Database Name:** `seeme`

---

## Verification Checklist

### AWS
- [ ] Can upload file to S3 bucket
- [ ] Can access file via CloudFront URL
- [ ] IAM user has correct permissions
- [ ] CORS configured on S3 bucket

### Firebase
- [ ] Can authenticate with service account
- [ ] Email/Password provider enabled
- [ ] Authorized domains configured
- [ ] Web app registered

### MongoDB Atlas
- [ ] Can connect via mongosh
- [ ] IP whitelist configured
- [ ] Database user has read/write permissions
- [ ] Connection string works from application

---

## Security Reminders

- [ ] `.env` file is in `.gitignore`
- [ ] Firebase JSON key is outside repository
- [ ] All passwords are strong and unique
- [ ] AWS root account has MFA enabled
- [ ] MongoDB uses IP whitelist (not 0.0.0.0/0 in prod)
- [ ] All credentials documented in team password manager

---

## Team Access

### Who Has Access
- **AWS Console:** `________________`
- **Firebase Console:** `________________`
- **MongoDB Atlas:** `________________`

### Access Level
- **Admin:** `________________`
- **Developer:** `________________`
- **Read-Only:** `________________`

---

## Rotation Schedule

- [ ] AWS Access Keys: Rotate every 90 days
- [ ] Firebase Service Account: Rotate every 180 days
- [ ] MongoDB Password: Rotate every 90 days
- [ ] JWT Secret: Rotate on security incident

---

**Last Updated:** `________________`
**Updated By:** `________________`
