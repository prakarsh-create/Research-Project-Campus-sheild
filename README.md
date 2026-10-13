<<<<<<< HEAD
āāāāā# FoundIt - Lost and Found Platform

FoundIt ek lost-and-found web application hai jahan users account create karke lost items report kar sakte hain, images upload kar sakte hain aur apni listings manage kar sakte hain.

## Main Features

- User registration and login
- Password hashing with Node.js `scrypt`
- Signed authentication token with 7-day expiry
- User logoutāāā
- User-specific/private item listings
- Lost item report creation
- Found item report creation
- Automatic opposite-type match suggestions
- Optional image upload
- Item location and description
- Item status display
- Owner-only item deletion
- Owner-only item editing and status updates
- Search, status filtering, sorting and pagination
- Responsive React frontend
- JSON file-based persistence for local development

## Technology Stack

### Frontend

- React 19
- Vite
- Tailwind CSS
- Lucide React icons
- ESLint

### Backend

- Node.js
- Express 5
- Multer for image uploads
- CORS
- Dotenv
- Node.js `crypto` for password hashing and authentication tokens

## Project Structure

```text
LostAndFound/
|-- README.md
|-- User_page/
|   |-- src/
|   |   |-- App.jsx          # Main UI, auth, item listing and item actionsā
|   |   |-- App.css          # Additional styles
|   |   |-- index.css        # Tailwind import
|   |   `-- main.jsx         # React entry point
|   |-- public/
|   |-- package.json
|   `-- vite.config.js
`-- foundit-backend/
    |-- server.js            # Express server and API routes
    |-- config/
    |   `-- multerConfig.js
    |-- data/
    |   |-- items.json       # Stored item reports
    |   `-- users.json       # Stored user accounts
    |-- .env.example
    `-- package.json
```

## Requirements

Install these before running the project:

- Node.js 18 or newer
- npm
- A modern browser

## Installation

### 1. Install frontend dependencies

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\LostAndFound\User_page"
npm install
```

### 2. Install backend dependencies

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\LostAndFound\foundit-backend"
npm install
```

### 3. Configure backend environment

Create a `.env` file inside `foundit-backend`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
AUTH_SECRET=replace-with-a-long-random-secret
```

`AUTH_SECRET` ko production mein long, random aur private value se replace karein.

## Running the Application

Backend ke liye ek terminal:

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\LostAndFound\foundit-backend"
npm run dev
```

Frontend ke liye doosra terminal:

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\LostAndFound\User_page"
npm run dev
```

Vite terminal mein jo URL show karega, usually:

```text
http://localhost:5173
```

Backend default URL:

```text
http://localhost:5000
```

## User Guide

### Create an account

1. Frontend open karein.
2. `Need an account? Create one` par click karein.
3. Full name, email aur minimum 8-character password enter karein.
4. `Create account` click karein.

### Login

1. Registered email enter karein.
2. Password enter karein.
3. `Sign in` click karein.

### Add a report

1. `Report` ya `Submit Report` button click karein.
2. Item title enter karein.
3. Location aur description add karein.
4. Optional image upload ya drag-and-drop karein.
5. `Add to Collection` click karein.

### Remove a report

1. Apni collection mein item ke neeche `Remove` click karein.
2. Confirmation accept karein.
3. Item backend se permanently delete ho jayega.

### Logout

Top navigation mein `Sign out` click karein.

## API Documentation

Base URL:

```text
http://localhost:5000
```

Protected endpoints ke liye header:

```http
Authorization: Bearer <token>
```

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

Request:

```json
{
  "name": "Prakarsh",
  "email": "prakarsh@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "token": "signed-token",
  "user": {
    "id": "user-id",
    "name": "Prakarsh",
    "email": "prakarsh@example.com"
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "prakarsh@example.com",
  "password": "password123"
}
```

### Current user

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### List current user's items

```http
GET /api/items?page=1&pageSize=5&search=wallet&status=Searching&sort=newest
Authorization: Bearer <token>
```

Supported query parameters:

- `search` - title, location aur description mein text search
- `status` - `Searching`, `Match Found` ya `Reunited`
- `sort` - `newest`, `oldest`, `title-asc` ya `title-desc`
- `page` - page number, default `1`
- `pageSize` - items per page, maximum `20`

Response:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 5,
  "totalPages": 1
}
```

### Create an item

```http
POST /api/items
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form fields:

- `title` - required
- `location` - optional
- `description` - optional
- `image` - optional image file, maximum 5 MB
- `type` - `lost` or `found`

### Delete an item

```http
DELETE /api/items/:id
Authorization: Bearer <token>
```

User sirf apne account se connected item delete kar sakta hai.

### Update an item

```http
PATCH /api/items/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form fields:

- `title` - required
- `location` - optional
- `description` - optional
- `status` - `Searching`, `Match Found`, ya `Reunited`
- `image` - optional replacement image, maximum 5 MB

Sirf item owner apni listing update kar sakta hai.

### Find potential matches

```http
GET /api/items/:id/matches
Authorization: Bearer <token>
```

The API compares title, location and description words against opposite-type
reports. For example, a `lost` wallet is compared with other users' `found`
wallet reports. The frontend exposes this through the `Find Matches` action on
each listing.

## Data Storage

Local development mein data JSON files mein store hota hai:

- `foundit-backend/data/users.json`
- `foundit-backend/data/items.json`

Passwords plain text mein store nahi hote. Passwords salted `scrypt` hash ke roop mein save hote hain.

Production deployment ke liye JSON storage ki jagah database use karna recommended hai, jaise PostgreSQL, MySQL ya MongoDB.

## Available Commands

### Frontend

```powershell
npm run dev       # Development server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint checks
```

### Backend

```powershell
npm start         # Start backend
npm run dev       # Start with nodemon
```

## Troubleshooting

### Login page load nahi ho raha

Check karein ki frontend chal raha hai:

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\LostAndFound\User_page"
npm run dev
```

### API connection error

Backend run karein:

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\LostAndFound\foundit-backend"
npm run dev
```

### CORS error

`.env` mein frontend URL verify karein:

```env
FRONTEND_URL=http://localhost:5173
```

### Password invalid error

- Email exactly wahi use karein jo registration ke waqt use kiya tha.
- Password minimum 8 characters ka hona chahiye.

### Purane items show nahi ho rahe

Authentication add hone ke baad listings `userId` ke basis par filter hoti hain. Purane items jinmein `userId` nahi hai, woh kisi naye user ke private collection mein automatically show nahi honge.

## Validation

Project ke current checks:

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\LostAndFound\User_page"
npm run lint
npm run build

cd "C:\Users\ASUS\OneDrive\Desktop\LostAndFound\foundit-backend"
node --check server.js
```

## Security Notes

- Production mein strong `AUTH_SECRET` set karein.
- `.env` file ko Git mein commit na karein.
- HTTPS use karein.
- Production mein JSON file storage ke badle proper database use karein.
- File uploads par size aur MIME type validation aur strict karein.
- Authentication token ko production app mein secure cookie strategy se store karna consider karein.

## Future Improvements

- Edit item functionality
- Search, sorting aur filters
- Item status update
- Admin moderation dashboard
- Password reset
- Email verification
- PostgreSQL database
- Cloud image storage
- Automated tests
=======
# Research-Project-Campus-sheild
>>>>>>> 9b1570244e4227a091853ebaa8707cd88264ef40
