/* =====================================================================
   Ask by voice: finds the answer inside this website's own data.

   Nothing is written or guessed here. Every answer is one of:
     - a food's row from the nutrition table (foods.js),
     - a Nutrient Finder ranking (foods.js),
     - a Kheti Gyan point (kheti.js),
     - a farming method (methods.js),
     - entries from the Farmers, Shop or Delivery lists (database).
   If nothing matches well enough, the answer is "not in this app".

   Ask.search(question, lang, lists) → { best, related, words }
   ===================================================================== */
const Ask = (function () {
'use strict';

const LANGS = ['en', 'hi', 'mr', 'te', 'ta'];

/* ---------- Text clean-up so that spoken and written forms match ---------- */
function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[०-९௦-௯౦-౯]/g, d => String((d.charCodeAt(0) - 6) & 15))  // Indian digits → 0-9
    .toLowerCase()
    .replace(/[​-‍़]/g, '')   // invisible joiners, nukta (ज़ → ज)
    .replace(/ँ/g, 'ं')            // ँ → ं
    .replace(/ॅ/g, 'े')            // ॅ → े
    .replace(/ॉ/g, 'ो')            // ॉ → ो
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();
}
function words(s) { const n = norm(s); return n ? n.split(' ') : []; }

/* Hindi/Marathi word endings are ignored: सेब/सेबों, केला/केले, बचाने/बचाएं, फसल/फसलें.
   Telugu/Tamil: a final halant is ignored (endings are handled by "starts with" below). */
function stem(w) {
  if (/[ऀ-ॿ]/.test(w)) {
    let s = w;
    const a = s.replace(/(ने|ना|एं|ए|ओ|ों|ें|ये|या|यें)$/, '');
    if (a.length >= 2) s = a;                       // ने ना एं ए ओ ों ें ये या यें
    const b = s.replace(/[ािीेैोौं्]+$/, '');
    if (b.length >= 2) s = b;                       // final vowel signs, ं and ्
    return s;
  }
  return w.replace(/[்్]$/, '');
}
/* Two words are the same if equal after stem, or one starts with the other (4+ letters):
   ఆపిల్ ~ ఆపిల్‌లో, ஆப்பிள் ~ ஆப்பிளில், graft ~ grafting */
function same(a, b) {
  const A = stem(a), B = stem(b);
  if (A === B) return true;
  const [s, l] = A.length <= B.length ? [A, B] : [B, A];
  return s.length >= 4 && l.startsWith(s);
}
const set = list => list.map(norm).filter(Boolean);
function hasWord(list, w) { return list.some(x => same(x, w)); }

/* ---------- Word lists ---------- */
const STOP = new Set(set([
  // English
  'a', 'an', 'the', 'is', 'are', 'was', 'be', 'in', 'on', 'of', 'to', 'for', 'and', 'or', 'what', 'which', 'how', 'do', 'does', 'did',
  'i', 'me', 'my', 'we', 'our', 'you', 'it', 'its', 'this', 'that', 'there', 'any', 'tell', 'about', 'please', 'can', 'could', 'should',
  'much', 'many', 'with', 'from', 'have', 'has', 'contain', 'contains', 'give', 'show', 'list', 'food', 'foods', 'want', 'know', 'by', 'at', 'way', 'ways',
  // Hindi
  'में', 'मे', 'का', 'की', 'के', 'को', 'से', 'है', 'हैं', 'हे', 'हो', 'और', 'या', 'क्या', 'कैसे', 'कैसा', 'कैसी', 'कौन', 'कौनसा', 'कौनसी', 'कौनसे',
  'सा', 'सी', 'किस', 'किसमें', 'किसमे', 'किसके', 'कितना', 'कितनी', 'कितने', 'बताओ', 'बताइए', 'बताइये', 'बताएं', 'बताये', 'बता', 'बताना', 'मुझे', 'मेरे', 'मेरा', 'मेरी',
  'हम', 'हमें', 'आप', 'आपको', 'तुम', 'होता', 'होती', 'होते', 'होना', 'करें', 'करे', 'करते', 'करना', 'करने', 'कर', 'करो', 'किया', 'जाता', 'जाती',
  'जाते', 'जा', 'ये', 'यह', 'वह', 'वो', 'इस', 'उस', 'इसमें', 'उसमें', 'एक', 'लिए', 'लिये', 'पर', 'तो', 'भी', 'ही', 'नहीं', 'ना', 'न', 'जी',
  'चाहिए', 'चाहिये', 'सकते', 'सकता', 'सकती', 'वाला', 'वाली', 'वाले', 'बारे', 'रहा', 'रही', 'रहे', 'क्यों', 'कब', 'जानकारी', 'दो', 'दें', 'दे',
  'कुछ', 'सब', 'सभी', 'अपने', 'अपनी', 'अपना', 'तरीका', 'तरीके', 'विधि', 'उपाय', 'कि', 'भाई', 'भैया', 'सर', 'प्लीज', 'हेलो', 'नमस्ते', 'ठीक', 'अब', 'फिर',
  // Marathi
  'मध्ये', 'आहे', 'आहेत', 'कोणते', 'कोणती', 'कोणता', 'कसे', 'कशी', 'कसा', 'काय', 'कशात', 'कशामध्ये', 'कुठल्या', 'चा', 'ची', 'चे', 'च्या',
  'ने', 'नी', 'व', 'आणि', 'किंवा', 'करतात', 'करावे', 'करायचे', 'करा', 'सांगा', 'मला', 'आम्हाला', 'असते', 'असतात', 'हा', 'तो', 'ती', 'ते', 'या',
  'त्या', 'सर्व', 'किती', 'काही', 'पण', 'तर', 'साठी', 'पद्धत', 'पद्धती',
  // Telugu
  'లో', 'ఏ', 'ఏవి', 'ఏమి', 'ఏమిటి', 'ఎలా', 'ఉన్నాయి', 'ఉంది', 'ఉంటుంది', 'ఉంటాయి', 'దేనిలో', 'దేంట్లో', 'చేస్తారు', 'చేయాలి', 'చేయడం', 'చెప్పండి',
  'నాకు', 'మాకు', 'మరియు', 'లేదా', 'కి', 'కు', 'ని', 'ను', 'తో', 'గురించి', 'ఈ', 'ఆ', 'ఒక', 'కూడా', 'ఎంత', 'ఎన్ని', 'ఎందుకు', 'పద్ధతి', 'పద్ధతులు',
  // Tamil
  'இல்', 'என்ன', 'எந்த', 'எப்படி', 'உள்ளன', 'உள்ளது', 'உண்டு', 'எதில்', 'செய்வது', 'செய்ய', 'செய்கிறார்கள்', 'சொல்லுங்கள்', 'எனக்கு', 'மற்றும்',
  'அல்லது', 'ஒரு', 'இந்த', 'அந்த', 'கூட', 'எவ்வளவு', 'ஏன்', 'பற்றி', 'உள்ள', 'இருக்கிறது', 'இருக்கும்', 'ஆகும்', 'அது', 'இது', 'தான்', 'முறை', 'முறைகள்'
]));

/* Nutrients: spoken words → keys used in foods.js */
const NUT = {
  protein: ['protein', 'proteins', 'प्रोटीन', 'प्रोटिन', 'प्रथिने', 'ప్రోటీన్', 'ప్రోటీన్లు', 'మాంసకృత్తులు', 'புரதம்', 'புரோட்டீன்'],
  carbs: ['carb', 'carbs', 'carbohydrate', 'carbohydrates', 'कार्बोहाइड्रेट', 'कार्ब', 'कर्बोदके', 'कर्बोदक', 'కార్బోహైడ్రేట్లు', 'కార్బోహైడ్రేట్', 'பிண்டச்சத்து', 'மாவுச்சத்து', 'கார்போஹைட்ரேட்'],
  fat: ['fat', 'fats', 'वसा', 'फैट', 'चर्बी', 'स्निग्ध', 'फॅट', 'కొవ్వు', 'கொழுப்பு'],
  fiber: ['fiber', 'fibre', 'फाइबर', 'रेशा', 'रेशे', 'तंतुमय', 'फायबर', 'పీచు', 'ఫైబర్', 'நார்ச்சத்து', 'நார்'],
  kcal: ['energy', 'calorie', 'calories', 'kcal', 'ऊर्जा', 'उर्जा', 'कैलोरी', 'कॅलरी', 'శక్తి', 'కేలరీలు', 'కేలరీ', 'ஆற்றல்', 'கலோரி', 'கலோரிகள்'],
  iron: ['iron', 'आयरन', 'लोहा', 'लौह', 'लोह', 'ఇనుము', 'ఐరన్', 'இரும்பு', 'இரும்புச்சத்து'],
  calcium: ['calcium', 'कैल्शियम', 'कैल्सियम', 'कॅल्शियम', 'కాల్షియం', 'కాల్సియం', 'கால்சியம்', 'சுண்ணாம்புச்சத்து'],
  potassium: ['potassium', 'पोटैशियम', 'पोटेशियम', 'पोटॅशियम', 'పొటాషియం', 'பொட்டாசியம்'],
  folate: ['folate', 'folic', 'फोलेट', 'फोलिक', 'ఫోలేట్', 'ఫోలిక్', 'ஃபோலேட்', 'போலிக்', 'ஃபோலிக்']
};
const NUT_N = {}; Object.keys(NUT).forEach(k => { NUT_N[k] = set(NUT[k]); });

const VIT_WORDS = set(['vitamin', 'vitamins', 'vit', 'विटामिन', 'विटामीन', 'विटमिन', 'व्हिटॅमिन', 'व्हिटामिन', 'జీవసత్వాలు', 'విటమిన్', 'విటమిన్లు', 'வைட்டமின்', 'வைட்டமின்கள்', 'உயிர்ச்சத்து']);
/* Letter after the word "vitamin" */
const VIT_LETTER = {
  vitA: ['a', 'ए', 'ఎ', 'ఏ', 'ஏ'],
  b6: ['b', 'b6', 'बी', 'बी6', 'బి', 'బి6', 'பி', 'பி6'],
  vitC: ['c', 'सी', 'సి', 'சி'],
  vitD: ['d', 'डी', 'డి', 'டி'],
  vitE: ['e', 'ई', 'ఇ', 'ఈ', 'ஈ', 'இ'],
  vitK: ['k', 'के', 'కె', 'కే', 'கே'],
  folate: ['b9']
};
const VIT_LETTER_N = {}; Object.keys(VIT_LETTER).forEach(k => { VIT_LETTER_N[k] = VIT_LETTER[k].map(norm); });
const VIT_KEYS = ['vitA', 'b6', 'folate', 'vitC', 'vitD', 'vitE', 'vitK'];
const MIN_KEYS = ['iron', 'calcium', 'potassium'];
const ALL_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'vitA', 'b6', 'folate', 'vitC', 'vitD', 'vitE', 'vitK', 'iron', 'calcium', 'potassium'];

const MINERAL = set(['mineral', 'minerals', 'खनिज', 'खनिजे', 'ఖనిజాలు', 'ఖనిజ', 'தாதுக்கள்', 'தாது']);
const NUTRITION = set(['nutrition', 'nutrient', 'nutrients', 'nutritious', 'पोषण', 'पोषक', 'पौष्टिक', 'पोषणमूल्य', 'पोषकतत्व', 'पोषक्तत्व',
  'పోషకాలు', 'పోషక', 'పోషణ', 'పౌష్టిక', 'ஊட்டச்சத்து', 'ஊட்டச்சத்துக்கள்', 'சத்து', 'சத்துக்கள்']);
const MOST = set(['most', 'more', 'highest', 'richest', 'rich', 'top', 'maximum', 'best', 'सबसे', 'ज्यादा', 'जादा', 'अधिक', 'सर्वाधिक', 'भरपूर',
  'सर्वात', 'जास्त', 'ఎక్కువ', 'ఎక్కువగా', 'అధికంగా', 'అత్యధిక', 'అత్యధికంగా', 'అధిక', 'அதிகம்', 'அதிகமாக', 'அதிக', 'மிக', 'நிறைய']);
const FRUIT_W = set(['fruit', 'fruits', 'फल', 'फलों', 'फळ', 'फळे', 'फळांमध्ये', 'పండు', 'పండ్లు', 'పండ్లలో', 'பழம்', 'பழங்கள்', 'பழங்களில்']);
const VEG_W = set(['vegetable', 'vegetables', 'veg', 'veggies', 'सब्जी', 'सब्जियां', 'सब्जियों', 'भाजी', 'भाज्या', 'भाजीपाला', 'भाज्यांमध्ये',
  'కూరగాయ', 'కూరగాయలు', 'కూరగాయల్లో', 'காய்கறி', 'காய்கறிகள்', 'காய்கறிகளில்']);
const FARM_CTX = set(['soil', 'field', 'crop', 'crops', 'plant', 'plants', 'fertilizer', 'manure', 'मिट्टी', 'खेत', 'फसल', 'खाद', 'उर्वरक', 'पौधा',
  'पौधे', 'पौधों', 'जमीन', 'माती', 'शेत', 'पीक', 'खत', 'झाड', 'నేల', 'మట్టి', 'పొలం', 'పంట', 'ఎరువు', 'మొక్క', 'மண்', 'வயல்', 'பயிர்', 'உரம்', 'செடி']);

const ROLE_W = {
  farmer: set(['farmer', 'farmers', 'kisan', 'किसान', 'शेतकरी', 'రైతు', 'రైతులు', 'விவசாயி', 'விவசாயிகள்', 'உழவர்']),
  shop: set(['shop', 'shops', 'store', 'dukan', 'दुकान', 'दुकानें', 'दुकानदार', 'भंडार', 'दुकाने', 'దుకాణం', 'దుకాణాలు', 'షాప్', 'கடை', 'கடைகள்']),
  delivery: set(['delivery', 'deliver', 'transport', 'डिलीवरी', 'डिलिवरी', 'डिलिव्हरी', 'पहुंचाना', 'ढुलाई', 'गाडी', 'वाहन', 'डेलिवरी',
    'డెలివరీ', 'రవాణా', 'ట్రాన్స్పోర్ట్', 'டெலிவரி', 'போக்குவரத்து'])
};
const BUY = set(['buy', 'purchase', 'sell', 'sells', 'selling', 'seller', 'sellers', 'where', 'available', 'खरीद', 'खरीदना', 'खरीदें', 'खरीदने',
  'बेच', 'बेचता', 'बेचते', 'बेचने', 'बेचें', 'बिक्री', 'मिलेगा', 'मिलेगी', 'मिलेंगे', 'मिलता', 'मिलती', 'मिलते', 'कहां', 'विकत', 'विकणारा',
  'विकणारे', 'विक्री', 'विकतो', 'मिळेल', 'मिळतो', 'मिळते', 'कुठे', 'कोठे', 'కొనాలి', 'కొనడం', 'కొనుగోలు', 'అమ్మే', 'అమ్ముతారు', 'అమ్మకం', 'ఎక్కడ',
  'దొరుకుతుంది', 'దొరుకుతాయి', 'வாங்க', 'வாங்குவது', 'விற்கும்', 'விற்பவர்', 'விற்பனை', 'எங்கே', 'எங்கு', 'கிடைக்கும்']);

/* Words that are part of a food name but too general on their own */
const NAME_GENERIC = new Set(set(['పండు', 'ఆకులు', 'పచ్చి', 'के', 'पत्ते', 'पाने', 'हरी', 'हरा', 'हिरवी', 'हिरवे', 'लाल', 'பச்சை', 'பச்சைப்',
  'இலை', 'கீரை', 'leaves', 'green', 'flesh']));
/* A few common spoken names that are not in foods.js */
const EXTRA_NAMES = {
  sweetpotato: ['சர்க்கரைவள்ளி', 'शकरकंदी'], custardapple: ['शरीफा'], pumpkin: ['भोपळा'], watermelon: ['तरबूजा'],
  muskmelon: ['खरबूजे'], jackfruit: ['పనస'], greenchilli: ['मिरची', 'chili'], coriander: ['धनिया'], moringa: ['सहजन', 'मुनगा', 'முருங்கை'],
  peas: ['मटर', 'వటాణా'], corn: ['भुट्टा', 'मक्का'], okra: ['ladies finger']
};

/* Extra search words for Kheti Gyan topics (all languages) */
const KHETI_K = {
  grow: ['yield', 'increase', 'production', 'बढ़ाना', 'बढ़ाएं', 'बढ़ाने', 'పెంచడం', 'அதிகரிக்க', 'spacing', 'weed', 'weeds', 'पैदावार', 'उपज', 'उत्पादन', 'दूरी', 'खरपतवार', 'निराई', 'तण', 'అంతరం', 'దిగుబడి', 'కలుపు', 'மகசூல்', 'விளைச்சல்', 'களை'],
  soil: ['soil', 'test', 'testing', 'ph', 'sample', 'मिट्टी', 'मृदा', 'जांच', 'नमूना', 'माती', 'परीक्षण', 'नमुना', 'నేల', 'మట్టి', 'పరీక్ష', 'నమూనా', 'மண்', 'பரிசோதனை', 'மாதிரி'],
  fert: ['fertilizer', 'fertiliser', 'urea', 'dap', 'potash', 'mop', 'npk', 'खाद', 'उर्वरक', 'यूरिया', 'डीएपी', 'पोटाश', 'खत', 'युरिया', 'ఎరువు', 'ఎరువులు', 'యూరియా', 'உரம்', 'யூரியா'],
  water: ['irrigation', 'sprinkler', 'water', 'सिंचाई', 'पानी', 'स्प्रिंकलर', 'फव्वारा', 'सिंचन', 'पाणी', 'తుంపర', 'సాగునీరు', 'నీరు', 'నీటి', 'பாசனம்', 'தெளிப்பு', 'நீர்'],
  seed: ['seed', 'seeds', 'sowing', 'rabi', 'kharif', 'बीज', 'बुवाई', 'बीजोपचार', 'रबी', 'खरीफ', 'बियाणे', 'पेरणी', 'बीजप्रक्रिया', 'విత్తనం', 'విత్తనాలు', 'విత్తడం', 'రబీ', 'ఖరీఫ్', 'விதை', 'விதைப்பு'],
  pest: ['pest', 'pests', 'disease', 'insect', 'insects', 'spray', 'कीट', 'कीडे', 'रोग', 'बीमारी', 'दवा', 'छिडकाव', 'कीड', 'फवारणी', 'పురుగు', 'పురుగులు', 'తెగులు', 'తెగుళ్లు', 'పిచికారీ', 'பூச்சி', 'நோய்', 'தெளிப்பு'],
  weather: ['weather', 'rain', 'frost', 'heat', 'heatwave', 'मौसम', 'बारिश', 'पाला', 'लू', 'गर्मी', 'हवामान', 'पाऊस', 'गारपीट', 'थंडी', 'వాతావరణం', 'వర్షం', 'మంచు', 'వడగాలి', 'வானிலை', 'மழை', 'பனி', 'வெப்பம்'],
  organic: ['organic', 'natural', 'compost', 'जैविक', 'प्राकृतिक', 'कम्पोस्ट', 'कंपोस्ट', 'सेंद्रिय', 'नैसर्गिक', 'సేంద్రియ', 'ప్రకృతి', 'కంపోస్ట్', 'இயற்கை', 'அங்கக'],
  safety: ['safety', 'safe', 'health', 'snake', 'snakebite', 'poison', 'mask', 'gloves', 'सुरक्षा', 'सांप', 'जहर', 'सर्पदंश', 'स्वास्थ्य', 'साप', 'विषबाधा', 'आरोग्य', 'సురక్షితం', 'భద్రత', 'పాము', 'పాముకాటు', 'విషం', 'ఆరోగ్యం', 'பாதுகாப்பு', 'பாம்பு', 'பாம்புக்கடி', 'விஷம்', 'உடல்நலம்'],
  schemes: ['scheme', 'schemes', 'yojana', 'pm kisan', 'insurance', 'bima', 'credit card', 'kcc', 'loan', 'सरकारी', 'योजना', 'सम्मान', 'निधि', 'बीमा', 'क्रेडिट', 'कर्ज', 'लोन', 'विमा', 'పథకం', 'పథకాలు', 'బీమా', 'రుణం', 'திட்டம்', 'திட்டங்கள்', 'காப்பீடு', 'கடன்'],
  help: ['helpline', 'call centre', 'call center', 'ambulance', 'mandi', 'kvk', 'हेल्पलाइन', 'कॉल', 'सेंटर', 'एम्बुलेंस', 'मंडी', 'भाव', 'केवीके', 'बाजारभाव', 'रुग्णवाहिका', 'హెల్ప్లైన్', 'కాల్', 'సెంటర్', 'అంబులెన్స్', 'మండీ', 'ధరలు', 'அவசர', 'ஆம்புலன்ஸ்', 'சந்தை', 'கால்', 'சென்டர்']
};

/* ---------- Foods: name phrases in all languages ---------- */
let foodPhrases = null;   // [{ f, toks:[...] }]
function buildFoods() {
  foodPhrases = [];
  const add = (f, text) => {
    const toks = words(text).filter(w => !NAME_GENERIC.has(w));
    if (toks.length) foodPhrases.push({ f, toks });
  };
  FOODS.forEach(f => {
    f.n.forEach(name => {
      add(f, name.replace(/\(.*?\)/g, ' '));
      const inside = name.match(/\((.*?)\)/);
      if (inside) add(f, inside[1]);
    });
    words(f.alias || '').forEach(w => add(f, w));
    (EXTRA_NAMES[f.id] || []).forEach(w => add(f, w));
  });
}
/* Short names (आम, मटर…) must match exactly, longer ones may carry endings (सफरचंदात) */
function tokMatch(q, name) {
  const n = stem(name);
  if (n.length <= 3 || stem(q).length <= 3) {
    if (stem(q) === n) return true;
    // Telugu/Tamil add endings to short names too: జామ → జామలో
    return /[\u0B80-\u0C7F]/.test(n) && n.length === 3 && q.startsWith(n) && q.length - n.length <= 4;
  }
  return same(q, name);
}
function findFoods(qt) {
  if (!foodPhrases) buildFoods();
  const hits = [];
  foodPhrases.forEach(p => {
    const used = [];
    for (const nt of p.toks) {
      const i = qt.findIndex((w, j) => !used.includes(j) && tokMatch(w, nt));
      if (i < 0) return;
      used.push(i);
    }
    hits.push({ f: p.f, used });
  });
  // keep the longest match for each food, then drop a food whose words are inside another's (sweet potato ⊃ potato)
  const best = new Map();
  hits.forEach(hh => { const b = best.get(hh.f); if (!b || hh.used.length > b.used.length) best.set(hh.f, hh); });
  const list = [...best.values()];
  const keep = list.filter(a => !list.some(b => b !== a && b.used.length > a.used.length && a.used.every(i => b.used.includes(i))));
  const usedIdx = new Set(); keep.forEach(k => k.used.forEach(i => usedIdx.add(i)));
  // order of mention in the question
  keep.sort((a, b) => Math.min(...a.used) - Math.min(...b.used));
  return { foods: keep.map(k => k.f), usedIdx };
}

/* ---------- Nutrients asked ---------- */
function findNutrients(qt) {
  const keys = []; let vit = false, min = false, all = false; const usedIdx = new Set();
  qt.forEach((w, i) => {
    Object.keys(NUT_N).forEach(k => { if (hasWord(NUT_N[k], w)) { if (!keys.includes(k)) keys.push(k); usedIdx.add(i); } });
    if (hasWord(VIT_WORDS, w)) {
      usedIdx.add(i);
      const next = qt[i + 1];
      const after = qt[i + 2];
      let found = null;
      if (next !== undefined) {
        Object.keys(VIT_LETTER_N).forEach(k => {
          if (!VIT_LETTER_N[k].includes(next)) return;
          if (k === 'vitK' && next === norm('के') && after && /^(बार|बारे)/.test(after)) return;   // "विटामिन के बारे में"
          found = k;
        });
        if (next === 'b' && after === '6') found = 'b6';
        if (next === 'b' && after === '9') found = 'folate';
      }
      if (found) { if (!keys.includes(found)) keys.push(found); usedIdx.add(i + 1); }
      else vit = true;
    }
    if (hasWord(MINERAL, w)) { min = true; usedIdx.add(i); }
    if (hasWord(NUTRITION, w)) { all = true; usedIdx.add(i); }
  });
  return { keys, vit, min, all, usedIdx };
}

/* ---------- Kheti Gyan + farming methods: weighted word index per language ---------- */
const docCache = {};
function put(doc, t, w) { if (!doc.w.has(t) || doc.w.get(t) < w) doc.w.set(t, w); }
function addField(doc, text, w) {
  words(text).forEach(t => { if (!STOP.has(t)) put(doc, t, w); });
}
/* A one-word keyword is strong. In a two-word keyword ("बिना मिट्टी", "call centre")
   each word alone is weak, and the two words together are the strongest match. */
function addKeyword(doc, text, w) {
  const t = words(text).filter(x => !STOP.has(x));
  if (t.length === 1) { put(doc, t[0], w); doc.kw.add(t[0]); return; }
  t.forEach(x => put(doc, x, Math.min(w, 3)));
  for (let i = 0; i + 1 < t.length; i++) { put(doc, t[i] + t[i + 1], w + 1); doc.kw.add(t[i] + t[i + 1]); }
}
function pairs(t) { const out = []; for (let i = 0; i + 1 < t.length; i++) out.push(t[i] + t[i + 1]); return out; }
function buildDocs(l) {
  const docs = [];
  if (typeof FARM_METHODS !== 'undefined') {
    FARM_METHODS.forEach(m => {
      const c = m[l] || m.en, doc = { kind: 'method', m, w: new Map(), kw: new Set() };
      addField(doc, c.how, 1);
      LANGS.forEach(o => { if (o !== l && m[o]) addField(doc, m[o].t, 2); });
      addField(doc, c.s, 2);
      addField(doc, c.t, 5);
      m.k.forEach(k => addKeyword(doc, k, 6));
      docs.push(doc);
    });
  }
  KHETI.forEach(tp => {
    const c = tp[l] || tp.en;
    const topicWords = KHETI_K[tp.id] || [];
    c.p.forEach((p, i) => {
      const doc = { kind: 'kheti', tp, i, w: new Map(), kw: new Set() };
      addField(doc, p[1], 1);
      addField(doc, c.s, 1);
      addField(doc, c.t, 2);
      topicWords.forEach(k => addKeyword(doc, k, 4));
      addField(doc, p[0], 4);
      docs.push(doc);
    });
    if (c.tb) {
      const doc = { kind: 'kheti', tp, i: -1, w: new Map(), kw: new Set() };
      addField(doc, c.tb.map(r => r.join(' ')).join(' '), 4);
      addField(doc, c.t, 2);
      topicWords.forEach(k => addKeyword(doc, k, 4));
      docs.push(doc);
    }
  });
  docCache[l] = docs;
  return docs;
}
function scoreDocs(qt, l) {
  const docs = docCache[l] || buildDocs(l);
  const N = docs.length;
  const out = docs.map(d => ({ d, s: 0, hits: 0, maxW: 0, idf: 0, kwHit: false, words: [] }));
  qt.forEach(q => {
    const per = docs.map(d => {
      let best = 0;
      d.w.forEach((w, t) => { if (w > best && tokMatch(q, t)) best = w; });
      return best;
    });
    const df = per.filter(Boolean).length;
    if (!df) return;
    const idf = Math.log(1 + N / df);
    per.forEach((w, i) => {
      if (!w) return;
      const o = out[i];
      o.s += w * idf; o.hits++; o.words.push(q);
      if (w > o.maxW) { o.maxW = w; o.idf = idf; }
      if (!o.kwHit) for (const k of docs[i].kw) if (tokMatch(q, k)) { o.kwHit = true; break; }
    });
  });
  return out.filter(x => x.s > 0).sort((a, b) => b.s - a.s);
}
/* A document is a real answer only with a good score, and either two matching words,
   or one strong match (a title or a keyword) on a word that is not common, like "farming".
   A question of one word may also match one of the document's own keywords ("soil"). */
const DOC_MIN = 7;
const goodFor = n => x => x.s >= (n === 1 ? 5 : DOC_MIN) &&
  (x.hits >= 2 || (x.maxW >= 4 && (x.idf >= 1.7 || (n === 1 && x.kwHit))));

/* ---------- Farmers / Shop / Delivery lists ---------- */
function labelsAll(key, sub) {
  return LANGS.map(l => (STR[l] && STR[l][key] && STR[l][key][sub]) || '').join(' ');
}
function listHay(role, x) {
  const base = [x.name, x.village, x.district, x.state, x.about];
  if (role === 'farmer') base.push((x.crops || []).join(' '), (x.produce || []).map(p => p.name).join(' '), x.inputs, x.method ? labelsAll('methods', x.method) : '');
  if (role === 'shop') base.push(x.shopName, (x.products || []).map(p => p.name + ' ' + labelsAll('cats', p.cat)).join(' '));
  if (role === 'delivery') base.push(x.areas, x.vehicle ? labelsAll('vehicles', x.vehicle) : '');
  return words(base.filter(Boolean).join(' '));
}
function searchList(role, items, groups) {
  // groups: list of word groups; an item matches a group if any word in it is found
  if (!groups.length) return items.slice();
  return items.map(x => {
    const hay = listHay(role, x);
    const n = groups.filter(g => g.some(w => hay.some(hw => tokMatch(w, hw)))).length;
    return { x, n };
  }).filter(r => r.n > 0).sort((a, b) => b.n - a.n).map(r => r.x);
}

/* ---------- Main search ---------- */
function search(question, lang, lists) {
  lists = lists || {};
  const l = LANGS.includes(lang) ? lang : 'en';
  const all = words(question);
  const N = findNutrients(all);                       // positions in `all`
  const qi = all.map((w, i) => i).filter(i => !STOP.has(all[i]) || N.usedIdx.has(i));
  const qt = qi.map(i => all[i]);
  const result = { best: { kind: 'none' }, related: [], words: qt };
  if (!qt.length) return result;

  const F = findFoods(qt);                            // positions in `qt`
  const most = qt.some(w => hasWord(MOST, w));
  const fruit = qt.some(w => hasWord(FRUIT_W, w)), veg = qt.some(w => hasWord(VEG_W, w));
  const farmCtx = qt.some(w => hasWord(FARM_CTX, w));
  const roles = Object.keys(ROLE_W).filter(r => qt.some(w => hasWord(ROLE_W[r], w)));
  const buy = qt.some(w => hasWord(BUY, w));

  // Words that are not about nutrients, buying or roles: what the question is really about
  const intentWord = w => hasWord(MOST, w) || hasWord(BUY, w) || Object.values(ROLE_W).some(r => hasWord(r, w)) || hasWord(FRUIT_W, w) || hasWord(VEG_W, w);
  const rest = qi.filter((i, j) => !F.usedIdx.has(j) && !N.usedIdx.has(i) && !intentWord(all[i])).map(i => all[i]);

  const docWords = qi.filter(i => !STOP.has(all[i])).map(i => all[i]);
  const docs = scoreDocs(docWords.concat(pairs(docWords)), l);
  const goodDocs = docs.filter(goodFor(docWords.length));
  const docItem = x => (x.d.kind === 'method' ? { kind: 'method', m: x.d.m } : { kind: 'kheti', tp: x.d.tp, i: x.d.i });
  const askedNutrient = N.keys.length || N.vit || N.min || N.all;
  const nutMode = N.keys.length ? 'keys' : N.vit ? 'vit' : N.min ? 'min' : 'all';
  const nutKeys = N.keys.length ? N.keys : N.vit ? VIT_KEYS : N.min ? MIN_KEYS : ALL_KEYS;
  const foodItem = () => ({ kind: 'food', foods: F.foods.slice(0, 4), keys: nutKeys, mode: nutMode });
  const finderItem = () => {
    const type = fruit && !veg ? 'fruit' : veg && !fruit ? 'veg' : 'all';
    if (N.keys.length) return { kind: 'finder', key: N.keys[0], type };
    return { kind: 'pick', keys: N.vit ? VIT_KEYS : N.min ? MIN_KEYS : FINDER_KEYS.slice(), type };
  };
  // For food, finder and list answers, only documents about the food or the other words are related
  const topicWords = rest.concat(qt.filter((w, j) => F.usedIdx.has(j)));
  const aboutTopic = x => x.words.some(w => topicWords.includes(w));
  const finish = (best, relDocs) => {
    result.best = best;
    const rel = [];
    (relDocs || goodDocs.filter(aboutTopic)).forEach(x => {
      const it = docItem(x);
      if (rel.length < 3 && !sameItem(it, best)) rel.push(it);
    });
    if (F.foods.length && best.kind !== 'food') rel.unshift({ kind: 'food', foods: F.foods.slice(0, 1), keys: ALL_KEYS, mode: 'all' });
    result.related = rel.slice(0, 3);
    return result;
  };

  // 1. A nutrient of a named food: "सेब में कौन से विटामिन हैं?"
  if (askedNutrient && F.foods.length) return finish(foodItem());

  // 2. Farmers, shops, delivery partners: "टमाटर बेचने वाले किसान", "यूरिया कहाँ मिलेगा"
  const groups = rest.map(w => [w]);
  F.foods.forEach(f => groups.push(f.n.concat(words(f.alias || '')).flatMap(n => words(n.replace(/[()]/g, ' '))).filter(w => !NAME_GENERIC.has(w))));
  const listRoles = roles.length ? roles : (buy && groups.length ? ['farmer', 'shop'] : []);
  let listAnswer = null;
  for (const role of listRoles) {
    const items = lists[role];
    if (!Array.isArray(items)) {
      if (roles.length && !listAnswer) listAnswer = { kind: 'list', role, items: [], status: items === null && !lists.offline ? 'loading' : 'offline' };
      continue;
    }
    const found = searchList(role, items, groups);
    if (found.length) {
      if (role === 'delivery') found.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0));
      listAnswer = { kind: 'list', role, items: found, status: 'ok' };
      break;
    }
    if (roles.length && !listAnswer) listAnswer = { kind: 'list', role, items: [], status: 'empty' };
  }
  // "टमाटर बेचने वाले किसान" is clearly about the list, even when it is empty or still loading.
  // "किसान सम्मान निधि" only has the word farmer, and is answered by Kheti Gyan.
  const clearlyList = roles.length && (buy || F.foods.length);
  if (listAnswer && (listAnswer.status === 'ok' || clearlyList || !goodDocs.length)) return finish(listAnswer);

  // 3. "Which food has the most iron?" (not about soil or crops)
  if (askedNutrient && !(farmCtx && goodDocs.length)) return finish(finderItem());

  // 4. Only a food name: "पपीता", "papaya ke bare mein batao"
  if (F.foods.length && !rest.length) return finish(foodItem());

  // 5. Kheti Gyan point or farming method
  if (goodDocs.length) return finish(docItem(goodDocs[0]), goodDocs.slice(1));

  // 6. A food was named with other words that matched nothing
  if (F.foods.length) return finish(foodItem());
  if (askedNutrient) return finish(finderItem());

  // Nothing in the app answers this: say so honestly, with no guesses
  return result;
}

function sameItem(a, b) {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'method') return a.m === b.m;
  if (a.kind === 'kheti') return a.tp === b.tp && a.i === b.i;
  return false;
}

return { search, norm, words };
})();
