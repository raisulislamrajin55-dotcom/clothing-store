# Aranya Fashion House — Clothing Order System

A complete clothing e-commerce order system: a customer-facing store page, an order
form with Google Sheets + Telegram integration, and an admin dashboard — built with
plain HTML/CSS/JS on the frontend and Node.js + Express on the backend.

```
clothing-store/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── package.json
│   ├── .env.example           # copy to .env and fill in your own values
│   ├── data/
│   │   ├── products.json      # product database (simple JSON file)
│   │   └── orders.json        # local order mirror (Google Sheets is the main record)
│   ├── routes/
│   │   ├── products.js        # public product endpoints
│   │   ├── orders.js          # order submission endpoint
│   │   └── admin.js           # admin login + order/product management
│   ├── middleware/
│   │   ├── validate.js        # phone number / field validation
│   │   └── adminAuth.js       # simple token-based admin session
│   └── services/
│       ├── fileDb.js          # reads/writes the JSON "database"
│       ├── googleSheets.js    # Google Sheets API integration
│       └── telegram.js        # Telegram Bot API integration
└── frontend/
    ├── index.html             # storefront
    ├── admin.html             # admin dashboard
    ├── css/
    │   ├── style.css
    │   └── admin.css
    └── js/
        ├── store.js
        └── admin.js
```

The backend also **serves** the frontend, so in production you only deploy one
service and everything (store + admin panel + API) lives at the same URL.

---

## 1. Local Setup

**Requirements:** Node.js 18+ installed on your computer.

```bash
cd clothing-store/backend
npm install
cp .env.example .env
```

Now open `.env` and fill in the values (explained below). At minimum, set:

- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — your own admin login
- `JWT_SECRET` — any long random string (e.g. mash your keyboard for 40 characters)

Then start the server:

```bash
npm run dev
```

Visit:
- **Store:** http://localhost:5000
- **Admin panel:** http://localhost:5000/admin

At this point the store and admin panel already work — orders save to
`backend/data/orders.json` even before you set up Google Sheets or Telegram.
Those two integrations are optional layers on top (highly recommended, but the
site won't crash without them — it just logs a warning and keeps working).

---

## 2. Google Sheets Setup

This lets every order automatically get written as a new row in a Google Sheet.

### Step 1 — Create the sheet
1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Rename the first tab (bottom-left) to exactly `Orders`.
3. Leave row 1 empty — the app will write the header row for you automatically the
   first time an order comes in.
4. Copy the **Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit`

### Step 2 — Create a Google Cloud service account
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or use an existing one).
3. In the search bar, search **"Google Sheets API"** and click **Enable**.
4. Go to **APIs & Services → Credentials → Create Credentials → Service Account**.
5. Give it any name (e.g. `clothing-store-bot`) and click through to **Done**.
6. Click on the service account you just created → **Keys** tab → **Add Key →
   Create New Key → JSON**. This downloads a `.json` file — keep it private.
7. Open that JSON file. You need two values from it:
   - `client_email` → this is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → this is your `GOOGLE_PRIVATE_KEY`

### Step 3 — Share the sheet with the service account
1. Open your Google Sheet, click **Share**.
2. Paste the `client_email` value (looks like
   `something@your-project.iam.gserviceaccount.com`) and give it **Editor** access.

### Step 4 — Fill in `.env`
```
GOOGLE_SHEET_ID=paste_the_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=paste_client_email_here
GOOGLE_PRIVATE_KEY="paste_private_key_here_including_-----BEGIN/END-----_lines"
```

> ⚠️ Keep the `\n` characters inside the private key exactly as they appear in the
> JSON file. If you paste it as one line wrapped in quotes, the app converts `\n`
> back into real line breaks automatically.

That's it — place a test order and you should see a new row appear in the
`Orders` tab within a second or two.

---

## 3. Telegram Bot Setup

This sends you an instant Telegram message every time someone places an order.

### Step 1 — Create the bot
1. Open Telegram and search for **@BotFather**.
2. Send `/newbot` and follow the prompts (choose a name and a username ending in `bot`).
3. BotFather will reply with a **token** that looks like `123456789:ABCdefGhIJKlmNoPQRstuVwxYZ`.
   This is your `TELEGRAM_BOT_TOKEN`.

### Step 2 — Get your Chat ID
1. Search for **@userinfobot** on Telegram and send it any message — it replies
   with your numeric Chat ID. (For a group, add your new bot to the group instead,
   send a message, then visit
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser and look for
   `"chat":{"id":...}` in the response.)
2. Send your new bot a `/start` message first (Telegram bots can't message you
   until you've messaged them at least once).

### Step 3 — Fill in `.env`
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVwxYZ
TELEGRAM_CHAT_ID=your_numeric_chat_id
```

Place a test order — you should get a formatted "🛍️ NEW ORDER" message instantly.

---

## 4. Admin Dashboard

Go to `/admin` on your site. Log in with the `ADMIN_USERNAME` / `ADMIN_PASSWORD`
you set in `.env`.

From there you can:
- **Orders tab:** search, filter by status, view full order details, and change
  status through Pending → Confirmed → Processing → Shipped → Delivered
  (or Cancelled). Status changes sync back to the Google Sheet automatically.
- **Products tab:** add new products, edit price/sizes/description, and toggle
  a product as out of stock (it becomes un-orderable on the storefront instantly).

The admin session is a signed token stored in the browser for 12 hours, so you
don't need to log in on every visit within that window.

---

## 5. Customizing the Store

- **Products:** edit `backend/data/products.json` directly, or use the admin
  dashboard (recommended, since it writes to the same file safely).
- **Delivery charge:** set `DELIVERY_CHARGE_INSIDE_DHAKA` /
  `DELIVERY_CHARGE_OUTSIDE_DHAKA` in `.env`. Currently the storefront applies a
  single flat rate (`DELIVERY_CHARGE_INSIDE_DHAKA`) — if you want the customer to
  pick "Inside Dhaka" vs "Outside Dhaka", that's a small addition to the order
  form (add a dropdown, send the chosen charge as `deliveryCharge` in the request
  — the backend already accepts it).
- **Brand name/colors/fonts:** edit the CSS variables at the top of
  `frontend/css/style.css` (`--color-accent`, `--font-heading`, etc.) and the
  text in `frontend/index.html`.
- **Payment numbers:** the bKash/Nagad personal numbers shown in the order popup
  are placeholders in `frontend/js/store.js` (`mfsNumbers` object) — replace them
  with your real numbers.

---

## 6. Deployment

The simplest beginner-friendly option is **Render.com** (free tier available) or
**Railway.app** — both deploy a Node.js app directly from GitHub with almost no
configuration.

### Deploy on Render
1. Push this project to a GitHub repository.
2. Go to [render.com](https://render.com) → **New → Web Service** → connect your repo.
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Under **Environment**, add every variable from your `.env` file (Render has a
   UI for this — paste each key/value, including the multi-line
   `GOOGLE_PRIVATE_KEY`).
5. Deploy. Render gives you a live URL — your store is now at that URL, and the
   admin panel is at `<that-url>/admin`.
6. Set `FRONTEND_URL` in the environment variables to that same URL (for CORS).

### Alternative: Railway.app
Same idea — connect your GitHub repo, set the root directory to `backend`, add
the same environment variables, and deploy.

> Since the Express server serves the frontend folder directly, you do **not**
> need a separate static hosting service (like Netlify/Vercel) unless you prefer
> to split them — in that case, just update `API_BASE` in `store.js`/`admin.js`
> to point to your backend's full URL, and set `FRONTEND_URL` in the backend's
> `.env` to your frontend's domain so CORS allows it.

---

## 7. Security Notes

- All secrets (Telegram token, Google service account key, admin password) live
  only in `.env` on the server and are **never** sent to the browser.
- `.env` is excluded from Git via `.gitignore` — never commit it.
- The order endpoint is rate-limited (20 attempts per IP per 10 minutes) to
  reduce spam.
- Duplicate submissions are blocked both client-side (button disables instantly
  on submit) and server-side (a short-lived idempotency cache keyed to each
  form-open session).
- Bangladeshi phone numbers are validated with a regex (`01[3-9]XXXXXXXX`,
  optionally prefixed with `+880`/`880`).
- Transaction ID is required and length-checked whenever bKash/Nagad is selected.
- Change `ADMIN_PASSWORD` and `JWT_SECRET` to strong, unique values before going
  live — the defaults in `.env.example` are placeholders only.

---

## 8. Troubleshooting

| Problem | Likely Cause |
|---|---|
| Orders aren't appearing in Google Sheets | Sheet not shared with the service account email, or the tab isn't named exactly `Orders` |
| Telegram message never arrives | You haven't sent `/start` to your bot yet, or `TELEGRAM_CHAT_ID` is wrong |
| "Invalid username or password" on `/admin` | Double-check `ADMIN_USERNAME`/`ADMIN_PASSWORD` in `.env`, then restart the server |
| Changes to `.env` don't take effect | Restart the server (`npm run dev` / `npm start`) — env vars are only read on startup |
| Products don't show images | Make sure the image URL is a direct, publicly accessible link ending in an image (or hosted on a CDN like Unsplash/Imgur/Cloudinary) |

---

Enjoy your new store! 🛍️
