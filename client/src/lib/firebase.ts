// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD2XpZEKKKlXpafe83xKtb7ewsKOITcQtU",
  authDomain: "healthguard-71694.firebaseapp.com",
  projectId: "healthguard-71694",
  storageBucket: "healthguard-71694.firebasestorage.app",
  messagingSenderId: "1022442382620",
  appId: "1:1022442382620:web:5bb856973768dd33ea06d9",
  measurementId: "G-DTQ03200J1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };