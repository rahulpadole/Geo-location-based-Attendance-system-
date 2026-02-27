# 📍 Geo Attendance System

A comprehensive location-based attendance tracking system for educational institutions.

## 🚀 Features

### For Teachers
- ✅ Mark attendance with GPS verification
- ✅ Take selfie during check-in
- ✅ View attendance history
- ✅ Request leave
- ✅ Profile management

### For Administrators
- ✅ Real-time dashboard with statistics
- ✅ Manage teachers and admins
- ✅ Configure college location & radius
- ✅ Set timetable with late thresholds
- ✅ Manage holidays & special events
- ✅ Export attendance data (PDF/Excel)
- ✅ View audit logs
- ✅ Bulk operations

## 🛠️ Technology Stack

- **Frontend**: React 19, React Router 7
- **UI Components**: Material-UI (MUI)
- **State Management**: TanStack Query
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Maps/Location**: Geolocation API
- **Export**: jsPDF, XLSX
- **Styling**: CSS-in-JS

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account
- Git

## 🔧 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/geo-attendance.git
cd geo-attendance


Install dependencies

bash
npm install
Create environment file

bash
cp .env.example .env
Edit .env with your Firebase credentials.

Start development server

bash
npm start