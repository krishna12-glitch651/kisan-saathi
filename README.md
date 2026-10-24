# Kisan Saathi

A voice-first website that helps farmers farm better and connects them directly with buyers, local delivery partners and farm-supply shops. It works in **Hindi, English, Marathi, Telugu and Tamil**, and every screen can be **read or listened to**.

**Live site:** https://kisan-saathi-90186.web.app
**Hackathon track:** Open Innovation

---

## The problem

- Farmers sell through many middlemen and get a small share of the price. Buyers cannot see who grew their food or how.
- Most farming advice online is in English text. Many farmers are more comfortable listening, in their own language.
- People do not know what nutrients everyday fruits and vegetables give them.
- Small farm-supply shops and village delivery people are hard to find online.
- Sharing phone numbers openly online invites scam calls.

## The solution

Two first screens set the app up for each person:

1. **Choose language:** Hindi, English, or *Other languages* (Marathi, Telugu, Tamil).
2. **Choose Read or Voice.** In Voice mode the app reads headings and cards aloud, every card has a Listen button, and every search box and form field has a mic button for speaking instead of typing.

A yellow **Ask** button stays on every screen. A farmer or buyer presses it and speaks a question, such as *"सेब में कौन से विटामिन हैं?"*, *"ग्राफ्टिंग कैसे करते हैं?"* or *"टमाटर बेचने वाले किसान"*. The app finds the answer in its own content, shows where it came from, and reads it aloud (see [Ask by voice](#ask-by-voice) below).

Then five sections:

| Section | What it does |
|---|---|
| **1. Kheti Gyan** | **Topics:** 11 topics: growing more, soil testing, fertilizer, irrigation, seeds, pests, weather, organic farming, farmer health & safety, government schemes, helplines. **Farming methods:** 36 proven methods that raise yield or income, each explained in 5 languages (see the list below) |
| **2. Fruits & Vegetables** | 21 fruits and 27 vegetables with full nutrition per 100 g (energy, protein, carbs, fat, fibre, vitamins A, B6, folate, C, D, E, K, iron, calcium, potassium) and "% of daily need". **Nutrient Finder** ranks the foods richest in any nutrient |
| **3. Farmers** | Farmers list their village, crops, farming method, fertilizers and sprays used, up to 4 farm photos and produce for sale with prices. Buyers search by crop or district and call directly |
| **4. Delivery** | Local delivery partners list their vehicle, areas and charges, so buyers far from a farm can get produce delivered |
| **5. Shop** | Fertilizer, seed and tool shops list products with prices. Farmers and buyers filter by type and call the shop |

### The 36 farming methods

| Group | Methods |
|---|---|
| New plants & grafting | Grafting, vegetable grafting (watermelon or cucumber on a pumpkin or bottle gourd root; tomato or brinjal on a wild brinjal root), budding, air layering (gootee), plants from cuttings, tissue culture plants, pro-tray nursery |
| Growing crops together | Intercropping, trap and border crops (marigold with tomato, mustard with cabbage), multilayer farming, relay cropping (utera / paira), crop rotation, integrated farming system (crops + dairy + fish + poultry), agroforestry |
| Soil & manure | Green manure (dhaincha, sunhemp), bio-fertilizers (Rhizobium, Azotobacter, PSB), jeevamrit (fermented mix), vermicompost, azolla, zero tillage and no stubble burning |
| Water & sowing | Drip irrigation and fertigation, mulching, farm pond, raised beds and ridge sowing, SRI method of paddy, direct seeded rice, laser land levelling |
| Modern methods & extra income | Polyhouse and shade net, low tunnels, trellis farming (machan), hydroponics, high density orchards, beekeeping for pollination, mushroom growing, integrated pest management, ratoon cropping |

### Ask by voice

Ask is a **search over the app's own content**. It never writes a new answer.

1. The phone turns speech into text (Web Speech API), in the chosen language.
2. `ask.js` cleans the words (Indian digits, spellings like ज़/ज, Hindi endings like सेबों/सेब, Telugu and Tamil endings like ఆపిల్‌లో or ஆப்பிளில்) and looks for:
   - a fruit or vegetable name and a nutrient → that food's row in the USDA table (*"केले में प्रोटीन"*),
   - a nutrient alone → the Nutrient Finder ranking (*"सबसे ज़्यादा आयरन किसमें है?"*),
   - "farmer / shop / delivery" or "buy / sell / where" → matching entries from the live lists (*"यूरिया कहाँ मिलेगा"*), without phone numbers,
   - otherwise the best-matching Kheti Gyan point or farming method, using keywords written in all 5 languages (*"तरबूज और कद्दू को जोड़कर खेती"* → vegetable grafting).
3. The answer card shows the source ("From: Farming methods", "From: Fruits & Vegetables (USDA)"), a Listen button and **Open full page**. Related answers from the app are listed below it.
4. If nothing matches well enough, the app says **it does not have an answer yet** and offers the Kisan Call Centre (1800 180 1551). It does not guess.

The matching was checked with 128 test questions in Hindi, English, Marathi, Telugu and Tamil.

### Trust and privacy

- Login with **Google (Gmail)**. After the first login, each person gives their mobile number and picks a role: buyer, farmer, shop owner or delivery partner.
- **Phone numbers are never public.** A number is shown only to a logged-in user who has filled their own profile, one number at a time. Downloading the whole list of numbers is blocked by the database rules.
- Each person can edit or delete only their own data, and can delete their whole account.
- All of this is enforced in `firestore.rules` on the server, not just hidden in the page.

## How it works

```
Phone browser
  ├─ HTML / CSS / JavaScript (no build step)      → Firebase Hosting
  ├─ Web Speech API: text-to-speech + speech-to-text (phone's own voices)
  ├─ Ask by voice: word search over the app's own content (ask.js)
  ├─ Firebase Authentication (Google sign-in)
  └─ Cloud Firestore database (+ security rules)
```

- Kheti Gyan, the farming methods and the nutrition data are stored inside the website itself, so these sections, and Ask questions about them, work even when the database cannot be reached.
- Farm photos are resized and compressed on the phone (HTML canvas) before saving, so a photo is about 50 KB. Everything runs on Firebase's free Spark plan.
- Lists update live: a new farmer, shop or delivery partner appears on everyone's screen without refreshing.

| Database collection | Who can read | Who can write |
|---|---|---|
| `users` (private profile) | only the owner | only the owner |
| `contacts` (phone numbers) | logged-in users with a profile, one at a time | only the owner |
| `farmers`, `farmPhotos` | everyone | the owner, if their role is farmer |
| `delivery` | everyone | the owner, if their role is delivery partner |
| `shops` | everyone | the owner, if their role is shop owner |

## Tech stack

HTML, CSS, JavaScript · Firebase Hosting · Firebase Authentication (Google) · Cloud Firestore · Web Speech API · Google Fonts (Hind family, Tiro family)

## What existed before the hackathon, and what is new

**Before Hack The Circle (version 1):**
- One-page website in Hindi and English, with farming information read aloud
- Sell-produce and buy-supplies lists and farm profiles, saved in Firestore with anonymous login
- Deployed on Firebase Hosting

**New in version 2 (built for the hackathon):**
- Five languages, plus the language and Read/Voice choice screens; voice and mic input in all five languages
- New structure with five sections; three new Kheti Gyan topics (growing more, organic farming, farmer health & safety)
- 36 farming methods in 5 languages, from grafting and vegetable grafting to SRI paddy, jeevamrit and beekeeping
- **Ask by voice:** spoken questions answered only from the app's own content, with the source shown and read aloud
- Fruits & Vegetables nutrition data for 48 foods, and the Nutrient Finder
- Google login, roles and profiles; private phone numbers with server-side rules
- Farmer profiles with photos and produce prices, a Delivery section and a Shop section
- New security rules, account deletion, and code split into separate files

The old version 1 data is still in the database but is locked and no longer shown.

## Run and deploy

You need [Node.js](https://nodejs.org) and the Firebase CLI.

```bash
npm install -g firebase-tools
firebase login
firebase deploy          # uploads the website and the database rules
```

In the Firebase console, turn on **Authentication → Sign-in method → Google**. Full step-by-step instructions are in [`SETUP-WINDOWS.md`](SETUP-WINDOWS.md), and a guide to every file is in [`HOW-IT-WORKS.md`](HOW-IT-WORKS.md).

## Data sources and credits

- **Nutrition values:** USDA FoodData Central (SR Legacy), raw food, per 100 g. Values that the source does not report are left blank. Daily values: US FDA reference for adults.
- **Farming methods:** general descriptions of widely practised methods. Schemes named there are public Government of India programmes: Pradhan Mantri Krishi Sinchayee Yojana, Mission for Integrated Development of Horticulture, National Beekeeping and Honey Mission.
- **Farming information:** general guidance based on public Government of India programmes: Soil Health Card, PM-KISAN, Pradhan Mantri Fasal Bima Yojana, Pradhan Mantri Krishi Sinchayee Yojana, Paramparagat Krishi Vikas Yojana, e-NAM, and the Kisan Call Centre (1800 180 1551). Users are told to confirm doses with their Krishi Vigyan Kendra.
- **Fonts:** Hind, Hind Guntur and Hind Madurai (Indian Type Foundry); Tiro Devanagari Hindi, Tiro Devanagari Marathi, Tiro Telugu and Tiro Tamil (Tiro Typeworks). All are served by Google Fonts under the SIL Open Font License.
- **Platform:** Firebase by Google.

## Known limits and next steps

- Phone numbers are typed in, not checked with an SMS code (SMS needs a paid plan). Next: SMS OTP verification.
- Delivery is arranged by phone call. Next: delivery requests and order tracking inside the app.
- Nutrition values are for raw food; cooking changes them.
- Ask understands questions by matching words, so a very long or unusual sentence may get "no answer yet". Speech-to-text quality depends on the phone, and on most Android phones it needs the internet (typing works offline).
- Ideas: daily mandi prices, weather alerts, a photo-based crop disease check, and offline use as an installable app.

## Folder structure

```
kisan-saathi/
├── public/                 the website
│   ├── index.html          page layout
│   ├── css/style.css       colours, fonts, layout
│   └── js/
│       ├── i18n.js         all screen text in 5 languages
│       ├── kheti.js        Kheti Gyan topics in 5 languages
│       ├── foods.js        fruits & vegetables nutrition data
│       ├── methods.js      36 farming methods in 5 languages
│       ├── ask.js          Ask by voice: finds answers in the app's content
│       ├── voice.js        read aloud + mic
│       ├── store.js        Firebase login + database
│       └── app.js          screens, sections and forms
├── tests/
│   ├── ask-test.js         checks Ask with 128 questions (node tests/ask-test.js)
│   └── ask-questions.json  the test questions in 5 languages
├── firestore.rules         database security rules
├── firebase.json           hosting settings
├── .firebaserc             Firebase project name
├── SETUP-WINDOWS.md        step-by-step setup
└── HOW-IT-WORKS.md         guide to every file
```
