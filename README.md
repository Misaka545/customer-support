# Customer Support 

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Express](https://img.shields.io/badge/Express.js-4.x-red)
![React](https://img.shields.io/badge/React-18%2B-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0%2B-green)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-orange)

**Customer Support** is a real-time customer support system with AI-powered response suggestions and seamless agent handoff. This project features a dual-interface system: a **Customer Widget** embedded in websites and an **Agent Dashboard** for support staff.

## Overview

CSKH bridges the gap between automated support and human agents. Customers get instant responses from AI, and agents can take over complex conversations with full context.

### Key Features

- **Real-time Messaging**: Instant message delivery using Socket.io
- **AI Response Suggestions**: Context-aware suggestions powered by Gemini AI
- **Session Management**: Automatic session tracking with unique IDs
- **Agent Dashboard**: Unified interface for managing all customer sessions
- **Seamless Handoff**: Smooth transition from AI to human agents
- **Authentication**: Secure login for support agents
- **File Uploads**: Share screenshots and documents in chat
- **Scalable Architecture**: Modular code with clear separation of concerns

## Project Structure

```text
cskh/
├── backend/          # Express.js backend server (API & Socket.io)
├── frontend/         # React Agent Dashboard (Admin & Support Staff UI)
├── widget/           # React Embeddable Customer Chat Widget
├── BASE plan.txt     # Initial project specifications
├── LICENSE           # License details
└── README.md         # Project documentation
```

## Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **MongoDB** 6.0 or higher
- **npm** or **yarn**

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/cskh.git
cd cskh
```

2. **Backend Setup**

```bash
cd backend
npm install

# Create .env file based on environment variables
cp .env.example .env
```

**.env file example:**

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/cskh
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

3. **Agent Dashboard (Frontend) Setup**

```bash
cd ../frontend
npm install
```

4. **Customer Widget Setup**

```bash
cd ../widget
npm install
```

## Running the Application

For local development, you need to run all three services concurrently:

### Start Backend
```bash
cd backend
npm run dev
# Server will start on http://localhost:5000
```

### Start Agent Dashboard
```bash
cd frontend
npm run dev
# Dashboard will run on http://localhost:5173 or 5174
```

### Start Customer Widget
```bash
cd widget
npm run dev
# Widget will run on http://localhost:5174 or 5175
```

## Architecture

### Backend
- **Express.js**: Web framework handling HTTP requests
- **Socket.io**: Real-time communication layer
- **Mongoose**: MongoDB object modeling
- **JWT**: Authentication and authorization
- **Gemini AI SDK**: AI-powered response suggestions

### Frontend & Widget
- **React**: UI library
- **Vite**: Build tool and development server
- **Tailwind CSS / Vanilla CSS**: Styling
- **React Router**: Client-side routing (Dashboard)
- **Axios**: HTTP client
- **Socket.io-client**: Real-time communication

## API Endpoints

### Authentication
- `POST /api/auth/login` - Agent login
- `POST /api/auth/logout` - Agent logout

### Sessions
- `POST /api/sessions/start` - Start new session
- `GET /api/sessions` - Get all sessions
- `GET /api/sessions/:id` - Get session details
- `PATCH /api/sessions/:id/accept` - Accept a session
- `PATCH /api/sessions/:id/close` - Close a session

### Messages
- `GET /api/messages/:sessionId` - Get messages for session
- `POST /api/messages` - Send message (agent/customer)

### Knowledge Base
- `GET /api/knowledge/documents` - List documents
- `POST /api/knowledge/upload` - Upload document

## Socket.io Events

### Customer Widget
- `connect`: When customer connects
- `disconnect`: When customer disconnects
- `send_message`: Send message to server
- `receive_message`: Receive messages from server
- `typing` / `stop_typing`: Customer typing indicators

### Agent Dashboard
- `connect`: When agent connects
- `disconnect`: When agent disconnects
- `join_session` / `leave_session`: Agent enters/leaves specific chat room
- `accept_session`: Agent accepts a pending session
- `session_updated`: Session state changes
- `receive_message`: New message received
- `new_pending_session`: Alert for new incoming customer

## Usage

### Embedding the Customer Widget
1. Build the widget:
   ```bash
   cd widget
   npm run build
   ```
2. The compiled assets in `dist/` can be embedded into any HTML page.

### Agent Authentication
1. Run the backend seed script to create an admin account if needed (`npm run seed` in backend).
2. Login to the Agent Dashboard with your credentials.
3. Manage sessions, respond to customers, and view AI suggestions.

## License
This project is licensed under the MIT License - see the LICENSE file for details.