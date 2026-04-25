// import admin from "./firebase.js";

// const sendFirebaseNotification = async ({ token, title, body, data }) => {
//   if (!token) return;

//   try {
//     await admin.messaging().send({
//       token,
//       notification: {
//         title,
//         body,
//       },
//       data,   
//     });

//     console.log("🔥 Firebase notification sent");
//   } catch (error) {
//     console.error("❌ Firebase error:", error.message);
//   }
// };

// export default sendFirebaseNotification;
