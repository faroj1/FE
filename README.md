# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Expanding the ESLint configuration

## Backend integration & CORS (Laravel)

If your frontend is served from a different origin than the backend you must either enable CORS on the backend or use a Vite proxy during development.

1. Frontend env (set backend base):
   - In the frontend project `.env` set:

     VITE_API_BASE_URL=http://192.168.1.8:8000

   - Or configure a dev proxy instead (recommended to avoid CORS):

     VITE_API_PROXY_TARGET=http://192.168.1.8:8000

     The included `vite.config.js` proxies `/api` to that target when running `npm run dev`.

2. Backend (.env) — Laravel specific:
   - Set the application URL to match the host reachable on the network:

     APP_URL=http://192.168.1.8

   - Enable or add the frontend origin to CORS (in `config/cors.php`):

     'paths' => ['api/*'],
     'allowed_methods' => ['*'],
     'allowed_origins' => ['http://localhost:5173', 'http://192.168.1.8:5173', 'http://192.168.1.8'],

     (You can temporarily set `allowed_origins` => ['*'] while developing.)

3. Test from another device or machine on the same LAN:
   - From that device run:

     curl -i -X GET http://192.168.1.8:8000/api/me

   - For login/register use `http://192.168.1.8:8000/api/login` and `http://192.168.1.8:8000/api/register`.

Notes & debugging: - If DevTools shows requests to a different IP (e.g. 192.168.1.20), update your frontend `.env` or manual API override in the login page. - If `php artisan serve` binds to 127.0.0.1 even with `--host=0.0.0.0`, use a proper web server like Apache/NGINX/Laragon and create a virtual host bound to the LAN IP.

## Realtime notifications with Pusher

Teacher notifications are received live through Pusher private channels and are not persisted as notification history. Configure these frontend env values:

```
VITE_PUSHER_APP_KEY=your_pusher_key
VITE_PUSHER_APP_CLUSTER=ap1
VITE_PUSHER_AUTH_ENDPOINT=https://your-backend.test/api/broadcasting/auth
```

If `VITE_PUSHER_AUTH_ENDPOINT` is omitted, the frontend uses `${VITE_API_BASE}/api/broadcasting/auth`. The private channel name is `private-guru.{guruId}`, and the frontend listens for `PesertaSubmitKuis` and `KuisDipublikasikan` events.

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
