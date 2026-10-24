# Setup and deploy on Windows

You already have Node.js and the Firebase tools from version 1. These steps put version 2 live on the same link.

## 1. Turn on Google login (one time, in the browser)

1. Open https://console.firebase.google.com and click the **kisan-saathi** project.
2. Left menu: **Build → Authentication → Sign-in method**.
3. Click **Add new provider → Google**. Switch on **Enable**, choose your email as the support email, and click **Save**.
4. Optional: in the same list, click **Anonymous** and switch it off. Version 2 does not use it.
5. Still in Authentication, open **Settings → Authorized domains** and check that `kisan-saathi-90186.web.app` and `kisan-saathi-90186.firebaseapp.com` are listed. They are added automatically, so you usually do not need to change anything.

## 2. Put the new files in place

1. Rename your old folder `Downloads\kisan-saathi` to `kisan-saathi-v1`. Keep it as a backup and as proof of what existed before the hackathon.
2. Right-click the new zip → **Extract All** → **Extract**. You get a new `kisan-saathi` folder that has `public`, `firestore.rules`, `firebase.json` and `.firebaserc` directly inside it.

## 3. Deploy

1. Open the new `kisan-saathi` folder, the one that has `firebase.json` directly inside it.
2. Click the address bar at the top, type `cmd` and press **Enter**. A black Command Prompt window opens in that folder.
3. Run:
   ```
   firebase deploy
   ```
   If it asks you to log in, run `firebase login` first, then `firebase deploy` again.
4. Wait for **Deploy complete!**. This uploads the website **and** the new database rules.

## 4. Check it

1. Open https://kisan-saathi-90186.web.app and press **Ctrl + Shift + R** to skip the old copy.
2. On a phone, open the link in **Chrome**. If you see the old version, pull down to refresh.
3. Try everything once:
   - choose a language, then Voice;
   - log in with Gmail, enter your mobile number and choose **Farmer**;
   - add your farm with a photo;
   - from a second Gmail account (a friend's phone), choose **Buyer** and press **Call** on your farm;
   - press the yellow **Ask** button, allow the microphone, and say *"सेब में कौन से विटामिन हैं"* or *"ग्राफ्टिंग कैसे करते हैं"*;
   - open **Kheti Gyan → Farming methods** and check the 36 methods.

## 5. Voices on the phone

For Voice mode, the phone needs the voice for that language: **Settings → Text-to-speech (or Google TTS) → Install voice data →** Hindi, Marathi, Telugu, Tamil. Most Android phones already have Hindi and English.

## 6. Upload to GitHub (for Round 1)

1. On github.com, click **New repository**, name it `kisan-saathi`, choose **Public**, and click **Create repository**.
2. Click **uploading an existing file**, drag everything from inside the `kisan-saathi` folder into the page, and click **Commit changes**.
3. Open the repository in a private/incognito window to check that it is public.

## If something goes wrong

| What you see | What to do |
|---|---|
| `'firebase' is not recognized` | Install Node.js from nodejs.org, then run `npm install -g firebase-tools` |
| Login says *operation not allowed* | Google sign-in is not enabled (step 1) |
| Login says *unauthorized domain* | Add your site's domain in Authentication → Settings → Authorized domains |
| Login page does not open from WhatsApp | Open the link in Chrome (Google blocks login inside some apps) |
| *Missing or insufficient permissions* when saving | The rules were not uploaded. Run `firebase deploy --only firestore:rules` |
| Old version still shows | Ctrl + Shift + R on laptop; pull to refresh on phone |
| Ask says the mic does not work | Allow the microphone for the site (lock icon next to the address), open the site in Chrome, or type the question |
