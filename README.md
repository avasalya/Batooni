# Batooni AI Shopping Assistant

Batooni is an open-source, token-optimized AI Shopping Assistant designed for Shopify stores. It features a lightweight Shopify Theme App Extension frontend and a high-performance, serverless Node.js backend hosted on Vercel that interacts with Groq's high-speed LLM models.

---

# 🏗️ Repository Layout

```text
.
├── batooni-backend/              # Node.js Serverless Backend Function
│   ├── api/
│   │   └── chat.js               # Chat engine with user session logging
│   ├── package.json
│   └── package-lock.json
├── extensions/                   # Shopify Theme App Extension Assets
│   └── batooni-extension/        # App Block liquid logic & layout injections
└── shopify.app.batooni.toml      # Core Shopify Configuration Manifest
```

---

# ⚙️ Required Setup & Accounts

To run your own copy of Batooni, you must set up and link three platforms.

## 1. Groq Cloud Setup (AI Engine)

Groq provides the ultra-fast API processing engine that powers the chatbot responses.

### Steps

1. Go to the Groq Cloud Console.
2. Create a free account or sign in.
3. In the left sidebar, click **API Keys**.
4. Click **Create API Key**.
5. Name it `Batooni-Production`.
6. Copy the generated API key (`gsk_...`) and store it securely.

---

## 2. Vercel Setup (Backend Deployment)

Vercel hosts your serverless backend code (`chat.js`) so your frontend can communicate securely with Groq.

### Install Vercel CLI

```bash
mkdir batooni-backend

cd batooni-backend

npm install -g vercel

npm install xml2js
```

### Login to Vercel

```bash
vercel login
```

### Deploy Backend

```bash
vercel
```

Follow the terminal prompts to configure the deployment.

After deployment, copy your production URL:

```text
https://your-project.vercel.app
```

### Configure Environment Variables

Open your Vercel project dashboard.

Navigate to:

```text
Settings → Environment Variables
```

Add the following variable:

```env
GROQ_API_KEY=your_groq_api_key
```

Redeploy the project:

```bash
vercel --prod
```

---

## 3. Shopify Setup (Custom App Creation)

To inject the chatbot into Shopify themes cleanly, create either a Custom App or deploy the included Theme Extension.

---

### Option A — Create a Custom App

Used for generating Store API credentials.

### Steps

1. Open Shopify Admin Dashboard.
2. Navigate to:

```text
Settings → Apps and sales channels → Develop apps
```

3. Click **Create an app**.
4. Name it `Batooni Assistant`.
5. Configure Admin API scopes:
   - Products → Read
   - Collections → Read
   - Pages → Read
6. Click **Install App**.
7. Save generated access tokens securely.

---

### Option B — Deploy Theme Extension

### Install Shopify CLI

Install Shopify CLI on your machine.

### Link App Configuration

```bash
# create a folder on your path "batooni"
cd batooni
shopify app config link --config batooni
```

### Deploy Extension

```bash
shopify app deploy
```

### Enable Extension

Navigate to:

```text
Online Store → Themes → Customize
```

Then:

1. Open **App Embeds** or **Add Block**
2. Select **Batooni AI Assistant**
3. Save theme changes

---

# 🛠️ Required Code Customizations

Before deploying this repository publicly, update all placeholder values.

---

## 1. Update Backend Endpoint URL

Open:

```text
extensions/batooni-extension/snippets/chatbot.liquid
```

Locate:

```js
const AI_BACKEND_ENDPOINT = "https://your-vercel-domain.vercel.app/api/chat";
```

Replace with your live Vercel backend URL.

---

## 2. Update Shopify Search Fallback Domain

Open:

```text
batooni-backend/api/chat.js
```

Locate Rule 4 inside `systemPrompt`.

Replace:

```text
https://YOUR-SHOPIFY-STORE.com
```

With your actual Shopify store domain.

---

# 📊 Monitoring Usage & Unique Users

Batooni uses lightweight structured logging inside Vercel functions to track usage without impacting execution speed.

## View Live Chat Logs

1. Open Vercel Dashboard
2. Open your deployed project
3. Go to the **Logs** tab
4. Search:

```text
chat_interaction
```

You will see structured logs similar to:

```json
{
  "event": "chat_interaction",
  "unique_user": "usr_5af8k2m9p1",
  "user_query": "best hat",
  "query_length": 8,
  "timestamp": "2026-05-25T05:50:00.000Z"
}
```
