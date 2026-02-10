# Bunny.net Setup Guide – Step by Step

Use Bunny.net to host your videos and get URLs for MOVI HIVE. Follow these steps in order.

---

## Part 1: Create your Bunny.net account

### Step 1.1 – Sign up

1. Open your browser and go to: **https://bunny.net**
2. Click **Sign Up** (top right).
3. Enter:
   - **Email address**
   - **Password** (strong, at least 8 characters)
4. Accept the terms and click **Create Account**.
5. Check your email and click the confirmation link if Bunny sends one.

### Step 1.2 – Log in

1. Go to **https://bunny.net** again.
2. Click **Login** and enter your email and password.
3. You should see the **Bunny Dashboard** (overview with a left menu).

### Step 1.3 – Billing (required to use storage/streaming)

1. In the dashboard, click **Account** or your profile (top right).
2. Open **Billing** or **Payment**.
3. Add a **payment method** (card). Bunny needs this even for small usage (they charge roughly $0.01/GB).
4. You can set a **spending limit** (e.g. $5/month) so you don’t get surprises.

---

## Part 2: Choose how to host videos

You can use either:

- **Storage + Pull Zone** – Simple: upload files, get a direct link (e.g. `https://xxx.b-cdn.net/movie.mp4`). Best for **direct MP4 URLs** in MOVI HIVE.
- **Stream** – Video library with encoding; good if you want HLS or multiple qualities later.

For MOVI HIVE, **Storage + Pull Zone** is the simplest. Steps below use that.

---

## Part 3: Create a Storage Zone

**In one sentence:** You’re creating a “bucket” where your video files will be stored. Later you’ll connect it to a Pull Zone so those files get a public URL.

---

### Step 3.1 – Find the Storage page

1. Look at the **left sidebar** of the Bunny dashboard (after you’re logged in).
2. Find an option named **Storage** or **Storage Zones**.
   - If you see **CDN** or a group of items, open it and look for **Storage** inside.
   - It might also be under a **“+”** or **“Add”** area – look for anything that says “Storage”.
3. Click **Storage** (or **Storage Zones**). You should see a list of storage zones (it might be empty at first).

---

### Step 3.2 – Start creating a new zone

1. On the Storage page, look for a button such as:
   - **Add Storage Zone**, or  
   - **+ Add Zone**, or  
   - **Create Storage Zone**.
2. Click that button. A form or a new page will open asking for details.

---

### Step 3.3 – Fill in the form (what to type)

You’ll see a few fields. Here’s what to do:

| Field | What to do |
|-------|------------|
| **Name** | Type a short name, e.g. `movihive-videos`. Use only letters, numbers, and hyphens (no spaces). |
| **Region** | Pick one from the dropdown. Choose the **closest to you** or your viewers (e.g. **New York**, **London**, **Falkenstein**, **Los Angeles**). |
| **Replication** | Leave as it is (usually “None” or default). Don’t turn on extra replication. |

Don’t change any other advanced options. Just name, region, and then create.

---

### Step 3.4 – Create the zone

1. Click the button at the bottom of the form: **Create**, **Add Storage Zone**, or **Save**.
2. You should be taken back to the list of storage zones, and your new zone (e.g. `movihive-videos`) should appear.
3. If you see an error (e.g. “Name already taken”), try a different name like `movihive-videos2`.

---

### Step 3.5 – Open the zone and get the password

1. **Click the name** of the storage zone you just created (e.g. `movihive-videos`). This opens that zone’s page.
2. Look for a tab or link such as:
   - **FTP & API Access**, or  
   - **Access**, or  
   - **API**.
3. Click it. You’ll see something like:
   - **Hostname** (e.g. `storage.bunnycdn.com` or `ny.storage.bunnycdn.com`)
   - **Username** (often the same as the zone name, e.g. `movihive-videos`)
   - **Password** – there may be a **Show** or **Reveal** button. Click it, then **copy the password** and save it somewhere safe (you’ll need it to upload files).

You don’t need to change anything here. Just note the **password** (and the zone name). In Part 4 you’ll create a **Pull Zone** and connect it to this storage zone so your videos get a public URL.

---

## Part 4: Create a Pull Zone

A Pull Zone takes files from your Storage Zone and serves them over HTTPS with a nice URL (e.g. `https://movihive.b-cdn.net/movie.mp4`).

### Step 4.1 – Open Pull Zones

1. In the left menu, click **Pull Zones**.
2. Click **Add Pull Zone** (or **+ Add Pull Zone**).

### Step 4.2 – Connect to your Storage

1. **Name:** e.g. `movihive` (this often becomes part of the URL).
2. **Origin Type:** Choose **Storage Zone** (not URL).
3. **Origin Storage Zone:** Select the zone you created (e.g. `movihive-videos`).
4. **Origin URL:** Leave as suggested (Bunny fills it from the storage zone).
5. **Region:** Same as your storage (e.g. New York).
6. Click **Add Pull Zone** or **Create**.

### Step 4.3 – Get your video URL hostname

1. Open the new Pull Zone.
2. At the top you’ll see **Hostname**, e.g.:
   - `movihive.b-cdn.net`  
   or  
   - `xxxxx.b-cdn.net` (random if you didn’t set a custom name).
3. **Your video base URL is:** `https://THIS-HOSTNAME/`  
   Example: `https://movihive.b-cdn.net/`

Any file you upload to the storage zone will be available at:  
`https://THIS-HOSTNAME/path/to/file.mp4`

---

## Part 5: Upload a video

You need to put your `.mp4` file into the Storage Zone. Choose the option that matches how you’re working (phone or computer).

---

### Option A – From phone (Opera Mini or any mobile browser)

If you’re on a **phone** using **Opera Mini** (or Chrome, Safari, etc.), you do **not** use FileZilla. Use Bunny’s website in the browser instead.

1. **Open your browser** (Opera Mini or any browser on your phone).
2. Go to **https://bunny.net** and **log in**.
3. In the menu, tap **Storage** (or **Storage Zones**).
4. Tap your storage zone (e.g. **movihive-videos**).
5. Look for one of these:
   - **File Manager** or **Browse** or **Files** – tap it. Then look for an **Upload** or **+** button to add a file from your phone.
   - **Upload** – tap it and choose your `.mp4` from your phone (Photos, Files, or Downloads).
6. If you can upload, select your video file and wait for the upload to finish. Your video will then be in the storage zone (e.g. in the root or in a folder you created).
7. Your video URL will be: `https://YOUR-PULLZONE-HOSTNAME/YourVideo.mp4` (or `.../movies/YourVideo.mp4` if you put it in a `movies` folder). Use the **Pull Zone hostname** from Part 4.

**If you don’t see Upload or File Manager** on the Bunny site (some accounts or regions don’t have it):

- Use a **computer or laptop** and follow **Option B** (FileZilla) below, or  
- Install an **FTP app** on your phone (e.g. **AndFTP** on Android, **FTPManager** on iPhone), then use the **same** credentials:
  - **Host:** `storage.bunnycdn.com` (or the hostname from Bunny)
  - **Username:** `movihive-videos`
  - **Password:** your Bunny FTP password
  - **Port:** `21`  
  The app will have its own boxes for Host, Username, Password, Port – put each value in the right place, connect, then upload the file.

---

### Option B – Bunny dashboard on computer (if available)

1. On a computer, go to **https://bunny.net** and log in.
2. Go to **Storage** → your zone (e.g. `movihive-videos`).
3. If you see **File Manager** or **Browse**, open it.
4. Create a folder if you want (e.g. `movies`).
5. Click **Upload** and choose your `.mp4` file.
6. After upload, the file path might be like: `movies/MyMovie.mp4`.

Your full URL: `https://YOUR-PULLZONE-HOSTNAME/movies/MyMovie.mp4`

---

### Option C – FTP with FileZilla (on a computer only)

Use these **only in FileZilla** (the FTP program). Do **not** put them in MOVI HIVE or in the browser.

---

#### Where exactly to type them (FileZilla step by step)

1. **Download and install FileZilla**  
   Go to https://filezilla-project.org → download **FileZilla Client** → install and open it.

2. **Find the connection bar at the very top**  
   You’ll see a row of **white boxes** (input fields) with labels next to them. From left to right they are usually:
   - **Host**
   - **Username**
   - **Password**
   - **Port**
   - (then a **Quickconnect** button)

3. **Click in each box and type (or paste) as below:**

   - **Host** (first box)  
     Click in the first box. Type:  
     `storage.bunnycdn.com`  
     (Or the exact hostname from Bunny’s FTP & API Access page, e.g. `ny.storage.bunnycdn.com` if that’s what they show.)

   - **Username** (second box)  
     Click in the second box. Type:  
     `movihive-videos`  
     (Your storage zone name, exactly as in Bunny – no spaces.)

   - **Password** (third box)  
     Click in the third box. Paste the **main** password you copied from Bunny (FTP & API Access page).  
     Use the main **Password**, not the Read-only key.

   - **Port** (fourth box)  
     Click in the fourth box. Type:  
     `21`  
     (If it’s already 21, leave it.)

4. **Click the “Quickconnect” button** (next to the Port box).  
   FileZilla will connect to Bunny. The first time you might get a certificate popup – click **OK** or **Trust**.

5. **After it connects**  
   - The **right side** of the window = Bunny (your storage).  
   - The **left side** = your computer.  
   - Navigate on the left to the folder where your `.mp4` is.  
   - On the right you can right‑click → **Create directory** → name it `movies`.  
   - Then **right‑click your video file on the left** → **Upload** (or drag the file to the right).  
   When the upload finishes, your video is on Bunny.

**Summary – where each thing goes:**

| What you have        | Where it goes in FileZilla |
|----------------------|----------------------------|
| Host name            | **Host** (first box at top) |
| Username (zone name) | **Username** (second box)   |
| Password (main one)  | **Password** (third box)   |
| Port                 | **Port** (fourth box): `21` |

---

5. Click **Quickconnect** (or **Connect**). The first time, you may get a certificate warning – choose **Trust** / **OK**.
6. **Right side** of FileZilla = the server (your storage zone). You might see an empty folder or a path like `/`.
7. **Left side** = your computer. Go to the folder where your `.mp4` file is.
8. **Optional:** On the right (server), right‑click → **Create directory** → name it `movies` (so your URL will be `https://...../movies/YourFile.mp4`).
9. **Upload:** On the left, right‑click your `.mp4` file → **Upload** (or drag it to the right side). Wait until the transfer finishes.
10. Your video URL will be: `https://YOUR-PULLZONE-HOSTNAME/movies/YourFile.mp4` (use the **Pull Zone hostname** from Part 4, not `storage.bunnycdn.com`).

**If connection fails:**

- Use the **exact** hostname from Bunny’s **FTP & API Access** page (some regions use `ny.storage.bunnycdn.com`, `uk.storage.bunnycdn.com`, etc.).
- Make sure **Username** has no spaces and matches the storage zone name.
- Make sure **Password** is the one from **FTP & API Access** (not the read‑only key unless Bunny says to use it for FTP).
- Try **Port** `21` and enable **Plain FTP** (no SSL) if FileZilla has that option; Bunny FTP often uses plain FTP on port 21.

---

## Part 6: Use the URL in MOVI HIVE

1. **Copy the full video URL** (e.g. `https://movihive.b-cdn.net/movies/MyMovie.mp4`).
2. Open your MOVI HIVE app and log in as **Admin**.
3. Go to **Admin** (or Content / Movies).
4. Open the **movie or episode** you want to link.
5. Find the field **Video URL** (or **Video** / **Stream URL**).
6. **Paste** the Bunny URL there.
7. **Save** the title/episode.

When someone clicks **Play** on that title, the app will load the video from Bunny. No code changes needed.

---

## Part 7: If the video doesn’t play (CORS)

If the page stays on “Loading stream” or the browser console shows a **CORS** or **blocked** error:

1. In Bunny, go to **Pull Zones** → click your pull zone (e.g. `movihive`).
2. Open the **Security** or **Headers** or **CORS** section.
3. Find **CORS** or **Allowed Origins**.
4. Add your app’s URL(s), for example:
   - `https://your-app.vercel.app`
   - `https://www.moviehive.com`
   - `https://moviehive.com`
5. Or, for testing only, enable **Allow All Origins** (you can restrict it later).
6. Save.

Then try playing the video again in MOVI HIVE.

### If you see “403” or “Video source denied access”

The app streams video through its own server (proxy). If Bunny returns **403 Forbidden** to the server:

1. In Bunny **Pull Zone** → **Security** (or **Access**):
   - **Disable “Block direct linking”** if it’s on, or
   - Add your **API/server domain** (e.g. `moviehive-api.onrender.com`) to **Allowed Referrers** so the server’s requests are allowed.
2. Save and try again.

Using the **Pull Zone URL** (e.g. `https://yourzone.b-cdn.net/...`) in the Video URL field and allowing the server’s referrer usually fixes 403.

---

## Quick checklist

- [ ] Bunny account created and email confirmed  
- [ ] Payment method added (and optional spending limit set)  
- [ ] Storage Zone created, name and password noted  
- [ ] Pull Zone created and linked to that Storage Zone  
- [ ] Pull Zone hostname noted (e.g. `movihive.b-cdn.net`)  
- [ ] At least one `.mp4` uploaded to the Storage Zone  
- [ ] Full URL copied: `https://HOSTNAME/path/video.mp4`  
- [ ] That URL pasted into MOVI HIVE Admin → Video URL and saved  
- [ ] If needed, CORS set on the Pull Zone for your app’s domain  

---

## Cost (rough)

- **Storage:** about $0.01 per GB per month.  
- **Bandwidth:** about $0.01–0.02 per GB.  
- Example: 20 GB storage + 100 GB traffic per month ≈ **$1–3/month**.

More: [bunny.net/pricing](https://bunny.net/pricing)

---

## Need help?

- Bunny docs: [docs.bunny.net](https://docs.bunny.net)  
- Support: from the Bunny dashboard, use **Help** or **Support**.
