# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Backend server with MongoDB Atlas

A small backend has been added in `server/index.js` to save registration data to MongoDB Atlas and to authenticate users.

To run the backend:

1. Copy `server/.env.example` to `server/.env`.
2. Paste your Atlas connection string into `MONGODB_URI`.
3. Run the backend:

```bash
cd server
npm install
npm start
```

The frontend sends registration data to `http://localhost:5000/api/register` and login requests to `http://localhost:5000/api/login`.

## Deploying to Render

This project can run as one Render Web Service. The server serves the built React app from `dist` and the API from `/api`, which keeps admin login cookies on the same domain.

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** from the repository, or create a **Web Service** manually.
3. Use these commands if creating the service manually:

```bash
npm install && npm run build
npm start
```

4. Add these Render environment variables:

```bash
MONGODB_URI=your MongoDB Atlas connection string
MONGODB_DB_NAME=educon
JWT_SECRET=a long random value at least 32 characters
ADMIN_BOOTSTRAP_NAME=Super Admin
ADMIN_BOOTSTRAP_EMAIL=your admin email
ADMIN_BOOTSTRAP_PASSWORD=a strong password at least 12 characters
```

Render automatically provides `PORT` and `RENDER_EXTERNAL_URL`. The app uses `RENDER_EXTERNAL_URL` as an allowed CORS origin, so `CORS_ORIGINS` is only needed if the frontend is hosted on a different domain.

After deploy:

- Public site: `https://your-service.onrender.com`
- Admin login: `https://your-service.onrender.com/admin/login`
- Health check: `https://your-service.onrender.com/api/health`

Do not set `VITE_API_BASE_URL` for the single-service Render deployment. Leaving it empty makes the frontend call `/api/...` on the same Render domain.

## Deploying to Netlify

### Frontend Deployment

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variable in Netlify dashboard:
   - Go to **Site Settings** > **Build & Deploy** > **Environment**
   - Add: `VITE_API_BASE_URL` = your backend API URL (e.g., `https://your-api.herokuapp.com`)

### Admin Panel Access

- Public site: `https://your-site.netlify.app`
- Admin login: `https://your-site.netlify.app/admin/login`
- Admin credentials must be created on the backend. For first-time setup, configure `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, and `JWT_SECRET` in the backend environment.

### Backend Deployment

The backend server needs to be deployed separately. Options:

- **Heroku**: `heroku create && git push heroku main`
- **Render**: Create a new Web Service and connect your repo
- **Railway**: Connect via dashboard
- **Fly.io**: `flyctl launch`

After deploying the backend, set `VITE_API_BASE_URL` in Netlify to your backend's production URL.

### Important: CORS Configuration

Update your `server/index.js` CORS settings to include your Netlify domain:

```javascript
const origin = process.env.CORS_ORIGIN || ['http://localhost:5173', 'https://your-site.netlify.app'];
app.use(cors({ origin }));
```

Or set `CORS_ORIGIN` environment variable on your backend to: `https://your-site.netlify.app`
