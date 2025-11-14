// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCAddflbWrZsfrA2RjpEaX1gXt1lyAiImw",
    authDomain: "bubbleout.netlify.com",
    databaseURL: "https://bubbledreams-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bubbledreams",
    storageBucket: ""
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export auth and db globally
window.auth = firebase.auth();
window.db = firebase.database();
