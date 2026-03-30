# ⚖️ CourtVista — Legal Professional Discovery Platform

CourtVista is a centralized digital platform designed to help individuals find, compare, and book consultations with verified legal professionals across India.

## ✨ Features

- **Smart Search & Filters** — Search lawyers by practice area, location, experience, rating, languages, gender, and verification status
- **Detailed Lawyer Profiles** — View credentials, case statistics (total/pending), awards, reviews with star distribution
- **Side-by-Side Comparison** — Compare up to 3 lawyers across 10+ attributes
- **Consultation Booking** — Book consultations with preferred date/time slots and confirmation
- **Legal Q&A Forum** — Community-driven questions answered by verified lawyers
- **20+ Mock Profiles** — Realistic lawyer data across all practice areas and Indian cities

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Styling | Vanilla CSS with custom properties (design tokens) |
| Typography | Inter + Playfair Display (Google Fonts) |
| Data | Client-side mock data layer |

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/Azeem10101/CourtVista.git
cd CourtVista

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app runs at **https://wweeknd.github.io/CourtVista/**

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components (Navbar, Footer, SearchBar, etc.)
├── pages/          # Page components (Home, Search, LawyerProfile, Compare, etc.)
├── data/           # Mock lawyer data, Q&A, utility functions
├── App.jsx         # Router + global state
├── index.css       # Design system tokens & global styles
└── main.jsx        # Entry point
```

## 📸 Screenshots

### 🏠 Landing Page
![Landing Page](assets/screenshots/landing.png)
Professional hero section with search, practice area browsing, and featured lawyers.

### 📝 User Registration
![Register Page](assets/screenshots/register.png)
Secure account creation for Users and Lawyers with role-based onboarding.

### 👤 User Dashboard
![User Dashboard](assets/screenshots/user_dashboard.png)
Personalized dashboard for users to manage consultations and legal inquiries.

### ⚖️ Lawyer Dashboard
![Lawyer Dashboard](assets/screenshots/lawyer_dashboard.png)
Comprehensive management panel for lawyers to track cases and clients.

### 🛠️ Admin Panel
![Admin Dashboard](assets/screenshots/admin_dashboard.png)
Administrative overview with system metrics and user management.

### 💬 Messages & Consultation
![Chat Window](assets/screenshots/chat_window.png)
Real-time communication interface for legal consultations.

### ❓ Legal Q&A Forum
![Q&A Page](assets/screenshots/qna_page.png)
Community-driven forum for legal questions answered by verified experts.

## 👤 Author

**Azeem** — Sole author of this project.

## 📄 License

This project is for educational and demonstration purposes.
