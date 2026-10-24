/* =====================================================================
   Online database + login (Firebase).
   Everything that talks to Firebase is in this one file.

   Database collections:
     users/{uid}       private profile (name, phone, role, place) – only the owner can read
     contacts/{uid}    name + phone – only logged-in users with a profile can read
     farmers/{uid}     public farm profile (no phone number)
     farmPhotos/{uid}  farm photos (small JPEGs saved as text)
     delivery/{uid}    public delivery partner details (no phone number)
     shops/{uid}       public shop details and products (no phone number)
   ===================================================================== */

/* Firebase settings: Firebase console > Project settings > Your apps > Web app */
const firebaseConfig = {
  apiKey: "AIzaSyDnabkF4zIby9Ej32BydxIuToCipEI-bNk",
  authDomain: "kisan-saathi-90186.firebaseapp.com",
  projectId: "kisan-saathi-90186",
  storageBucket: "kisan-saathi-90186.firebasestorage.app",
  messagingSenderId: "558681005643",
  appId: "1:558681005643:web:d857da8522d66c93e3f7ce"
};

const Store = (() => {
  const LISTING = { farmer: 'farmers', shop: 'shops', delivery: 'delivery' };
  let auth = null, db = null, online = false;

  try {
    if (window.firebase) {
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      online = true;
      // Finish a login that went to Google's page and came back (used when pop-ups are blocked)
      auth.getRedirectResult().catch(() => {});
    }
  } catch (e) {
    console.warn('Firebase could not start', e);
    online = false;
  }

  const list = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  const col = name => db.collection(name);

  return {
    online,

    /* Login */
    onUser(cb) { if (!online) { cb(null); return; } auth.onAuthStateChanged(cb); },
    async login() {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await auth.signInWithPopup(provider);
      } catch (e) {
        // Some phones block pop-ups: go to Google's page and come back instead
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) {
          await auth.signInWithRedirect(provider);
          return;
        }
        throw e;
      }
    },
    logout() { return auth.signOut(); },

    /* Private profile + contact number */
    async getProfile(uid) {
      const d = await col('users').doc(uid).get();
      return d.exists ? d.data() : null;
    },
    saveProfile(uid, p) {
      const batch = db.batch();
      batch.set(col('users').doc(uid), p);
      batch.set(col('contacts').doc(uid), { name: p.name, phone: p.phone, updatedAt: p.updatedAt });
      return batch.commit();
    },
    async getContact(uid) {
      const d = await col('contacts').doc(uid).get();
      return d.exists ? d.data() : null;
    },

    /* Public lists: role = 'farmer' | 'shop' | 'delivery'. Calls cb again whenever the list changes. */
    watch(role, cb, onError) {
      return col(LISTING[role]).orderBy('updatedAt', 'desc').limit(300)
        .onSnapshot(s => cb(list(s)), onError);
    },
    async getListing(role, uid) {
      const d = await col(LISTING[role]).doc(uid).get();
      return d.exists ? Object.assign({ id: d.id }, d.data()) : null;
    },
    updateListing(role, uid, fields) {
      return col(LISTING[role]).doc(uid).update(fields);
    },
    async getFarmPhotos(uid) {
      const d = await col('farmPhotos').doc(uid).get();
      return d.exists ? (d.data().photos || []) : [];
    },
    saveListing(role, uid, data, photos) {
      const batch = db.batch();
      batch.set(col(LISTING[role]).doc(uid), data);
      if (role === 'farmer') batch.set(col('farmPhotos').doc(uid), { photos: photos || [], updatedAt: data.updatedAt });
      return batch.commit();
    },
    removeListing(role, uid) {
      const batch = db.batch();
      batch.delete(col(LISTING[role]).doc(uid));
      if (role === 'farmer') batch.delete(col('farmPhotos').doc(uid));
      return batch.commit();
    },

    /* Delete everything this user saved, then the login itself */
    async deleteEverything(uid) {
      const batch = db.batch();
      ['farmers', 'farmPhotos', 'shops', 'delivery', 'contacts', 'users'].forEach(c => batch.delete(col(c).doc(uid)));
      await batch.commit();
      try { await auth.currentUser.delete(); } catch (e) { await auth.signOut(); }
    }
  };
})();
