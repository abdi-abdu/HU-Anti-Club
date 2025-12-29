# Deployment Guide - Haramaya University Anti-Drug Club System

This guide provides step-by-step instructions for deploying the Anti-Drug Club web system to Firebase Hosting.

## Prerequisites

1. **Node.js** (v16 or higher) installed
2. **Firebase CLI** installed globally: `npm install -g firebase-tools`
3. **Firebase account** with billing enabled (for Cloud Functions)
4. **Git** for version control

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `haramaya-anti-drug-club`
4. Enable Google Analytics (optional)
5. Create project

### 1.2 Enable Firebase Services

#### Authentication
1. Go to Authentication > Sign-in method
2. Enable "Email/Password"
3. Add authorized domains if needed

#### Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Start in production mode
4. Choose location (preferably closest to Ethiopia)

#### Storage
1. Go to Storage
2. Click "Get started"
3. Use default security rules (we'll update them)

#### Hosting
1. Go to Hosting
2. Click "Get started"
3. Follow the setup instructions

## Step 2: Local Development Setup

### 2.1 Clone and Install
```bash
git clone <your-repository-url>
cd haramaya-anti-drug-club
npm install
```

### 2.2 Firebase Configuration
1. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click on web app or create one
   - Copy the config object

2. Update `src/services/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 2.3 Environment Variables (Optional)
```bash
cp .env.example .env
# Edit .env with your Firebase config
```

## Step 3: Firebase CLI Setup

### 3.1 Login to Firebase
```bash
firebase login
```

### 3.2 Initialize Firebase Project
```bash
firebase init
```

Select:
- ✅ Firestore: Configure security rules and indexes files
- ✅ Functions: Configure a Cloud Functions directory and its dependencies
- ✅ Hosting: Configure files for Firebase Hosting
- ✅ Storage: Configure a security rules file for Cloud Storage

Configuration:
- **Firestore Rules**: Use existing `firestore.rules`
- **Firestore Indexes**: Use existing `firestore.indexes.json`
- **Functions**: Use existing `functions` directory (if created)
- **Hosting Public Directory**: `dist`
- **Single Page App**: Yes
- **Automatic builds**: No
- **Storage Rules**: Use existing `storage.rules`

## Step 4: Deploy Security Rules

### 4.1 Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 4.2 Deploy Storage Rules
```bash
firebase deploy --only storage
```

### 4.3 Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

## Step 5: Build and Deploy Application

### 5.1 Build for Production
```bash
npm run build
```

### 5.2 Deploy to Hosting
```bash
firebase deploy --only hosting
```

### 5.3 Full Deployment (All Services)
```bash
firebase deploy
```

## Step 6: Post-Deployment Setup

### 6.1 Create Admin User
1. Register a new account through the web interface
2. Go to Firebase Console > Firestore Database
3. Find the user document in the `users` collection
4. Update the document:
   ```javascript
   {
     role: "admin",
     status: "active"
   }
   ```

### 6.2 Test System Functionality
1. **Authentication**: Test login/register
2. **Admin Panel**: Access admin dashboard
3. **User Approval**: Test member approval workflow
4. **Anonymous Messages**: Test help message submission
5. **Content Management**: Create test events and posts

## Step 7: Domain Configuration (Optional)

### 7.1 Custom Domain Setup
1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `antidrugclub.haramaya.edu.et`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning

### 7.2 Update Authentication Domain
1. Go to Authentication > Settings
2. Add your custom domain to authorized domains

## Step 8: Monitoring and Analytics

### 8.1 Enable Firebase Analytics
1. Go to Analytics in Firebase Console
2. Review user engagement and app performance

### 8.2 Set Up Alerts
1. Go to Alerts in Firebase Console
2. Configure alerts for:
   - Authentication failures
   - Database errors
   - Hosting issues

## Environment-Specific Deployments

### Development Environment
```bash
firebase use --add development
firebase deploy --project development
```

### Production Environment
```bash
firebase use --add production
firebase deploy --project production
```

## Troubleshooting

### Common Issues

#### 1. Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. Firebase CLI Issues
```bash
# Update Firebase CLI
npm install -g firebase-tools@latest

# Re-login
firebase logout
firebase login
```

#### 3. Permission Errors
- Ensure you have Owner/Editor role in Firebase project
- Check IAM permissions in Google Cloud Console

#### 4. Firestore Rules Errors
- Test rules in Firebase Console > Firestore > Rules > Simulator
- Check for syntax errors in `firestore.rules`

### Performance Optimization

#### 1. Enable Compression
Firebase Hosting automatically enables gzip compression.

#### 2. Caching Headers
Update `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

#### 3. Bundle Analysis
```bash
npm run build -- --analyze
```

## Security Checklist

- ✅ Firebase Security Rules deployed
- ✅ Authentication configured properly
- ✅ HTTPS enforced (automatic with Firebase Hosting)
- ✅ Environment variables secured
- ✅ Admin access restricted
- ✅ Anonymous message privacy protected

## Backup and Recovery

### 1. Firestore Backup
```bash
gcloud firestore export gs://your-bucket/backup-folder
```

### 2. Code Backup
- Ensure code is pushed to Git repository
- Tag releases for easy rollback

### 3. Configuration Backup
- Export Firebase project settings
- Document all configuration changes

## Maintenance

### Regular Tasks
1. **Weekly**: Review anonymous messages and user registrations
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review Firebase usage and costs
4. **Annually**: Renew SSL certificates (automatic with Firebase)

### Updates
```bash
# Update dependencies
npm update

# Update Firebase CLI
npm install -g firebase-tools@latest

# Deploy updates
npm run build
firebase deploy
```

## Support and Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **React Documentation**: https://reactjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Project Repository**: [Your Git Repository URL]

## Contact

For deployment support:
- **Technical Lead**: [Your Contact Information]
- **System Administrator**: [Admin Contact]
- **Haramaya University IT**: [University IT Contact]

---

**Deployment completed successfully! 🚀**

Your Haramaya University Anti-Drug Club system is now live and ready to serve the campus community.