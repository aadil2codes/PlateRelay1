import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const form = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const btn = document.getElementById('login-submit-btn');
const errorEl = document.getElementById('auth-error');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const email = emailInput.value;
    const password = passwordInput.value;

    const originalBtnText = btn.innerText;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
    btn.disabled = true;

    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);

        // Fetch role to redirect to correct dashboard
        try {
            const userSnapshot = await get(ref(db, `users/${cred.user.uid}`));
            const role = userSnapshot.exists() ? userSnapshot.val().role : localStorage.getItem('mockRole') || 'ngo';
            window.location.href = `${role}.html`;
        } catch (dbErr) {
            console.error("Error fetching user data:", dbErr);
            const role = localStorage.getItem('mockRole') || 'ngo';
            window.location.href = `${role}.html`;
        }

    } catch (error) {
        console.error(error);
        alert("Login failed: " + error.message);
        errorEl.innerText = error.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
});
