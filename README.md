# TaskVault

A modern full-stack productivity and task management platform built with React, Supabase, and real-time synchronization.

TaskVault is designed for high-performance personal productivity with features like recurring habits, smart task organization, realtime sync, biometric vault locking, analytics, consistency tracking, and responsive cross-device experience.

---

## 🚀 Live Demo

https://tasks-manager-coral.vercel.app/

---

# Overview

TaskVault is a modern productivity platform focused on speed, security and user experience.

Unlike traditional todo applications, TaskVault combines intelligent task management with real-time cloud synchronization, analytics, recurring habits, biometric vault protection and a polished responsive interface.

Designed with a modular architecture, the project emphasizes scalability, maintainability and production-ready engineering practices.

---

# Features

## Productivity

* Create, edit and delete tasks
* Priority management (Urgent / Normal / Later)
* Deadlines and due-date tracking
* Start dates
* Inline editing
* Archive & restore tasks
* Task completion history
* Powerful search and filters

---

## Smart Task Management

* Automatic tag generation
* Custom tags
* Subtasks
* Resource links
* Recurring daily tasks
* Quick Add (keyboard shortcut)
* Task prioritization

---

## Codeforces Integration

* Automatic Codeforces contest synchronization
* User-controlled contest sync
* Duplicate contest prevention
* Contest reminders with subtasks
* Contest registration links

---

## Analytics

* Productivity dashboard
* Completion statistics
* Consistency heatmap
* Daily productivity insights
* Archive analytics support

---

## Security

* Local Vault PIN
* Biometric authentication
* Protected application routes
* Secure Supabase authentication
* Device-local encrypted vault

---

## Realtime

* Supabase Realtime
* Instant synchronization
* Optimistic UI updates
* Multi-device synchronization

---

## User Experience

* Beautiful responsive UI
* Dark Mode
* Light Mode
* Mobile friendly
* Toast notifications
* Keyboard shortcuts
* Smooth animations
* Lazy loaded pages

---

# Tech Stack

## Frontend

* React
* React Router
* Tailwind CSS
* React Hot Toast

## Backend

* Supabase
* PostgreSQL
* Supabase Authentication
* Supabase Realtime

## Deployment

* Vercel

## Testing

* Vitest
* React Testing Library

---

# Architecture

```bash
src/
│
├── components/
├── pages/
├── hooks/
├── context/
├── layouts/
├── routes/
├── services/
├── tests/
├── utils/
└── ui/
```

Project follows a modular architecture with:

* Custom Hooks
* Context API
* Service Layer
* Protected Routes
* Reusable Components
* Lazy Loading
* Separation of Concerns

---

# Installation

Clone repository

```bash
git clone https://github.com/AtulBoyal/tasks-manager.git
```

Move into frontend

```bash
cd Tasks_Manager/frontend
```

Install dependencies

```bash
npm install
```

Create a `.env` file

```env
REACT_APP_SUPABASE_URL=YOUR_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Run locally

```bash
npm start
```

Build production version

```bash
npm run build
```

Run tests

```bash
npm test
```

---

# Screenshots

* Dashboard
* Dark Mode
* Analytics
* Mobile View
* Archive
* Settings
* Vault Lock
* Focus Mode

```md
![Dashboard](./frontend/public/screenshots/dashboard.png)
![Dark Mode](./frontend/public/screenshots/dark-mode.png)
![Analytics](./frontend/public/screenshots/analytics.png)
![Mobile UI](./frontend/public/screenshots/mobile-ui.png)
![Archive](./frontend/public/screenshots/archive.png)
![Settings](./frontend/public/screenshots/settings.png)
![Vault Lock](./frontend/public/screenshots/vault-lock.png)
![Focus Mode](./frontend/public/screenshots/focus-mode.png)
```

---

# Engineering Highlights

* Modular React architecture
* Production-ready folder structure
* Optimistic UI updates
* Real-time synchronization
* Context-driven state management
* Custom hooks abstraction
* Lazy loading
* Responsive design
* Protected route architecture
* Device-local Vault security
* Automatic recurring task engine
* Codeforces contest synchronization
* Automatic duplicate prevention

---

# Future Roadmap

* AI task prioritization
* AI schedule planning
* Google Calendar integration
* Outlook integration
* Team collaboration
* Shared workspaces
* Kanban board
* Offline mode
* PWA
* Push notifications
* Email reminders
* Drag & Drop support
* Natural language task creation
* AI productivity insights

---

# Security

* Sensitive credentials are excluded using `.gitignore`.
* Authentication is handled through Supabase.
* Vault PIN remains device-local and is never uploaded to the server.
* Environment variables are never committed.

---

# Author

**Atul Boyal**

* IIT Hyderabad
* Computer Science & Engineering
* Full Stack Developer
* Systems Programming Enthusiast
* Competitive Programmer

---

# License

This project is licensed under the MIT License.
