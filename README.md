# Haramaya University Anti-Drug Club Web System

A complete, secure, and scalable web-based system for Haramaya University Anti-Drug Club, built with React.js and Firebase. This system supports student membership management, awareness campaigns, events, educational content, and anonymous student support.

## 🎯 Project Overview

This system is designed for academic and real institutional use at Haramaya University, following professional software engineering standards. It provides a comprehensive platform for the Anti-Drug Club to manage members, organize events, share educational content, and provide anonymous support to students.

## 🧱 Technology Stack

### Frontend
- **React.js** (with Vite)
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **React Hot Toast** for notifications

### Backend (Serverless)
- **Firebase Authentication** - User management and security
- **Cloud Firestore** - NoSQL database
- **Firebase Cloud Functions** - Server-side logic
- **Firebase Security Rules** - Data access control
- **Firebase Storage** - File uploads
- **Firebase Hosting** - Web hosting

## 👥 User Roles & Access Control

### Roles
- **Admin** - Anti-Drug Club President, Secretary, Coordinators
- **Student** - Haramaya University students
- **Counselor** (optional) - Student support officers

### Permissions
- **Admins**: Manage members, events, posts, resources, and anonymous messages
- **Students**: Register, view content, manage their own profile
- **Anonymous Users**: Submit help requests without logging in

## 🔐 Authentication & Security

### Authentication Requirements
- Email & password authentication
- Student registration includes:
  - Full name
  - University ID (format: 0454/16)
  - College and Department
  - Year of study
  - Email & phone number
- New students have "pending" status
- Admin approval required for full access

### Security Features
- Firebase Security Rules for data protection
- Role-based access control
- Anonymous message system (write-only)
- Input validation and sanitization
- Secure file upload handling

## 🗄️ Database Design (Cloud Firestore)

### Collections Structure

#### users
```javascript
{
  uid: string,
  fullName: string,
  universityId: string, // e.g., "0454/16"
  college: string,
  department: string,
  yearOfStudy: string,
  email: string,
  phone: string,
  role: "admin" | "student",
  status: "pending" | "active" | "rejected",
  createdAt: timestamp
}
```

#### events
```javascript
{
  title: string,
  description: string,
  date: timestamp,
  location: string, // e.g., "Hall 42, Main Gate"
  imageUrl?: string,
  createdBy: string, // admin uid
  createdAt: timestamp
}
```

#### posts
```javascript
{
  title: string,
  content: string,
  category: "Drug Awareness" | "Health" | "News" | "Prevention" | "Recovery",
  authorId: string,
  createdAt: timestamp
}
```

#### resources
```javascript
{
  title: string,
  fileUrl: string, // PDF, PPT, etc.
  description: string,
  uploadedBy: string,
  createdAt: timestamp
}
```

#### anonymousMessages
```javascript
{
  subject: string,
  message: string,
  createdAt: timestamp,
  isReplied: boolean
}
```

## 🎨 UI/UX Features

- **Mobile-first design** - Optimized for student phone usage
- **Clean, professional academic design**
- **Light and fast** - Optimized for low-bandwidth environments
- **Calm colors** (green/blue) aligned with health & education
- **Responsive layout** - Works on all device sizes
- **Accessibility compliant** - WCAG guidelines followed

## 📂 Project Structure

```
HU-Anti-Club/
├── README.md
├── DEPLOYMENT.md
├── .gitignore
├── frontend/                    # React + Vite application
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vercel.json
│   ├── .env.example
│   └── src/
│       ├── components/
│       │   ├── Layout/
│       │   │   ├── Navbar.jsx
│       │   │   └── Footer.jsx
│       │   └── ProtectedRoute.jsx
│       ├── pages/
│       │   ├── Auth/
│       │   │   ├── Login.jsx
│       │   │   └── Register.jsx
│       │   ├── Admin/
│       │   │   └── Dashboard.jsx
│       │   ├── Home.jsx
│       │   ├── About.jsx
│       │   ├── Events.jsx
│       │   ├── Blog.jsx
│       │   ├── Resources.jsx
│       │   ├── Help.jsx
│       │   └── Profile.jsx
│       ├── services/
│       │   └── firebase.js
│       ├── context/
│       │   └── AuthContext.jsx
│       └── App.jsx
└── backend/                     # Firebase config & serverless backend
    ├── firebase.json
    ├── firestore.rules
    ├── firestore.indexes.json
    ├── storage.rules
    └── functions/               # Cloud Functions
        ├── package.json
        └── index.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hu-anti-drug-club
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create Firestore database
   - Enable Storage
   - Copy your Firebase config

4. **Configure Firebase**
   - Update `frontend/src/services/firebase.js` with your Firebase configuration:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

5. **Deploy Firebase Security Rules** (from the `backend/` directory)
   ```bash
   cd ../backend
   firebase deploy --only firestore:rules
   firebase deploy --only storage
   ```

6. **Start development server** (from the `frontend/` directory)
   ```bash
   cd ../frontend
   npm run dev
   ```

### Firebase Configuration Steps

1. **Authentication Setup**
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable "Email/Password"
   - Configure authorized domains

2. **Firestore Setup**
   - Create database in production mode
   - Deploy the provided security rules from `firestore.rules`
   - Import the indexes from `firestore.indexes.json`

3. **Storage Setup**
   - Enable Firebase Storage
   - Deploy storage rules from `storage.rules`

4. **Hosting Setup** (for deployment)
   ```bash
   cd frontend
   npm run build
   cd ../backend
   firebase deploy --only hosting
   ```

## 🔐 Firebase Security Rules

The system includes comprehensive security rules:

- **Public access**: Events and posts (read-only)
- **Authenticated access**: Resources (active members only)
- **Admin access**: User management, content creation/editing
- **Anonymous access**: Help message submission (write-only)
- **User access**: Own profile management

## 📱 Key Features

### For Students
- **Registration & Profile Management** - Complete student information system
- **Event Discovery** - Browse upcoming awareness campaigns and events
- **Educational Content** - Access blog articles and resources
- **Anonymous Help** - Submit confidential help requests
- **Resource Library** - Download educational materials (members only)

### For Administrators
- **Member Management** - Approve/reject student registrations
- **Content Management** - Create events, blog posts, and resources
- **Analytics Dashboard** - View membership and engagement statistics
- **Anonymous Support** - Manage and respond to help requests
- **File Management** - Upload and organize educational resources

### Anonymous Support System
- **Complete Anonymity** - No personal information collected
- **Secure Messaging** - Encrypted communication channel
- **Professional Response** - Trained counselors provide guidance
- **Resource Referral** - Direct connection to campus support services

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Quality Standards
- Clean and reusable components
- Proper error handling
- Async/await usage
- Meaningful comments
- React and Firebase best practices
- No hard-coded secrets

## 🚀 Deployment

### Firebase Hosting
1. **Build the project** (from the `frontend/` directory)
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Firebase** (from the `backend/` directory)
   ```bash
   cd ../backend
   firebase deploy
   ```

### Environment Variables
Create a `.env` file in the `frontend/` directory for environment-specific configurations:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

## 📊 Admin Features

### Dashboard Analytics
- Total registered members
- Pending approval count
- Event and post statistics
- Anonymous message tracking

### Member Management
- View all registered students
- Approve/reject membership applications
- Manage user roles and permissions
- Export member lists

### Content Management
- Create and edit events
- Publish blog articles
- Upload educational resources
- Manage anonymous help requests

## 🔒 Privacy & Security

### Data Protection
- All personal data encrypted in transit and at rest
- Anonymous messaging system with no tracking
- GDPR-compliant data handling
- Regular security audits and updates

### Anonymous Support
- No IP address logging for anonymous messages
- Secure message encryption
- Professional counselor response system
- Crisis intervention protocols

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For technical support or questions about the system:

- **Email**: antidrugclub@haramaya.edu.et
- **Phone**: +251-25-553-0325
- **Campus**: Haramaya University, Dire Dawa, Ethiopia

## 🎓 Academic Use

This system is designed for academic evaluation and real institutional use at Haramaya University. It demonstrates:

- Modern web development practices
- Secure authentication and authorization
- Scalable serverless architecture
- Professional UI/UX design
- Comprehensive documentation
- Real-world problem solving

## 🌟 Acknowledgments

- Haramaya University Administration
- Anti-Drug Club Leadership
- Student Affairs Office
- Campus Health Services
- All contributing students and faculty

---

**Built with ❤️ for Haramaya University Anti-Drug Club**

*Creating a healthier, drug-free campus community through technology and education.*
