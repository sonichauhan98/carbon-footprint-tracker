🌱 CARBON FOOTPRINT TRACKER
A full-stack web application that allows users to calculate, track, and analyze their daily carbon footprint across commuting 🚗, energy usage ⚡, and dietary habits 🍔. The app provides a responsive frontend user interface alongside an automated analytics backend engine that generates personalized environmental insights 📈.

🛠️ TECH STACK AND ARCHITECTURE
The application is split into two cleanly separated services: 

Frontend (React/Vite) 💻 ---> HTTP POST ✉️ ---> Backend (FastAPI/Uvicorn) 🐍
Port: 5173 (Local)       <--- JSON Response 📄 <--- Port: 10000 (Render)

💻 Frontend: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts (for data visualization 📊).

🐍 Backend: Python 3.14+, FastAPI, Uvicorn, Pydantic (for request data validation ✅).

☁️ Deployment: Render (Web Service for backend, Static Site for frontend).

✨ CORE FEATURES
🚗 Carbon Footprint Estimation: Real-time data processing across vehicle metrics, public transit, flights ✈️, electricity consumption, and dietary choices.

💡 Insights Engine: Dynamically analyzes calculated scores against regional benchmarks to deliver actionable sustainability feedback.

📊 Data Visualization: Interactive breakdown charts mapping historical trends and resource consumption metrics side-by-side.

📁 PROJECT STRUCTURE

Carbon_Footprint_Tracker/

├── backend/                  # 🐍 Python FastAPI Source

│   └── app/

│       ├── main.py           # 🚀 Application Entrypoint and API Routers

│       ├── schemas.py        # ✅ Pydantic Input/Output Validations

│       └── carbon/

│           └── factors.py    # 🧮 Carbon Conversion Math Constants

├── frontend/                 # 💻 React TypeScript Source

│   ├── src/


│   │   ├── api/

│   │   │   ├── carbon.ts     # 🔗 Calculations API Client

│   │   │   └── insights.ts   # 🔗 Insights API Client

│   │   ├── App.tsx           # 🎛️ Main UI Dashboard Core

│   │   └── components/       # 🧱 Forms, Charts, and Layout Panels

│   ├── package.json

│   └── vite.config.ts

└── README.md                 # 📖 Project Documentation

🔌 API ENDPOINTS
The backend exposes a fully documented interactive OpenAPI layer at /docs 📑.
🟢 GET /api/health
Description: Returns {"status": "ok"} to verify runtime stability.

🔵 POST /api/calculate
Description: Processes raw user metrics and converts them to annual kg CO2e.

🔵 POST /api/insights
Description: Generates tailored feedback based on calculated carbon outputs.

⚙️ INSTALLATION AND LOCAL SETUP
1. 🐍 Backend Setup
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

2. 💻 Frontend Setup
cd frontend
npm install
npm run dev

Open your browser to http://localhost:5173 to test locally 🌍.

🚀 DEPLOYMENT NOTES (Render)
1. 🐍 Backend Configuration
Environment: Python
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port 10000

2. 💻 Frontend Configuration
Environment: Static Site
Build Command: npm install && npm run build
Publish Directory: dist

⚠️ Note: Ensure that the API Client base routing endpoints match your production backend URL string (https://carbon-footprint-tracker-lzgo.onrender.com) inside frontend/src/api/ prior to building production distributions.
