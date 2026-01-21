import admin from "firebase-admin";

let FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

let serviceAccount;

if (FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
} else {
  try {
    // Adjust path if your file is in a different location
    const module = await import(
      "../../bornfire-4bed9-firebase-adminsdk-fbsvc-2e1940fe6e.json",
      {
        with: { type: "json" },
      }
    );

    serviceAccount = module.default;
  } catch (err) {
    console.error(
      "Failed to load local Firebase service account JSON:",
      err.message
    );
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
