// Firebase Configuration
const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: ""
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export auth and db globally
window.auth = firebase.auth();
window.db = firebase.database();
