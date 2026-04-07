# 🍳 RecipeFinder — Complete Setup Guide

A full-stack recipe web app using **Supabase** (Auth + PostgreSQL + Storage) and **Vanilla JS**.

---

## ✅ Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up / sign in.
2. Click **New Project**.
3. Enter project name: `recipe-finder`, choose a strong DB password, pick a region, click **Create**.
4. Wait ~2 minutes for your project to provision.

---

## ✅ Step 2 — Get Your API Credentials

1. In your Supabase dashboard, go to **Settings → API**.
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **Anon / Public Key** (a long JWT string)

Open `js/supabaseClient.js` and replace:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

---

## ✅ Step 3 — Run the SQL Setup

1. In Supabase dashboard, go to **SQL Editor → New query**.
2. Open `supabase-setup.sql` from this project folder.
3. Paste the entire contents into the SQL editor.
4. Click **Run** (▶).

This will:
- Create `recipes`, `reviews`, and `favorites` tables
- Enable Row Level Security (RLS) with proper policies
- Create the `recipe-images` storage bucket
- Insert 6 sample recipes

**Expected output:** A table showing 6 recipes (Butter Chicken, Carbonara, Masala Dosa, etc.)

---

## ✅ Step 4 — Configure Auth Settings

1. In Supabase dashboard, go to **Authentication → URL Configuration**.
2. Add your site URL to **Site URL**:
   - For local dev: `http://localhost:5500` (or whatever port you use)
   - For production: `https://yourdomain.com`
3. Under **Redirect URLs**, add: `http://localhost:5500/auth.html`

---

## ✅ Step 5 — Run the App Locally

### Option A — VS Code Live Server (Recommended)
1. Install the **Live Server** extension in VS Code.
2. Open the `recipe-finder` folder in VS Code.
3. Right-click `index.html` → **Open with Live Server**.
4. App opens at `http://127.0.0.1:5500`.

### Option B — Python HTTP Server
```bash
cd recipe-finder
python3 -m http.server 5500
# Open http://localhost:5500
```

### Option C — Node.js
```bash
cd recipe-finder
npx serve .
# Follow the URL shown in terminal
```

> ⚠️ **Important:** Open via a server (not `file://`). ES Modules require HTTP.

---

## ✅ Step 6 — Test All Features

### Authentication
- [ ] Open `http://localhost:5500/auth.html`
- [ ] Click **Create Account**, sign up with your email
- [ ] Check your email for confirmation link, click it
- [ ] Return to app, click **Sign In**, log in
- [ ] Verify your email appears in the navbar
- [ ] Test **Sign Out**
- [ ] Test **Reset Password** flow

### Browse Recipes
- [ ] Homepage shows 6 sample recipe cards
- [ ] Cards show image, title, rating, difficulty, cooking time
- [ ] Type in search box → live filtering works
- [ ] Use Category / Cuisine / Rating dropdowns → filters work
- [ ] Click **Clear** → resets all filters
- [ ] Recipe count updates as you filter

### Recipe Details
- [ ] Click any recipe card → opens detail page
- [ ] Hero image, title, category chips visible
- [ ] Ingredients list shows bullet points
- [ ] Steps show numbered instructions
- [ ] "Save" / Favorite button visible (if logged in)

### Favorites
- [ ] Log in, then click ♡ on any recipe card → turns ♥
- [ ] Click ♥ again → removes favorite
- [ ] Go to **Saved** in navbar → your saved recipes show
- [ ] Log out → Saved page shows login gate

### Add Recipe
- [ ] Log in, click **+ Add Recipe** in navbar
- [ ] Fill in the form (title, description, category, cuisine, time, difficulty)
- [ ] Paste ingredients (one per line) and steps (one per line)
- [ ] Upload a photo (optional)
- [ ] Click **Publish Recipe** → redirects to the new recipe's detail page
- [ ] New recipe appears on the homepage

### Reviews
- [ ] Open any recipe detail page
- [ ] Scroll to Reviews section
- [ ] If logged in: click stars to rate, add optional comment, submit
- [ ] Review appears in the list
- [ ] Rating average updates on the card on homepage

---

## 📁 File Structure

```
recipe-finder/
├── index.html          ← Homepage (recipe grid + search/filter)
├── recipe.html         ← Recipe detail page
├── add-recipe.html     ← Add recipe form
├── auth.html           ← Login / signup / forgot password
├── favorites.html      ← Saved recipes
├── css/
│   └── style.css       ← All styles (warm food aesthetic)
├── js/
│   ├── supabaseClient.js ← Initialize Supabase (edit credentials here)
│   ├── auth.js           ← Auth logic
│   ├── recipes.js        ← Fetch, display, search, filter, add
│   ├── reviews.js        ← Reviews CRUD
│   └── favorites.js      ← Favorites CRUD
└── supabase-setup.sql  ← Run once in Supabase SQL editor
```

---

## 🛠 Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page / "Cannot use import" | Open via HTTP server, not `file://` |
| "Invalid API key" | Double-check credentials in `supabaseClient.js` |
| Recipes not showing | Run `supabase-setup.sql` in SQL editor |
| Images not uploading | Check storage bucket `recipe-images` exists and is public |
| Auth emails not arriving | Check spam; verify Site URL in Supabase Auth settings |
| RLS policy error | Make sure you ran the full SQL (including policy sections) |

---

## 🚀 Deploy to Production

### Netlify (free)
1. Create a free account at [netlify.com](https://netlify.com)
2. Drag & drop the `recipe-finder` folder onto Netlify
3. Update Supabase Auth → Site URL to your Netlify URL

### Vercel
```bash
npm i -g vercel
cd recipe-finder
vercel
```

---

## 🧩 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL with RLS |
| Storage | Supabase Storage (recipe images) |
| Fonts | Playfair Display + DM Sans (Google Fonts) |
| CDN | Supabase JS SDK via jsDelivr |
