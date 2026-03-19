import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export function checkAuth(requireRole = null) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userSnapshot = await get(ref(db, `users/${user.uid}`));
                const role = userSnapshot.exists() ? userSnapshot.val().role : localStorage.getItem('mockRole') || 'ngo';

                // If on landing page, login, or register and logged in, redirect to dashboard
                const path = window.location.pathname;
                if (path.endsWith('index.html') || path === '/' || path.endsWith('platerelay-vanilla/') || path.endsWith('login.html') || path.endsWith('register.html')) {
                    window.location.href = `${role}.html`;
                }

                // If on a specific dashboard, check if they have permission
                if (requireRole && requireRole !== role) {
                    window.location.href = `${role}.html`;
                }
            } catch (e) {
                const role = localStorage.getItem('mockRole') || 'provider';
                const path = window.location.pathname;
                if (path.endsWith('index.html') || path === '/' || path.endsWith('platerelay-vanilla/') || path.endsWith('login.html') || path.endsWith('register.html')) {
                    window.location.href = `${role}.html`;
                }
                if (requireRole && requireRole !== role) {
                    window.location.href = `${role}.html`;
                }
            }
        } else {
            // Not logged in but on a protected page
            if (requireRole) {
                console.log("No user session found, redirecting to login");
                alert("Redirecting you to Log In because your session expired or was interrupted.");
                window.location.href = 'login.html';
            }
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = 'index.html';
        });
    }
}

// Call automatically for Landing, Login, and Register pages
const currentPath = window.location.pathname;
if (currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('platerelay-vanilla/') || currentPath.endsWith('login.html') || currentPath.endsWith('register.html')) {
    checkAuth();
}
