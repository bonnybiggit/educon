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

## Deploying to Listed Hosting cPanel

Use cPanel's **Setup Node.js App** with Node.js 20 (at least 20.19), application root `universe-backend`, application URL `universeconsultsedu.com`, and startup file `server/index.js`. The application root must contain `package.json`, `package-lock.json`, `server/`, and the frontend source. This single Express process serves both the Vite `dist/` frontend and `/api` endpoints.

Set these environment variables in the cPanel Node.js application settings:

```text
NODE_ENV=production
MONGODB_URI=mongodb+srv://<url-encoded-username>:<url-encoded-password>@educon1.hhxti4r.mongodb.net/educon?retryWrites=true&w=majority&appName=educon1
MONGODB_DB_NAME=educon
JWT_SECRET=<unique-random-secret-at-least-32-characters>
FRONTEND_URL=https://universeconsultsedu.com
CORS_ORIGINS=https://universeconsultsedu.com
TRUST_PROXY=1
VITE_SITE_URL=https://universeconsultsedu.com
```

Use your Atlas database user's real credentials only in the cPanel environment settings. URL-encode special characters in the username or password. Do not set `PORT`; cPanel assigns it. Do not set `VITE_API_BASE_URL`: production frontend requests use same-origin `/api` paths, never `localhost`.

Email delivery is optional for startup. Until configured, email verification and student password recovery return a service-unavailable response (the forgot-password page then reports that reset is unavailable) and do not block startup. Password recovery needs the same three variables as email verification, so students who registered through the removed Google sign-in cannot set a password until they are set. To enable Resend email, set `RESEND_API_KEY`, `EMAIL_FROM=Universe Consult <support@universeconsultsedu.com>`, and a separate random `EMAIL_VERIFICATION_CODE_PEPPER`; verify the sender domain with Resend. Each new student registration also sends a support notification (no passwords, codes or tokens) to `SUPPORT_NOTIFICATION_EMAIL` (default `support@universeconsultsedu.com`) after the account is saved and the verification code is sent; a failed notification never blocks registration, and a `notificationLog` collection (unique key per student, 90-day TTL) prevents duplicates. The first start after deploying creates the new `studentPasswordResets` and `notificationLog` collections and its indexes; no existing collection is changed.

Do not set `ADMIN_BOOTSTRAP_EMAIL` or `ADMIN_BOOTSTRAP_PASSWORD` for an existing database. Startup no longer updates or migrates admin accounts; bootstrap can only create an admin when explicitly configured and the admins collection is empty.

Deployment steps:

1. In cPanel, create the Node.js app with the settings above and add its environment variables.
2. Deploy the repository contents into `universe-backend`.
3. In the app's activated Node environment, run:

   ```bash
   cd ~/universe-backend
   npm ci --include=dev
   npm run build
   ```

4. Confirm `dist/index.html` exists, then restart the Node.js app from cPanel. The configured startup file is `server/index.js`; it listens on cPanel's assigned `PORT`.
5. In MongoDB Atlas, allow the hosting server's outbound IP address and ensure the database user has access to the existing `educon` database. Do not drop collections or run data migrations.

Verification checklist:

- Open `https://universeconsultsedu.com` and confirm the React site loads over HTTPS.
- Open `https://universeconsultsedu.com/api/health` and confirm the API responds.
- Check a public API route such as `/api/services` and confirm the production browser does not request `localhost`.
- Test admin and student login; confirm authentication cookies have `Secure`, `HttpOnly`, and `SameSite=Lax`.
- Review cPanel application logs for startup errors. Keep credentials out of logs, source control, and deployment artifacts.
- Email verification may remain unconfigured; configure its optional variables before enabling it.

## Deploying to Render

This project can run as one Render Web Service. The server serves the built React app from `dist` and the API from `/api`, which keeps admin login cookies on the same domain.

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** from the repository, or create a **Web Service** manually.
3. Use these commands if creating the service manually:

```bash
npm install && npm run build
npm start
```

4. The Blueprint configures the production site/API URLs, CORS origin, email sender, and proxy trust. In Render, add the values for the `sync: false` variables:

```bash
MONGODB_URI=your MongoDB Atlas connection string
ADMIN_BOOTSTRAP_EMAIL=your admin email
ADMIN_BOOTSTRAP_PASSWORD=a strong password at least 12 characters
RESEND_API_KEY=your Resend API key
EMAIL_VERIFICATION_CODE_PEPPER=a long random secret
```

Keep these values in Render's environment settings; do not commit them. Render automatically provides `PORT`.

Add `https://universeconsultsedu.com` as a custom domain on the Render service and point the domain's DNS records to Render. The Blueprint uses this domain for the frontend and same-origin API.

Verify `universeconsultsedu.com` with Resend so it can send from `support@universeconsultsedu.com`.

## Deploying to Netlify

### Frontend Deployment

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in the Netlify dashboard:
   - Go to **Site Settings** > **Build & Deploy** > **Environment**
   - Set `VITE_SITE_URL` to `https://universeconsultsedu.com`
   - Set `VITE_API_BASE_URL` to the separately deployed backend's public API origin. The Render single-service origin configured above should not be used for a split Netlify deployment unless that backend is also configured to serve the domain.

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

Set `CORS_ORIGINS` on the backend to the Netlify site's exact origin. The production Render Blueprint already sets `CORS_ORIGINS` for `https://universeconsultsedu.com`.
