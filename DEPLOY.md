# How to deploy the Uplift portal to Vercel

This is a step-by-step guide written for non-developers.
Estimated time: 20–30 minutes.

---

## What you need before you start

- A GitHub account (free at github.com)
- A Vercel account (free at vercel.com — sign in with GitHub)
- The `uplift-app` folder from Kennedy

---

## Step 1 — Put the code on GitHub

1. Go to github.com and click **New repository**
2. Name it `uplift-app`, set it to **Private**, click **Create**
3. On your computer, open Terminal (Mac) or Command Prompt (Windows)
4. Run these commands one at a time (replace the URL with yours from GitHub):

```
cd path/to/uplift-app
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/uplift-app.git
git push -u origin main
```

If you get a "git not found" error, download Git from git-scm.com first.

---

## Step 2 — Deploy on Vercel

1. Go to vercel.com and click **Add New Project**
2. Click **Import** next to your `uplift-app` repository
3. Leave all settings as-is and click **Deploy**
4. Wait ~2 minutes. Vercel will give you a URL like `uplift-app.vercel.app`

Test it: visit `uplift-app.vercel.app/gifty-anane` — you should see Gifty's portal.

---

## Step 3 — Connect your custom domain (uplift.techunited.co)

1. In Vercel, go to your project → **Settings** → **Domains**
2. Type in `uplift.techunited.co` and click **Add**
3. Vercel will show you a DNS record to add. It looks like:
   - Type: `CNAME`
   - Name: `uplift`
   - Value: `cname.vercel-dns.com`
4. Log into wherever TechUnited:NJ manages its DNS (GoDaddy, Cloudflare, etc.)
5. Add that CNAME record and save
6. Wait up to 10 minutes. Then `uplift.techunited.co/gifty-anane` should work!

---

## Step 4 — Connect Google Sheets (optional but recommended)

This lets mentee responses save to your spreadsheet automatically.

### 4a — Create a service account

1. Go to console.cloud.google.com
2. Create a new project called "Uplift App"
3. Enable the **Google Sheets API**: search "Sheets API" → Enable
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **Service Account**
5. Name it `uplift-sheets`, click through, then click **Done**
6. Click the service account email to open it → **Keys** tab → **Add Key** → **JSON**
7. A `.json` file will download — keep it safe, never share it

### 4b — Share your Google Sheet with the service account

1. Open your Google Sheet
2. Click **Share**
3. Paste the service account email (it looks like `uplift-sheets@your-project.iam.gserviceaccount.com`)
4. Give it **Editor** access

### 4c — Add a "Responses" tab to your sheet

1. In your Google Sheet, add a new tab named exactly: `Responses`
2. In row 1, add these headers: `Timestamp | Mentee | Week | Field | Response`

### 4d — Add secrets to Vercel

1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add these three variables:

| Name | Value |
|------|-------|
| `GOOGLE_SHEET_ID` | The long ID from your sheet's URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The email from the JSON file |
| `GOOGLE_PRIVATE_KEY` | The `private_key` value from the JSON file (paste the whole thing) |

3. Click **Save** then go to **Deployments** → **Redeploy** to pick up the new variables

---

## Sharing URLs with mentees

Each mentee has a unique URL based on their name:

| Mentee | URL |
|--------|-----|
| Gifty Anane | uplift.techunited.co/gifty-anane |
| Anthony Caruso | uplift.techunited.co/anthony-caruso |
| Sonali Chilupuri | uplift.techunited.co/sonali-chilupuri |

...and so on for all 64 mentees. You can find every slug in `lib/mentees.js`.

Just email or Slack each person their personal link before Week 1 begins!

---

## Updating the app later

To make any changes (add a week, fix a typo, update a mentee's info):

1. Edit the files locally
2. Run `git add . && git commit -m "your change" && git push`
3. Vercel automatically redeploys in ~2 minutes

---

## Questions?

Reach out to Kennedy at kennedy@techunited.co or ask Claude to help troubleshoot.
