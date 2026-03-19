import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, push, onValue, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { checkAuth } from "./auth-check.js";

// Ensure auth protects this route for the provider role
checkAuth('provider');

let currentUser = null;

const el = {
    form: document.getElementById('post-donation-form'),
    providerName: document.getElementById('post-provider-name'),
    mobileNumber: document.getElementById('post-mobile-number'),
    orgName: document.getElementById('post-org-name'),
    specialNotes: document.getElementById('post-special-notes'),
    foodName: document.getElementById('post-food-name'),
    quantity: document.getElementById('post-quantity'),
    location: document.getElementById('post-location'),
    btnGetLocation: document.getElementById('btn-get-location'),
    time: document.getElementById('post-time'),
    container: document.getElementById('provider-listings-container'),
    btn: document.getElementById('post-btn')
};

let currentVerifiedCoords = null;
let providerMapInstance = null;
let providerMarker = null;

function initProviderMap() {
    providerMapInstance = L.map('osm-map-mess').setView([28.6139, 77.2090], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(providerMapInstance);

    providerMapInstance.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        setProviderMarker(lat, lng);
        await reverseGeocode(lat, lng);
    });
}

function setProviderMarker(lat, lng) {
    currentVerifiedCoords = { lat, lng };
    if (providerMarker) providerMapInstance.removeLayer(providerMarker);
    providerMarker = L.marker([lat, lng]).addTo(providerMapInstance);
    providerMapInstance.setView([lat, lng], 14);
}

async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();

        if (data && data.display_name) {
            const parts = data.display_name.split(',');
            el.location.value = parts.slice(0, 3).join(',').trim();
        } else {
            el.location.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    } catch (err) {
        console.error("Geocoding failed", err);
        el.location.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
}

el.btnGetLocation.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    const originalHtml = el.btnGetLocation.innerHTML;
    el.btnGetLocation.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    el.btnGetLocation.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            setProviderMarker(position.coords.latitude, position.coords.longitude);
            await reverseGeocode(position.coords.latitude, position.coords.longitude);

            el.btnGetLocation.innerHTML = '<i class="fa-solid fa-check text-primary"></i>';
            setTimeout(() => {
                el.btnGetLocation.innerHTML = originalHtml;
                el.btnGetLocation.disabled = false;
            }, 2000);
        },
        (error) => {
            console.error("Error obtaining location", error);
            alert("Could not get your location. Please check your browser permissions.");
            el.btnGetLocation.innerHTML = originalHtml;
            el.btnGetLocation.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        initProviderMap();
        initProviderListener();
    }
});

el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    el.btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';
    el.btn.disabled = true;

    try {
        const donationData = {
            providerId: currentUser.uid,
            providerName: currentUser.displayName || "Provider Name",
            contactDetails: {
                name: el.providerName.value,
                mobile: el.mobileNumber.value,
                org: el.orgName.value || "",
                notes: el.specialNotes.value || ""
            },
            foodName: el.foodName.value,
            quantity: el.quantity.value,
            locationStr: el.location.value,
            locationCoords: currentVerifiedCoords || { lat: 28.6139 + (Math.random() * 0.02 - 0.01), lng: 77.2090 + (Math.random() * 0.02 - 0.01) },
            availableTime: el.time.value,
            status: "available",
            createdAt: new Date().toISOString()
        };

        try {
            await push(ref(db, "donations"), donationData);
        } catch (e) {
            console.warn("Using LocalStorage fallback due to dummy API key.");
            let mDon = JSON.parse(localStorage.getItem('mockDonations') || "[]");
            mDon.push({ ...donationData, id: Date.now().toString() });
            localStorage.setItem('mockDonations', JSON.stringify(mDon));
            simulateLocalProviderUpdate();
        }

        el.form.reset();
        currentVerifiedCoords = null;
        if (providerMarker) {
            providerMapInstance.removeLayer(providerMarker);
            providerMarker = null;
        }
    } catch (err) {
        console.error(err);
        alert("Could not post");
    } finally {
        el.btn.innerHTML = 'Post Donation';
        el.btn.disabled = false;
    }
});

let providerUnsub = null;
let knownStatuses = {};

function initProviderListener() {
    if (providerUnsub) providerUnsub();

    try {
        const donationsRef = query(ref(db, 'donations'), orderByChild('providerId'), equalTo(currentUser.uid));
        providerUnsub = onValue(donationsRef, (snapshot) => {
            const data = [];
            snapshot.forEach((childSnapshot) => {
                const val = childSnapshot.val();
                const id = childSnapshot.key;
                data.push({ id, ...val });
                
                // Show notification if status changed to picked_up
                if (knownStatuses[id] && knownStatuses[id] !== 'picked_up' && val.status === 'picked_up') {
                    alert(`✅ Food Collected!\n\nYour donation "${val.foodName}" has been successfully picked up by ${val.acceptedByNGO?.name || 'the NGO'}.`);
                }
                knownStatuses[id] = val.status;
            });
            // Reverse sort to show newest first
            data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            
            // Filter out picked_up items from active listings
            const activeData = data.filter(d => d.status !== 'picked_up');
            renderProviderListings(activeData);
        });
    } catch (e) {
        simulateLocalProviderUpdate();
    }
}

function simulateLocalProviderUpdate() {
    let m = JSON.parse(localStorage.getItem('mockDonations') || "[]")
        .filter(d => d.providerId === currentUser?.uid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        
    m.forEach(val => {
        if (knownStatuses[val.id] && knownStatuses[val.id] !== 'picked_up' && val.status === 'picked_up') {
            // Wait brief moment to ensure alert doesn't block UI drawing if same screen
            setTimeout(() => {
                alert(`✅ Food Collected (Mocked)!\n\nYour donation "${val.foodName}" has been successfully picked up by ${val.acceptedByNGO?.name || 'the NGO'}.`);
            }, 100);
        }
        knownStatuses[val.id] = val.status;
    });

    const activeData = m.filter(d => d.status !== 'picked_up');
    renderProviderListings(activeData);
}

// Listen for mock storage changes across tabs
window.addEventListener('storage', (e) => {
    if(e.key === 'mockDonations' && currentUser) {
        simulateLocalProviderUpdate();
    }
});

function renderProviderListings(data) {
    if (data.length === 0) {
        el.container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon text-muted bg-base" style="background:#f1f5f9;"><i class="fa-solid fa-clock"></i></div>
                <h3 class="mb-3 text-main">No postings yet</h3>
                <p class="text-muted">Fill out the form to start sharing surplus food.</p>
            </div>
        `;
        return;
    }

    el.container.innerHTML = data.map(d => `
        <div class="listing-card slide-up" ${d.status === 'accepted' ? 'style="border: 1px solid var(--primary); background: var(--primary-light);"' : ''}>
            <div class="listing-header">
                <div>
                    <h3 class="listing-title">${d.foodName}</h3>
                </div>
                <span class="listing-status ${d.status === 'available' ? 'status-available' : 'status-accepted'}">
                    ${d.status === 'accepted' ? '<i class="fa-solid fa-check"></i> ' : ''}${d.status}
                </span>
            </div>
            
            <div class="listing-details">
                <div class="detail-row"><span class="detail-label">Quantity:</span><span class="detail-value">${d.quantity}</span></div>
                <div class="detail-row"><span class="detail-label">Location:</span><span class="detail-value text-muted">${d.locationStr}</span></div>
                <div class="detail-row"><span class="detail-label">Available Until:</span><span class="detail-value time">${d.availableTime}</span></div>
                ${d.contactDetails ? `<div class="detail-row mt-2" style="border-top: 1px dashed #e2e8f0; padding-top: 8px;"><span class="detail-label text-xs">Contact:</span><span class="detail-value text-xs text-muted">${d.contactDetails.name} (${d.contactDetails.mobile})</span></div>` : ''}
                ${d.contactDetails && d.contactDetails.notes ? `<div class="detail-row"><span class="detail-label text-xs">Notes:</span><span class="detail-value text-xs text-muted"><i>${d.contactDetails.notes}</i></span></div>` : ''}
            </div>
            
            ${d.status === 'accepted' ? `
            <div class="mt-4 p-3 bg-base rounded-lg border" style="border-color: rgba(16, 185, 129, 0.3);">
                <h4 class="text-xs text-muted mb-2 uppercase" style="letter-spacing: 0.05em; font-weight: 700;">NGO Pickup Details</h4>
                <div style="font-size: 0.95rem; font-weight: 600;" class="mb-1"><i class="fa-solid fa-handshake text-primary" style="width: 20px;"></i> ${d.acceptedByNGO?.name || 'NGO'}</div>
                <div style="font-size: 0.95rem; font-weight: 600;" class="mb-1"><i class="fa-solid fa-user text-primary" style="width: 20px;"></i> ${d.acceptedByNGO?.volunteerName || 'Volunteer'}</div>
                <div style="font-size: 0.95rem; font-weight: 600;" class="mb-1"><i class="fa-solid fa-phone text-primary" style="width: 20px;"></i> ${d.acceptedByNGO?.contact || 'N/A'}</div>
                <div style="font-size: 0.95rem; font-weight: 600;" class="mb-1"><i class="fa-regular fa-clock text-primary" style="width: 20px;"></i> Expected at ${d.acceptedByNGO?.expectedTime || 'N/A'}</div>
                ${d.acceptedByNGO?.remarks ? `<div class="text-sm text-muted mt-2"><b>Remarks:</b> <i>${d.acceptedByNGO.remarks}</i></div>` : ''}
            </div>` : ''}
        </div>
    `).join('');
}
