# Tasty Pizza Frontend

React frontend for the Tasty Pizza application. The app provides a public catalog and product details pages, authentication, profile management, a cart flow, and an admin area for managing menu items, ingredients, orders, and users.

## Tech Stack

- React 19
- React Router 7
- Create React App / react-scripts
- Fetch-based API client
- JWT access token stored in `localStorage`
- Cookie-based refresh flow
- `react-hot-toast` for notifications
- `react-icons` for UI icons

## Requirements

- Node.js and npm
- Tasty Pizza backend running locally or reachable over HTTP

The default development proxy points API requests to:

```text
http://localhost:8080/api
```

You can override the API base URL with `REACT_APP_API_BASE`.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Run tests in watch mode:

```bash
npm test
```

## Environment

Create a local `.env` file only if the frontend should call a backend URL different from the CRA proxy:

```env
REACT_APP_API_BASE=http://localhost:8080/api
```

When `REACT_APP_API_BASE` is not set, requests use relative paths and Create React App forwards them through the `proxy` value in `package.json`.

## Main Routes

Public routes:

- `/` - home page
- `/menu` - product catalog
- `/pizza/:id` - pizza details and customization
- `/pasta/:id` - pasta details and customization
- `/drink/:id` - drink details
- `/privacy` - privacy policy
- `/terms` - terms page
- `/cookies` - cookies policy

Guest-only routes:

- `/login`
- `/register`

Authenticated user routes:

- `/profile`

Admin routes:

- `/admin` - admin dashboard
- `/admin/pizzas`
- `/admin/pastas`
- `/admin/drinks`
- `/admin/ingredients`
- `/admin/ingredient-types`
- `/admin/orders`
- `/admin/orders/:id`
- `/admin/users`

## Project Structure

```text
src/
  api/             API modules for auth, catalog, cart, orders, and admin flows
  auth/            token refresh scheduling
  components/      shared UI components such as navbar, footer, cart drawer, and cart button
  context/         React providers for auth and cart state
  pages/           public and user-facing pages
  pages/admin/     admin management pages
  routes/          route guards for guest, authenticated, and admin access
```

## API Client

The shared API client lives in `src/api/http.js`.

It handles:

- JSON request and response handling
- `Authorization: Bearer <token>` header injection
- `credentials: "include"` for refresh cookies
- request timeout handling
- automatic access-token refresh after eligible `401` responses

Authentication state is provided by `src/context/AuthContext.jsx`. The app starts a refresh scheduler and boots by calling `/users/me`.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the local development server |
| `npm run build` | Create a production build in `build/` |
| `npm test` | Run the CRA test runner |
| `npm run eject` | Eject CRA configuration |

## Notes for Development

- Keep backend and frontend API paths aligned with the modules under `src/api/`.
- Admin pages are protected by `RequireAdmin`.
- Profile and other user-only flows are protected by `RequireAuth`.
- Login and registration are wrapped by `GuestOnly`.
- Cart state is available through `CartProvider` and rendered globally through `CartDrawer` and `CartFab`.
