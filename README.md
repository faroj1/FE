# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Backend integration & troubleshooting

If your frontend cannot reach the backend (you see "Failed to fetch"), try the following:

- Environment option: set a fixed API base in `.env`:

	VITE_API_BASE="http://192.168.1.20:8000"

- Dev proxy option (recommended to avoid CORS during development): set the backend as proxy target:

	VITE_API_PROXY_TARGET="http://192.168.1.20:8000"

	Then restart the Vite dev server. Requests to `/api/*` will be proxied to the target.

- Manual override: in the login page you can set the API base and save it; this will persist to `localStorage` as `apiBase`.

- Troubleshooting tips:
	- Ensure the backend is running and accessible from your machine (try `curl http://192.168.1.20:8000/api` or PowerShell `Invoke-RestMethod`).
	- If the backend is reachable via command line but the browser shows CORS errors, either enable CORS on the backend or use the Vite proxy option above.
	- Open required ports and firewall rules on the server hosting the backend.

