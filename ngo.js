import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, onValue, query, orderByChild, equalTo, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { checkAuth } from "./auth-check.js";

// Protect route
checkAuth('ngo');

let currentUser = null;
let mapInstance = null;
let mapMarkers = [];

const el = {
    count: document.getElementById('ngo-listing-count'),
    container: document.getElementById('ngo-listings-container'),
    acceptedContainer: document.getElementById('ngo-accepted-container'),
    mapPlaceholder: document.getElementById('map-placeholder')
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        initMap();
        initNgoListener();
    }
});

let ngoUnsub = null;
let acceptedUnsub = null;

function initNgoListener() {
    if (ngoUnsub) ngoUnsub();
    if (acceptedUnsub) acceptedUnsub();

    try {
        const availableRef = query(ref(db, 'donations'), orderByChild('status'), equalTo('available'));
        ngoUnsub = onValue(availableRef, (snapshot) => {
            const data = [];
            snapshot.forEach((childSnapshot) => {
                data.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            // Reverse sort to show newest first
            data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            renderNgoListings(data);
        });

        const acceptedRef = query(ref(db, 'donations'), orderByChild('status'), equalTo('accepted'));
        acceptedUnsub = onValue(acceptedRef, (snapshot) => {
            const data = [];
            snapshot.forEach((childSnapshot) => {
                const val = childSnapshot.val();
                if (val.acceptedByNGO && val.acceptedByNGO.uid === currentUser.uid) {
                    data.push({ id: childSnapshot.key, ...val });
                }
            });
            // Sort by accepted time, newest first
            data.sort((a, b) => {
                const timeA = a.acceptedByNGO?.acceptedAt || a.createdAt;
                const timeB = b.acceptedByNGO?.acceptedAt || b.createdAt;
                return timeB.localeCompare(timeA);
            });
            renderAcceptedListings(data);
        });

    } catch (e) {
        simulateLocalNgoUpdate();
    }
}

function simulateLocalNgoUpdate() {
    let rawM = JSON.parse(localStorage.getItem('mockDonations') || "[]");
    
    let availableM = rawM.filter(d => d.status === "available")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    renderNgoListings(availableM);

    let acceptedM = rawM.filter(d => d.status === "accepted" && d.acceptedByNGO?.uid === currentUser?.uid)
        .sort((a, b) => {
            const timeA = a.acceptedByNGO?.acceptedAt || a.createdAt;
            const timeB = b.acceptedByNGO?.acceptedAt || b.createdAt;
            return timeB.localeCompare(timeA);
        });
    renderAcceptedListings(acceptedM);
}

function renderNgoListings(data) {
    el.count.innerText = data.length;

    updateMapMarkers(data);

    el.container.innerHTML = data.map(d => {
        let distanceHtml = '';
        if (ngoLocation && d.locationCoords) {
            const dist = calculateDistance(ngoLocation.lat, ngoLocation.lng, d.locationCoords.lat, d.locationCoords.lng);
            if (dist !== null) {
                distanceHtml = `<div class="detail-row"><span class="detail-label">Distance:</span><span class="detail-value text-primary font-bold"><i class="fa-solid fa-route"></i> ${dist} km away</span></div>`;
            }
        }

        return `
        <div class="listing-card slide-up">
            <div class="listing-header">
                <div class="listing-mess"><i class="fa-solid fa-hand-holding-heart"></i> ${d.providerName}</div>
            </div>
            <h3 class="listing-title mb-6">${d.foodName}</h3>
            
            <div class="listing-details">
                <div class="detail-row"><span class="detail-label">Quantity:</span><span class="detail-value">${d.quantity}</span></div>
                <div class="detail-row"><span class="detail-label">Pickup:</span><span class="detail-value text-muted"><i class="fa-solid fa-location-dot"></i> ${d.locationStr}</span></div>
                ${distanceHtml}
                <div class="detail-row"><span class="detail-label">Available Until:</span><span class="detail-value time">${d.availableTime}</span></div>
                ${d.contactDetails ? `<div class="detail-row mt-2" style="border-top: 1px dashed #e2e8f0; padding-top: 8px;"><span class="detail-label text-xs">Provider:</span><span class="detail-value text-xs text-muted"><i class="fa-solid fa-user"></i> ${d.contactDetails.name}</span></div>` : ''}
                ${d.contactDetails ? `<div class="detail-row"><span class="detail-label text-xs">Contact:</span><span class="detail-value text-xs text-muted"><i class="fa-solid fa-phone"></i> ${d.contactDetails.mobile}</span></div>` : ''}
                ${d.contactDetails && d.contactDetails.notes ? `<div class="detail-row"><span class="detail-label text-xs">Notes:</span><span class="detail-value text-xs text-muted"><i>${d.contactDetails.notes}</i></span></div>` : ''}
            </div>
            
            <div class="listing-action">
                <button class="btn btn-primary w-full" style="background:#0f172a; color:#fff;" onclick="window.acceptDonation('${d.id}', '${d.providerName}')">Accept Pickup</button>
            </div>
        </div>
        `;
    }).join('');
}

function renderAcceptedListings(data) {
    if (data.length === 0) {
        el.acceptedContainer.innerHTML = `
            <div class="empty-state" style="padding: 40px 32px; grid-column: 1 / -1;">
                <div class="empty-icon text-muted bg-base" style="width: 60px; height: 60px; font-size: 1.5rem;"><i class="fa-solid fa-box-open"></i></div>
                <h3 class="mb-2 text-main" style="font-size: 1.2rem;">No accepted pickups</h3>
                <p class="text-muted text-sm">When you accept a donation, it will appear here for coordination.</p>
            </div>
        `;
        return;
    }

    el.acceptedContainer.innerHTML = data.map(d => {
        return `
        <div class="listing-card slide-up" style="border: 1px solid var(--primary); background: var(--primary-light);">
            <div class="listing-header">
                <div>
                    <div class="listing-mess text-primary"><i class="fa-solid fa-handshake"></i> ${d.providerName}</div>
                    <h3 class="listing-title" style="margin-top: 4px;">${d.foodName}</h3>
                </div>
                <span class="listing-status status-accepted"><i class="fa-solid fa-check"></i> Accepted</span>
            </div>
            
            <div class="listing-details" style="padding-top: 16px; margin-top: 16px; border-top: 1px solid rgba(16, 185, 129, 0.2);">
                <div class="detail-row"><span class="detail-label">Quantity:</span><span class="detail-value">${d.quantity}</span></div>
                <div class="detail-row"><span class="detail-label">Pickup Location:</span><span class="detail-value text-main font-bold"><i class="fa-solid fa-location-dot"></i> ${d.locationStr}</span></div>
                <div class="detail-row"><span class="detail-label">Pickup By:</span><span class="detail-value time">${d.availableTime}</span></div>
                
                ${d.contactDetails ? `
                <div class="mt-4 p-3 bg-base rounded-lg border" style="border-color: rgba(16, 185, 129, 0.3);">
                    <h4 class="text-xs text-muted mb-2 uppercase" style="letter-spacing: 0.05em; font-weight: 700;">Provider Contact</h4>
                    <div style="font-size: 0.95rem; font-weight: 600;" class="mb-1"><i class="fa-solid fa-user text-primary" style="width: 20px;"></i> ${d.contactDetails.name}</div>
                    <div style="font-size: 0.95rem; font-weight: 600;" class="mb-1"><i class="fa-solid fa-phone text-primary" style="width: 20px;"></i> ${d.contactDetails.mobile}</div>
                    ${d.contactDetails.notes ? `<div class="text-sm text-muted mt-2"><b>Notes:</b> <i>${d.contactDetails.notes}</i></div>` : ''}
                </div>
                ` : ''}

                <div class="mt-3 text-sm text-muted">
                    <b>Your Volunteer:</b> ${d.acceptedByNGO?.volunteerName} (${d.acceptedByNGO?.contact}) at ${d.acceptedByNGO?.expectedTime}
                </div>
                
                <div class="mt-4 pt-3" style="border-top: 1px dashed rgba(16, 185, 129, 0.3);">
                    <button class="btn btn-primary w-full" style="background-color: #10b981; border: none; font-weight: 600;" onclick="window.markAsPickedUp('${d.id}', '${d.foodName.replace(/'/g, "\\'")}', '${d.providerName.replace(/'/g, "\\'")}')">
                        <i class="fa-solid fa-check-double"></i> Food Picked Up
                    </button>
                    <p class="text-xs text-center text-muted mt-2" style="margin-bottom:0;">Notify provider that food has been collected.</p>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

window.markAsPickedUp = async (id, foodName, providerName) => {
    if(!confirm(`Confirm you have picked up "${foodName}" from ${providerName}?`)) return;
    
    try {
        await update(ref(db, `donations/${id}`), {
            status: "picked_up",
            pickedUpAt: new Date().toISOString()
        });
        alert(`Successfully marked "${foodName}" as picked up! Provider has been notified.`);
    } catch (err) {
        // Fallback for mock environment
        let m = JSON.parse(localStorage.getItem('mockDonations') || "[]");
        const i = m.findIndex(x => x.id === id);
        if (i > -1) {
            m[i].status = "picked_up";
            m[i].pickedUpAt = new Date().toISOString();
            localStorage.setItem('mockDonations', JSON.stringify(m));
            simulateLocalNgoUpdate();
            alert(`Successfully marked "${foodName}" as picked up! Provider has been notified. (Mocked)`);
        }
    }
};

window.acceptDonation = (id, providerName) => {
    document.getElementById('modal-donation-id').value = id;
    document.getElementById('modal-provider-name').value = providerName;
    document.getElementById('confirm-modal').classList.remove('hidden');
};

let ngoLocation = null;
let ngoMarker = null;

function initMap() {
    if (mapInstance) return;
    mapInstance = L.map('osm-map').setView([28.6139, 77.2090], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(mapInstance);

    if (ngoLocation) {
        updateNgoLocationOnMap();
    }
}

function updateNgoLocationOnMap() {
    if (!mapInstance || !ngoLocation) return;
    mapInstance.setView([ngoLocation.lat, ngoLocation.lng], 14);

    if (ngoMarker) mapInstance.removeLayer(ngoMarker);
    ngoMarker = L.circleMarker([ngoLocation.lat, ngoLocation.lng], {
        radius: 8,
        fillColor: "#3b82f6",
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 1
    }).addTo(mapInstance).bindPopup("You are here");
}

function updateMapMarkers(donations) {
    if (!mapInstance) return;

    // Clear existing markers
    mapMarkers.forEach(m => mapInstance.removeLayer(m));
    mapMarkers = [];

    // Green icon for food
    const foodIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    donations.forEach(d => {
        if (d.locationCoords) {
            const m = L.marker([d.locationCoords.lat, d.locationCoords.lng], { icon: foodIcon })
                .addTo(mapInstance)
                .bindPopup(`<b>${d.foodName}</b><br>${d.providerName}`);
            mapMarkers.push(m);
        }
    });

    // If we only have donations but no NGO location, fit bounds to donations
    if (!ngoLocation && mapMarkers.length > 0) {
        const group = new L.featureGroup(mapMarkers);
        mapInstance.fitBounds(group.getBounds());
    }
}

// Get NGO's location as soon as possible to sort listings by distance
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
        ngoLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        updateNgoLocationOnMap();
        // Trigger a re-render to update distances if data already loaded
        initNgoListener();
    }, (err) => {
        console.log("NGO Geolocation denied or failed.", err);
    });
}

// Haversine formula to calculate straight-line distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1); // Distance in km
}

initNgoListener();

// Modal Logic
const confirmModal = document.getElementById('confirm-modal');
const closeBtn = document.getElementById('close-modal-btn');
const confirmForm = document.getElementById('confirm-pickup-form');
const confirmSubmitBtn = document.getElementById('confirm-submit-btn');

closeBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    confirmForm.reset();
});

confirmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const btnOriginalText = confirmSubmitBtn.innerHTML;
    confirmSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Confirming...';
    confirmSubmitBtn.disabled = true;

    const id = document.getElementById('modal-donation-id').value;
    const providerName = document.getElementById('modal-provider-name').value;

    const volunteerName = document.getElementById('confirm-volunteer-name').value;
    const contact = document.getElementById('confirm-contact').value;
    const time = document.getElementById('confirm-time').value;
    const remarks = document.getElementById('confirm-remarks').value;

    const acceptedByData = {
        uid: currentUser.uid,
        name: currentUser.displayName || "Unknown NGO",
        volunteerName,
        contact,
        expectedTime: time,
        remarks,
        acceptedAt: new Date().toISOString()
    };

    try {
        await update(ref(db, `donations/${id}`), {
            status: "accepted",
            acceptedByNGO: acceptedByData
        });
        alert(`Pickup confirmed from ${providerName}!`);
    } catch (err) {
        // Fallback for mock environment
        let m = JSON.parse(localStorage.getItem('mockDonations') || "[]");
        const i = m.findIndex(x => x.id === id);
        if (i > -1) {
            m[i].status = "accepted";
            m[i].acceptedByNGO = acceptedByData;
            localStorage.setItem('mockDonations', JSON.stringify(m));
            simulateLocalNgoUpdate();
            alert(`Pickup confirmed from ${providerName}! (Mocked)`);
        }
    } finally {
        confirmSubmitBtn.innerHTML = btnOriginalText;
        confirmSubmitBtn.disabled = false;
        confirmModal.classList.add('hidden');
        confirmForm.reset();
    }
});
