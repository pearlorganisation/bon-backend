import admin from "firebase-admin";
import serviceAccount from "../../bornfire-4bed9-firebase-adminsdk-fbsvc-2e1940fe6e.json" with { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin