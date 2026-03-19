import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const form = document.getElementById('register-form');
const nameInput = document.getElementById('reg-name');
const emailInput = document.getElementById('reg-email');
const passwordInput = document.getElementById('reg-password');
const btn = document.getElementById('reg-submit-btn');
const errorEl = document.getElementById('auth-error');

// Show/Hide provider type dropdown
const roleRadios = document.querySelectorAll('input[name="role"]');
const providerTypeContainer = document.getElementById('provider-type-container');
const providerTypeSelect = document.getElementById('reg-provider-type');

roleRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'provider') {
            providerTypeContainer.classList.remove('hidden');
            providerTypeSelect.setAttribute('required', 'true');
        } else {
            providerTypeContainer.classList.add('hidden');
            providerTypeSelect.removeAttribute('required');
        }
    });
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const email = emailInput.value;
    const password = passwordInput.value;
    const name = nameInput.value;
    const role = document.querySelector('input[name="role"]:checked').value;
    let providerType = null;
    if (role === 'provider') {
        providerType = providerTypeSelect.value;
    }

    const originalBtnText = btn.innerText;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(cred.user, { displayName: name });

        try {
            const userData = {
                uid: cred.user.uid,
                email,
                name,
                role,
                createdAt: new Date().toISOString()
            };
            if (providerType) {
                userData.providerType = providerType;
            }
            await set(ref(db, `users/${cred.user.uid}`), userData);
        } catch (dbError) {
            console.error("Database error during registration: ", dbError);
        }

        localStorage.setItem('mockRole', role); // Fallback reference
        window.location.href = `${role}.html`;

    } catch (error) {
        console.error(error);
        alert("Registration failed: " + error.message);
        errorEl.innerText = error.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
});
