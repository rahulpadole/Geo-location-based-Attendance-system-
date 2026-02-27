/**
 * Firebase Admin SDK Configuration
 * 
 * Note: This is for server-side operations only
 * Requires service account key JSON file
 */

const admin = require("firebase-admin");

// Your private key from the service account
// BE CAREFUL: Never commit this to GitHub!
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDgRM5lutoHueuv
MfMGcHaL5CEg0Cpp2WapQtuPgdTn8lnjVIgZvgi62jOmRJA1/dllfJ+bYsQr24rK
v3da3ByuppecgfB0hI/eFzENrwQL6WOcNYnRu4Fw/Xi9XlbmfmpYXubgRMj/rQB/
p8RLB8sjIg/N7o1AnDyR24sIptx2898WFUrFnoFMYRCx9DY7LJKxd7Erx0shkDwS
pheYqhkw3/i0WxNhTyYNlM92VaS8UPtSOEqinox0DC1kQ2Fi20dG0FJjk2AvDLIl
iraWeBU0Ui2FVvRvLIcIJ/xc4gtmDaAXtRug7pCQ/ana4hpoWPqdHUwNh3u2VLw6
GvSNB973AgMBAAECggEAGP+9J3HbTp6BkGyM89wixW056XfK198NUTN2rgSBlb6v
bmZvKroYLFvuWKED7Ot4Xuu0DuoaMUQDsJ4Ee/L/731Py85gM1zOJ1TbzvQCC3c0
ofuweoSK5UFxQrVQEoQSQ/owL4emBXoPYtYcohB4Va48/MOT/e5sggXASx1D2K5u
X+Wtne/Ir4VurEj4nFBH8GYnb6rh0WDxk5c/JZn+5APUVNuM70u/SyF7Sf0VMXXU
PMrZxXAOqPM8qfEJfd8BQppyGXnEwG3pJCPEYVOZgFkyHXtgrnQBrSSo/tlPwkHS
CXLtwCqBGra7JpGZxC/gNv3QA7RDlRoNQjhJpflAIQKBgQD9jOK8zm3lSIwn4BeG
ccOzgxEBVVY3xvJabnDkNoUkaKJwHo/zq3+KPNVohWYbrcFkwtjLqWGz/CmRWE++
79OvyfXnrDNqEaazeTyMMwsOkI2tOWfttR8eiqOO9hRwLvLMVJPNc7yNTqFQwfD3
dJq1qoQYaxMQBfnw+brp6AtHhQKBgQDib39cu219/vHlEYMt2XOQDc7XEY9A/nlV
T5vZvL+kQNUv4RHZAr3DSifio0SCDXlJv2PwONu0CP1fW5pdeflfFRb+Oe0JPcc4
BltqvEuc29XLzU50OuSFL2gVn+mMmxXRQ8YU7MEVWGuPuAKlb5jsQj0A7sqyqUnv
94Z0BV6vSwKBgBm0Urg5ZUK9XBgey8PBfMmSHAM6l4cIEEHCuIcqT80lHnKnZoiZ
dlCZYjk6bOOZdeW1Ky1aeqE4iy5E+bCtt5Q2sUtPVdcG+xNu0wiTlCdh2DsbesHK
fuElxPcVU3UcDVlRqbpGZXMd6ZS6VKeBlr2cD9A56rDRKkmXx6826w3RAoGAXmyC
Xuglu5HRy2UnH7p7D0pCw7ql00OK00F0SzMDc3o5rFKdv7H98e79fOv6iIUX2+H8
ydLcA1JwXhBz6aEQlU7VHMSJDP5/EeTMwFCu80VU/TyrB5r7anKfY80gdirByVcK
xfUIe18402C3ccd8rKDekYICcshXdcLxhXYryssCgYEA22m7X0Xv9l5uULYFR8oP
tEjPpcAP6Z9t8AIzUZoTbv1I+LHPaYLFtS0xppZGlN/3Bd2rSlAZ5qiAciB5kWlU
bahYCrQ178sMqXz4MI+X0pRFvO2+RNLpwNmApUed9t8AvxPBHttnbChfD2qdHXbZ
YtOZlXyuFxr7OCCnfjVC+zE=
-----END PRIVATE KEY-----`;

// Service account configuration
const serviceAccount = {
  type: "service_account",
  project_id: "geo-attendance-3c37e",
  private_key_id: "your-private-key-id", // You'll need to add this
  private_key: privateKey,
  client_email: "firebase-adminsdk@geo-attendance-3c37e.iam.gserviceaccount.com", // Update this
  client_id: "your-client-id", // You'll need to add this
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40geo-attendance-3c37e.iam.gserviceaccount.com"
};

// Initialize Admin SDK (only if not already initialized)
let adminApp;
if (!admin.apps.length) {
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: firebaseConfig.storageBucket
    });
    console.log("✅ Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", error);
  }
} else {
  adminApp = admin.app();
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();
const adminStorage = admin.storage();

module.exports = { adminDb, adminAuth, adminStorage, adminApp };