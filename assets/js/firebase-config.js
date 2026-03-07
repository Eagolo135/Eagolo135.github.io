export const SITE_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export function isFirebaseConfigured() {
  return Boolean(
    SITE_FIREBASE_CONFIG.apiKey &&
      SITE_FIREBASE_CONFIG.authDomain &&
      SITE_FIREBASE_CONFIG.projectId &&
      SITE_FIREBASE_CONFIG.appId
  );
}
