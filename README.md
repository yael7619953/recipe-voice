# Recipe Voice

<div align="center">

![Recipe Voice Banner](https://img.shields.io/badge/Project-Recipe%20Voice-1E3A8A?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-6B7280)

A modern recipe management platform with AI-powered import, category organization, and a voice-first kitchen assistant.

</div>

## Overview

Recipe Voice is a full-stack application designed for home cooks, recipe collectors, and meal planners. It combines:

- a user-friendly Angular client for browsing and managing recipes,
- a secure Express + MongoDB backend,
- AI-based recipe extraction from PDF, image, and audio files,
- voice interaction for hands-free kitchen support,
- hierarchical category organization and favorite tracking.

The system is designed to make recipe acquisition and cooking easier, faster, and more accessible, especially in a real kitchen environment where users may need hands-free interaction.

---

## Key Features

### Recipe management
- Create, edit, delete, and search recipes
- Organize recipes into categories and subcategories
- Track favorites and recipe metadata
- Upload recipe images and structured ingredients/instructions

### AI-powered import
- Extract recipe content from PDF files
- Import from images using AI-based parsing
- Process audio inputs for transcription and recipe understanding
- Turn raw source material into structured recipe entries

### Voice assistant experience
- TTS read-aloud recipe steps for hands-free cooking
- STT-based voice commands to navigate or interact with the kitchen assistant
- LLM-powered conversational support for recipe guidance

### Authentication and security
- Email/password registration and login
- JWT-based protected API routes
- Google OAuth support
- User-scoped data access with strict ownership validation

---

## Tech Stack

### Frontend
- Angular 21
- TypeScript
- RxJS
- ngx-translate for internationalization
- RTL-ready Hebrew + English support

### Backend
- Node.js + Express 5
- MongoDB + Mongoose 9
- JWT + bcrypt
- Passport.js for Google OAuth
- Joi validation
- Multer for file uploads

### AI & voice
- Gemini / Groq LLM adapters
- PDF parsing
- Audio and document ingestion
- Web Speech API integration on the client side

---

## Project Structure

```text
recipe-voice/
├── client/                     # Angular frontend
│   ├── src/
│   ├── public/
│   ├── angular.json
│   ├── package.json
│   └── tsconfig*.json
├── server/                     # Express API
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── validators/
│   ├── tests/
│   └── package.json
├── plans/                      # Product and design documentation
├── AGENTS.md                   # Monorepo guidance
├── CONTRACTS.md                # API contract and changelog
├── package.json                # Root-level meta if added later
├── .gitignore
├── README.md
└── .env.example               # if present in server setup
```

---

## Getting Started

### Prerequisites

Before running the project, make sure you have:

- Node.js 20+
- npm
- MongoDB running locally or a remote Mongo URI
- API keys for the AI provider you want to use

### 1) Clone the repository

```bash
git clone https://github.com/your-username/recipe-voice.git
cd recipe-voice
```

### 2) Install dependencies

#### Server

```bash
cd server
npm install
```

#### Client

```bash
cd client
npm install
```

### 3) Configure environment variables

Create a local environment file for the server:

```bash
cd server
copy .env.example .env
```

Then fill in the required values:

```env
MONGO_URI=mongodb://localhost:27017/recipeDB
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:4200
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

> Never commit secrets to the repository. Use local environment files or GitHub Secrets in CI.

---

## Running the Project

### Start the backend

```bash
cd server
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

### Start the frontend

```bash
cd client
npm start
```

Frontend runs at:

```text
http://localhost:4200
```

### Health check

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "API is healthy"
}
```

---

## API Overview

The server exposes the following main API groups under `/api`:

| Area | Purpose |
| --- | --- |
| `/auth` | Register, login, Google OAuth, session user info |
| `/categories` | Category creation and hierarchy management |
| `/recipes` | CRUD operations for recipe records |
| `/ai` | AI-based recipe extraction and import workflows |
| `/agent` | Conversational kitchen assistant tooling |
| `/health` | Service health endpoint |

For detailed request and response contracts, see [CONTRACTS.md](CONTRACTS.md).

---

## Example Workflow

1. User signs up or logs in.
2. User creates or imports categories.
3. User uploads a recipe PDF, image, or audio file.
4. AI extracts ingredients and instructions.
5. The system saves the recipe into the database.
6. The user can browse, favorite, and cook recipes.
7. The voice assistant reads instructions aloud while cooking.

---

## Development Commands

### Server

```bash
cd server
npm run dev      # run with nodemon
npm start        # run production-style startup
npm test         # run Vitest suite
npm run lint     # lint project
```

### Client

```bash
cd client
npm start        # angular dev server
npm run build    # production build
npm test         # run frontend tests
```

---

## Architecture Notes

### Backend responsibilities
- Authentication and authorization
- CRUD APIs for recipes and categories
- AI ingestion and extraction logic
- LLM provider abstraction
- Validation and business rules

### Frontend responsibilities
- User interface and UX
- Internationalization
- Voice interaction and read-aloud playback
- State management and API integration

### Security model
- All user-owned routes must validate the authenticated user ID
- Requests that access personal recipe or category data are filtered by `userId`
- JWT tokens are required on protected endpoints

---

## Roadmap

Planned and active areas include:

- stronger AI extraction quality across more recipe formats
- richer voice commands for hands-free cooking
- improved category tree UX and filtering
- enhanced recipe recommendations and meal planning
- better mobile-first recipe reading experience

---

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run relevant tests and lint checks
5. Open a pull request with a clear description

Please keep code comments in English and follow the existing repo conventions.

---

## License

This project is licensed under the ISC License.

---

## Contact

For project questions, feature requests, or collaboration opportunities, reach out through the repository issue tracker or your team contact channels.

"Cook smarter, faster, and hands-free."
