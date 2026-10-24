# How Kisan Saathi works

A short guide to every file, so anyone on the team can explain the project.

## The big picture

The website is plain HTML, CSS and JavaScript, with no build step. Firebase Hosting serves the files. When the page opens:

1. `index.html` loads the Firebase library from Google, then our eight JavaScript files in order.
2. `app.js` checks what this phone remembers (language, Read/Voice mode, last section). On a first visit it shows the language screen, then the Read/Voice screen.
3. Kheti Gyan (topics and farming methods) and Fruits & Vegetables are drawn straight away from data inside the website.
4. Farmers, Delivery and Shop are loaded from the Firestore database the first time someone opens them, and stay live after that.

## Files

### `public/index.html`: the page skeleton
- The two first screens (language, Read/Voice), the top bar, the five sections, the bottom menu and one reusable pop-up window (`<dialog>`).
- Text is not written here. Elements have `data-i="key"`, and `app.js` fills in the text for the chosen language.

### `public/css/style.css`: the look
- Colour tokens at the top (`--field` green, `--wheat` yellow, `--soil` brown), with a dark-mode version.
- Fonts that support all scripts: **Hind** family for body text and **Tiro** family for headings. Marathi gets its own heading font.
- Phone-first layout: buttons are at least 44–48 px tall so they are easy to tap.

### `public/js/i18n.js`: all screen text
- `STR.en`, `STR.hi`, `STR.mr`, `STR.te`, `STR.ta`: the same keys in each language.
- `t('key')` in `app.js` picks the current language and falls back to English if a word is missing.
- Words like `{n}` are filled in by the app, for example "High in {n}" becomes "High in Vitamin C".

### `public/js/kheti.js`: farming topics
- `KHETI` is a list of 11 topics. Each has a title, a short line, points (heading + text), and sometimes a small fact table, in all 5 languages.

### `public/js/foods.js`: nutrition data
- `NUTRIENTS`: the 15 nutrients, their units and the daily value used for "% of daily need".
- `FOODS`: 48 fruits and vegetables. Each has names in 5 languages, extra search words (like *aam*, *palak*) and 15 numbers per 100 g from USDA FoodData Central. `null` means the source has no value.
- `HIGH_KEYS`: a food is tagged "High in X" when 100 g gives 20% or more of the daily need.

### `public/js/methods.js`: farming methods
- `FARM_METHOD_CATS`: the 5 groups (new plants & grafting, growing crops together, soil & manure, water & sowing, modern methods & extra income).
- `FARM_METHODS`: 36 methods. Each has an icon, a group, `k` (extra search words in all 5 languages, used by Ask) and, in each language, `t` (name), `s` (one line) and `how` (what it is, how it is done, what it gives).

### `public/js/ask.js`: Ask by voice
- `Ask.search(question, language, lists)` finds the answer **inside the app's own content** and returns it. It never writes new text.
- `norm` and `stem` make spoken and written words match: Indian digits become 0–9, ज़ = ज, and word endings are ignored (सेब/सेबों, बचाने/बचाएं, ఆపిల్/ఆపిల్‌లో, ஆப்பிள்/ஆப்பிளில்).
- `findFoods` finds fruit and vegetable names in any of the 5 languages. `findNutrients` finds words like protein, आयरन, విటమిన్ సి, வைட்டமின் ஏ.
- Kheti Gyan points and farming methods are searched with weighted words: a method's own keyword or title counts most, its text counts least, and words found in many places (like "farming") count less. A weak match is not accepted as an answer.
- Order of checks: food + nutrient → the food's values; farmer/shop/delivery or buy/sell words → the live lists; nutrient alone → Nutrient Finder; otherwise the best Kheti Gyan point or method. Nothing good → "not in this app yet".
- `tests/ask-test.js` runs 128 test questions in 5 languages: `node tests/ask-test.js`.

### `public/js/voice.js`: read aloud and mic
- `Voice.speak(text, lang)` uses the phone's text-to-speech (`speechSynthesis`) with an Indian voice for that language (hi-IN, en-IN, mr-IN, te-IN, ta-IN). Long text is split into sentences, because some phones stop after about 15 seconds.
- `Voice.listen(lang, …)` uses speech recognition. Digits spoken in Hindi, Telugu or Tamil script are changed to 0–9, so phone numbers work.

### `public/js/store.js`: Firebase (login + database)
- The only file that talks to Firebase. It holds `firebaseConfig`.
- Login: Google pop-up, with a full-page redirect if the phone blocks pop-ups.
- Database functions: `saveProfile`, `getContact`, `watch` (live lists), `saveListing`, `removeListing`, `deleteEverything`.
- If Firebase cannot load (no internet), `Store.online` is `false`, and the app shows a message instead of crashing.

### `public/js/app.js`: everything you see and press
- **Start screens:** `showStart`, `chooseLang`, `chooseMode`.
- **Drawing:** `applyLang` (re-draws everything in the new language), `renderKheti`, `renderMethods`, `renderFood`, `renderFinder`, `renderList` (Farmers, Delivery, Shop).
- **Farming methods:** `renderMethods` draws the 5 groups; `openMethod` opens one method in the pop-up.
- **Ask by voice:** `openAsk` opens the pop-up and starts the mic, `runAsk` sends the question to `Ask.search`, `answerView` draws the answer card (food table, finder ranking, method, Kheti Gyan point or list) and the text that is read aloud, `showAnswer` adds related answers.
- **Voice mode:** `listenBtn` adds the yellow Listen button only in Voice mode. `micBtn` adds the mic to boxes.
- **Pop-up:** `openDialog` / `closeDialog`. The phone's Back button closes the pop-up instead of leaving the site.
- **Login flow:** `openLogin` → `openProfile` (mobile number + role) → `openListingForm` (farm, delivery or shop form).
- **Photos:** `compressPhoto` resizes each photo to about 900 px and saves it as a JPEG of about 50–150 KB. `makeThumb` makes a 200 px square for the list.

### `firestore.rules`: database security
The server checks these rules on every read and write, whatever the page code says.
- `users`: only the owner can read or write their own profile. The phone number must be 10 digits starting with 6–9.
- `contacts`: one number can be read at a time, only by a logged-in user with a profile. Listing all numbers is blocked.
- `farmers`, `delivery`, `shops`: everyone can read (they hold no phone numbers). Only the owner can write, and only if their role matches. Field names, lengths and list sizes are checked.
- `listings`, `farms` (version 1): locked.

### `firebase.json` and `.firebaserc`
- `firebase.json`: upload the `public` folder as the website, and use `firestore.rules` for the database.
- `.firebaserc`: which Firebase project to deploy to (`kisan-saathi-90186`).

## What happens when someone presses **Ask**

1. The pop-up opens and the mic starts listening in the chosen language.
2. The phone's speech service turns the question into text, for example *"तरबूज और कद्दू को एक साथ जोड़कर खेती"*.
3. `Ask.search` finds the food names *watermelon* and *pumpkin*, sees that the question is about farming (not nutrients), and scores the farming methods. *Vegetable grafting* has the keywords तरबूज, कद्दू and जोड़कर, so it wins.
4. The answer card shows "From: Farming methods", the method's text, **Listen** and **Open full page**, plus related answers (watermelon nutrition, grafting).
5. Because the question was spoken, the answer is read aloud at once.
6. A question the app cannot answer (*"मोबाइल रिचार्ज"*) gets: "This app does not have an answer to this yet", with the Kisan Call Centre number.

## What happens when a buyer presses **Call**

1. Not logged in → the login pop-up opens.
2. Logged in but no profile → the profile form opens (mobile number + role).
3. Otherwise `Store.getContact(farmerId)` asks the database for that one number. The rules allow it because this user has a profile.
4. The button changes to **Call 98765 43210** with a `tel:` link that opens the phone's dialler.

## Questions judges may ask

**How do you stop fake users and scam callers?**
Login is with a real Google account. Numbers are hidden from the public and given out one at a time only to logged-in users with a profile, and the database refuses bulk downloads. Next step: SMS OTP to verify numbers (needs a paid plan).

**Why not OTP now?**
Firebase sends SMS only on the paid Blaze plan. We kept the project on the free plan and designed it so OTP can be added later without changing the database.

**Is it safe that the Firebase key is in the code?**
Yes. A Firebase web key only identifies the project and is public by design. Data is protected by the security rules.

**Where are photos stored?**
Firebase Storage needs the paid plan, so photos are compressed on the phone (about 50 KB each, at most 4 per farm) and saved in Firestore.

**How accurate is the nutrition data?**
It comes from USDA FoodData Central, per 100 g of raw food. The source is shown on the page, and values the source does not report are left blank instead of guessed. Real values change with variety, soil and season.

**Does Ask make up answers?**
No. Ask only picks content that is already in the app: a food's USDA values, the Nutrient Finder ranking, a Kheti Gyan point, one of the 36 farming methods, or entries from the lists. The source is shown on every answer. If nothing matches well enough, it says so and gives the Kisan Call Centre number.

**How does Ask understand five languages?**
Every food name, nutrient word and farming method has search words in Hindi, English, Marathi, Telugu and Tamil. The text is cleaned so that spelling and word endings do not matter. 128 test questions in all 5 languages are checked by `tests/ask-test.js`.

**Does voice work in every language?**
It uses the phone's own voices. Android's Google voice engine supports Hindi, English, Marathi, Telugu and Tamil. If a voice is missing, the app tells the user how to install it.

**What works without internet?**
Kheti Gyan, the farming methods and Fruits & Vegetables are inside the website, so they keep working if the database cannot be reached, and Ask can still answer typed questions about them. Farmers, Delivery and Shop need the internet. On most Android phones, speech-to-text also needs the internet.

**Can it handle many users?**
Firestore and Hosting scale automatically. The free plan allows 50,000 reads and 20,000 writes a day, which is enough to start.

**What did you build during the hackathon?**
See "What existed before the hackathon, and what is new" in `README.md`.
