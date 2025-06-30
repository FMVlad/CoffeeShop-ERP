# ☕ CoffeeBot - Coffee Shop Management System

A modern fullstack application for coffee shop management with web interface and Telegram bot integration.

## 🏗️ Architecture

### Frontend (React)
- **Framework:** React 19.1.0
- **Build Tool:** Create React App
- **PWA Support:** Progressive Web App capabilities
- **Location:** `frontend/webapp/`

### Backend (FastAPI)
- **Framework:** FastAPI
- **Database:** SQLAlchemy with PYODBC
- **Server:** Uvicorn
- **API Documentation:** Auto-generated Swagger/OpenAPI
- **Location:** `backend/app/`

### Bot (Telegram)
- **Integration:** Telegram Bot API
- **Location:** `backend/bot/`

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation

1. **Clone repository:**
```bash
git clone https://github.com/FMVlad/CoffeeBOT.git
cd CoffeeBOT
```

2. **Install Python dependencies:**
```bash
cd backend/app
pip install -r requirements.txt
```

3. **Install React dependencies:**
```bash
cd frontend/webapp
npm install
```

### Development

#### Start FastAPI Server (Development)
```bash
# Use the provided batch file
./start_api.bat

# Or manually:
cd backend/app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Start React Development Server
```bash
# Use the provided batch file
./start_react.bat

# Or manually:
cd frontend/webapp
npm start
```

#### Build React for Production
```bash
cd frontend/webapp
npm run build
```

## 📁 Project Structure

```
CoffeeBot/
├── frontend/
│   └── webapp/           # React application
│       ├── public/
│       ├── src/
│       ├── build/        # Production build
│       └── package.json
├── backend/
│   ├── app/              # FastAPI application
│   │   ├── routes/       # API routes
│   │   ├── main.py       # Main application
│   │   └── requirements.txt
│   └── bot/              # Telegram bot
│       ├── bot.py
│       └── requirements.txt
├── start_api.bat         # Quick start FastAPI
├── start_react.bat       # Quick start React
└── README.md
```

## 🌐 Endpoints

- **Web App:** `http://localhost:8000/webapp/`
- **API:** `http://localhost:8000/`
- **API Docs:** `http://localhost:8000/docs`
- **React Dev:** `http://localhost:3000/` (development only)

## 🔧 Features

- ✅ Modern React frontend with PWA support
- ✅ FastAPI backend with auto-documentation
- ✅ CORS configured for development and production
- ✅ Static file serving for production build
- ✅ Telegram bot integration
- ✅ Database integration ready
- ✅ Batch files for easy startup

## 🛠️ Technologies

| Component | Technology |
|-----------|------------|
| Frontend | React, Create React App, PWA |
| Backend | FastAPI, SQLAlchemy, PYODBC |
| Database | SQL Server / SQLite |
| Bot | Telegram Bot API |
| Server | Uvicorn |
| Development | Hot reload, CORS |

## 📄 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Contact

Project Link: [https://github.com/FMVlad/CoffeeBOT](https://github.com/FMVlad/CoffeeBOT)

---
*Built with ❤️ for coffee lovers* 