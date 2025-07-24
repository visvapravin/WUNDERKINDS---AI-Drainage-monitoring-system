

```markdown


# Ai-DM-website

---

## 📦 Prerequisites

Before you begin, make sure you have the following software installed:

- [Node.js (v18+ recommended)](https://nodejs.org/)
- [npm (comes with Node.js)](https://docs.npmjs.com/   downloading-and-installing-node-js-and-npm)
- [Git](https://git-scm.com/downloads)
- (Optional) [VS Code](https://code.visualstudio.com/) or your preferred code editor

---

![Vite](https://img.shields.io/badge/Vite-4.0+-blueviolet?logo=vite)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-4.0+-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0+-38B2AC?logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-9+-FFCA28?logo=firebase)



## 🌐 Overview

**Ai-DM-website** is a cutting-edge, responsive web application engineered for real-time device monitoring and dynamic climate visualization. Leveraging the power of React, TypeScript, Vite, Tailwind CSS, and Firebase, this platform delivers seamless user experience with interactive animated backgrounds, secure authentication, and instantaneous data updates.


---

## 🚀 Features

- **Device Dashboard**: View and analyze real-time device metrics and statuses.
- **Animated Climate Visuals**: Dynamic, particle-based backgrounds reflecting climate conditions.
- **Secure Login System**: Email and password authentication powered by Firebase.
- **Engaging UI**: Particle animations and modern responsive design.
- **Google Maps Integration**: Device geolocation displayed interactively.
- **Mobile Friendly**: Fully optimized for all screen sizes.
- **Live Updates**: Instant feedback and real-time data visualization throughout the app.


---


## 🛠️ Getting Started


Set up and run Ai-DM-website locally in minutes:


### 1. Clone the Repository


```sh
git clone <your-repo-url>
cd Ai-DM-website
```


### 2. Install Dependencies


```sh
npm install
```


### 3. Configure Environment Variables


1. Copy the example environment file:
   ```sh
   cp .env.example .env
   ```
2. Open `.env` and insert your personal Firebase configuration and relevant API keys.
   - You can find these in your Firebase Console and API provider dashboards.
   - Never commit your real `.env` file to version control.


### 4. Start the Development Server


```sh
npm run dev
```
App will be running at [`http://localhost:5173`](http://localhost:5173) (check your terminal for the exact port).


---

## 🔐 How to Log In


- **Existing Users:** Enter your email and password on the login page.
- **Admin/Project Owner:** Add users in [Firebase Console > Authentication > Users > Add user].
- **Demo Users:** Optionally, provide demo credentials below for quick evaluation.

> **Demo Credentials Example:**
> - Email: `demo@example.com`
> - Password: `demo1234`
> *(Replace/remove as appropriate for your deployment)*

If registration is not enabled, only users added by the admin in Firebase can log in. For public demos, create and share a test account.


---

## ⚠️ Security Notes


- **Never commit real `.env` files.** Use `.env.example` for reference only.
- Keep your API keys and Firebase secrets private.
- For deployments, securely set environment variables via your hosting provider.


---

## 🤝 Contributing


We welcome pull requests and suggestions!

**How to contribute:**
1. Fork this repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request with a concise description.

For ideas or issues, please open a discussion or issue ticket.


---

## 👥 Authors & Contributors


| Name           | GitHub                    | Role              |
| -------------- | ------------------------- | ----------------- |
| visvapravin R  | [@visvapravin](#)         | Core Developer    |
| swashinie R    | [@Swashinie](#)           | Co-Developer      |

*Feel free to add more contributors as your team grows!*


---

## 📄 License

This project is intended for educational and portfolio purposes only.
For production or commercial use, please contact the project owner for permission and licensing details.

---

## 🧩 Troubleshooting & FAQ

**Q: The app doesn't start or shows errors about missing environment variables?**
A: Make sure you have copied `.env.example` to `.env` and filled in all required values.

**Q: How do I add more users for login?**
A: Go to Firebase Console > Authentication > Users > Add user. Only users added here can log in unless registration is enabled.

**Q: Can I use this project for my own portfolio or demo?**
A: Yes! Just follow the setup steps and use your own Firebase/API keys.

---

Elevate device monitoring.  
Visualize climate.  
**Build the future with Ai-DM-website.**
