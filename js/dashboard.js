const API_BASE_URL = "https://shivaprakash2707-code.github.io/fullstackbackend/";

// --- Session Guard ---
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const username = localStorage.getItem("username");

if (!token || !role || !username) {
    window.location.href = "login.html";
}

// Display profile info
document.getElementById("displayUsername").textContent = username;
const roleMapping = {
    "FLEET_MANAGER": "Fleet Manager",
    "DISPATCHER": "Dispatcher",
    "DRIVER": "Driver",
    "MAINTENANCE_TECH": "Maintenance Technician"
};
document.getElementById("displayRole").textContent = roleMapping[role] || role;

// Activate role-specific workspace
const sections = {
    "FLEET_MANAGER": "fleetManagerSection",
    "DISPATCHER": "dispatcherSection",
    "DRIVER": "driverSection",
    "MAINTENANCE_TECH": "maintenanceTechSection"
};
const activeSectionId = sections[role];
if (activeSectionId) {
    document.getElementById(activeSectionId).classList.add("active");
}

// --- Global UI elements ---
const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");
const logoutBtn = document.getElementById("logoutBtn");

function showSuccess(msg) {
    successMessage.textContent = msg;
    successMessage.classList.add("active");
    errorMessage.classList.remove("active");
    setTimeout(() => successMessage.classList.remove("active"), 4000);
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.add("active");
    successMessage.classList.remove("active");
    setTimeout(() => errorMessage.classList.remove("active"), 4000);
}

// Logout handler
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}
logoutBtn.addEventListener("click", logout);

// --- API Helper ---
async function apiCall(endpoint, options = {}) {
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401 || response.status === 403) {
            showError("Session expired or unauthorized request. Logging out...");
            setTimeout(logout, 9000);
            throw new Error("Unauthorized");
        }
        
        return response;
    } catch (err) {
        if (err.message !== "Unauthorized") {
            showError("API error: Could not reach the server.");
        }
        throw err;
    }
}

// --- Modal Management ---
window.showModal = function(modalId) {
    document.getElementById(modalId).classList.add("active");
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove("active");
    if (modalId === 'vehicleModal') {
        document.getElementById("vehicleForm").reset();
        document.getElementById("vehicleId").value = "";
        document.getElementById("vehicleModalTitle").textContent = "Add Vehicle";
    }
};

// --- Role Logic Routing ---
document.addEventListener("DOMContentLoaded", () => {
    if (role === "FLEET_MANAGER") {
        loadFleetManagerData();
    } else if (role === "DISPATCHER") {
        loadDispatcherData();
    } else if (role === "DRIVER") {
        loadDriverData();
    } else if (role === "MAINTENANCE_TECH") {
        loadMaintenanceTechData();
    }
});

// ==========================================
// 1. FLEET MANAGER WORKSPACE LOGIC
// ==========================================
async function loadFleetManagerData() {
    await Promise.all([
        fetchVehiclesManager(),
        fetchDriversManager()
    ]);
}

async function fetchVehiclesManager() {
    const tbody = document.getElementById("vehiclesTableBody");
    try {
        const res = await apiCall("/vehicle/getAll");
        if (res.ok) {
            const vehicles = await res.json();
            if (vehicles.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">No vehicles in inventory.</td></tr>`;
                return;
            }
            tbody.innerHTML = vehicles.map(v => `
                <tr>
                    <td>${v.id}</td>
                    <td><strong>${v.licensePlate}</strong><br><small style="color: #aaa">VIN: ${v.vin || 'N/A'}</small></td>
                    <td>${v.model}</td>
                    <td><span class="status-badge ${v.status.toLowerCase()}">${v.status}</span></td>
                    <td>
                        <button class="btn-action btn-secondary" onclick="editVehicle(${v.id}, '${v.licensePlate}', '${v.vin || ''}', '${v.model}', ${v.currentMileage || 0}, '${v.status}')">Edit</button>
                        <button class="btn-action btn-danger" onclick="deleteVehicle(${v.id})">Delete</button>
                    </td>
                </tr>
            `).join("");
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="loading-cell" style="color:#ff6b6b">Failed to load vehicles.</td></tr>`;
    }
}

async function fetchDriversManager() {
    const tbody = document.getElementById("driversTableBody");
    try {
        const res = await apiCall("/driver/getAll");
        if (res.ok) {
            const drivers = await res.json();
            if (drivers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">No drivers registered.</td></tr>`;
                return;
            }
            tbody.innerHTML = drivers.map(d => `
                <tr>
                    <td>${d.id}</td>
                    <td><strong>${d.user ? d.user.username : 'N/A'}</strong> (ID: ${d.user ? d.user.id : 'N/A'})</td>
                    <td>${d.licenseNumber}</td>
                    <td><span class="status-badge ${d.status.toLowerCase()}">${d.status}</span></td>
                    <td>
                        <button class="btn-action btn-secondary" onclick="editDriver(${d.id}, '${d.licenseNumber}', '${d.status}')">Edit</button>
                        <button class="btn-action btn-danger" onclick="deleteDriver(${d.id})">Delete</button>
                    </td>
                </tr>
            `).join("");
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="loading-cell" style="color:#ff6b6b">Failed to load drivers.</td></tr>`;
    }
}

// Vehicle Form Submission (Add/Edit)
document.getElementById("vehicleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("vehicleId").value;
    const licensePlate = document.getElementById("licensePlate").value.trim();
    const vin = document.getElementById("vin").value.trim();
    const model = document.getElementById("vehicleModel").value.trim();
    const currentMileage = parseFloat(document.getElementById("currentMileage").value);
    const status = document.getElementById("vehicleStatus").value;

    const payload = { licensePlate, vin, model, currentMileage, status };
    
    try {
        let res;
        if (id) {
            // Update
            res = await apiCall(`/vehicle/update/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        } else {
            // Create
            res = await apiCall("/vehicle/add", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            showSuccess(id ? "Vehicle updated successfully" : "Vehicle added successfully");
            closeModal("vehicleModal");
            fetchVehiclesManager();
        } else {
            const data = await res.json();
            showError(data.message || "Failed to save vehicle data.");
        }
    } catch (err) {
        showError("Network/Server error saving vehicle.");
    }
});

window.editVehicle = function(id, licensePlate, vin, model, currentMileage, status) {
    document.getElementById("vehicleId").value = id;
    document.getElementById("licensePlate").value = licensePlate;
    document.getElementById("vin").value = vin;
    document.getElementById("vehicleModel").value = model;
    document.getElementById("currentMileage").value = currentMileage;
    document.getElementById("vehicleStatus").value = status;
    document.getElementById("vehicleModalTitle").textContent = "Edit Vehicle";
    showModal("vehicleModal");
};

window.deleteVehicle = async function(id) {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
        const res = await apiCall(`/vehicle/delete/${id}`, { method: "DELETE" });
        if (res.ok) {
            showSuccess("Vehicle deleted successfully");
            fetchVehiclesManager();
        } else {
            const text = await res.text();
            showError(text || "Failed to delete vehicle.");
        }
    } catch (err) {
        showError("Server error deleting vehicle.");
    }
};

// Driver Form Submission (Create)
document.getElementById("driverForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = document.getElementById("driverUserId").value;
    const licenseNumber = document.getElementById("licenseNumber").value.trim();

    try {
        const res = await apiCall(`/driver/create?userId=${userId}&licenseNumber=${encodeURIComponent(licenseNumber)}`, {
            method: "POST"
        });

        if (res.ok) {
            showSuccess("Driver profile created successfully");
            closeModal("driverModal");
            fetchDriversManager();
        } else {
            const data = await res.json();
            showError(data.message || "Failed to create driver profile.");
        }
    } catch (err) {
        showError("Network/Server error registering driver.");
    }
});

window.editDriver = async function(id, currentLicense, currentStatus) {
    const newLicense = prompt("Update Commercial License Number:", currentLicense);
    if (newLicense === null) return;
    const newStatus = prompt("Update Status (AVAILABLE, OFF_DUTY):", currentStatus);
    if (newStatus === null) return;

    const parsedStatus = newStatus.trim().toUpperCase();
    if (!["AVAILABLE", "OFF_DUTY"].includes(parsedStatus)) {
        alert("Invalid Status! Must be AVAILABLE or OFF_DUTY.");
        return;
    }

    try {
        const res = await apiCall(`/driver/update/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                licenseNumber: newLicense.trim(),
                status: parsedStatus
            })
        });

        if (res.ok) {
            showSuccess("Driver profile updated");
            fetchDriversManager();
        } else {
            const data = await res.json();
            showError(data.message || "Failed to update driver profile.");
        }
    } catch (err) {
        showError("Server error updating driver.");
    }
};

window.deleteDriver = async function(id) {
    if (!confirm("Are you sure you want to delete this driver profile?")) return;
    try {
        const res = await apiCall(`/driver/delete/${id}`, { method: "DELETE" });
        if (res.ok) {
            showSuccess("Driver profile deleted");
            fetchDriversManager();
        } else {
            const text = await res.text();
            showError(text || "Failed to delete driver.");
        }
    } catch (err) {
        showError("Server error deleting driver.");
    }
};

// ==========================================
// 2. DISPATCHER DASHBOARD LOGIC
// ==========================================
async function loadDispatcherData() {
    await Promise.all([
        populateDispatcherDropdowns(),
        fetchTripsDispatcher()
    ]);
}

async function populateDispatcherDropdowns() {
    const vehicleSelect = document.getElementById("dispatchVehicle");
    const driverSelect = document.getElementById("dispatchDriver");

    try {
        // Vehicles
        const vRes = await apiCall("/vehicle/getAll");
        if (vRes.ok) {
            const vehicles = await vRes.json();
            // Show only active status vehicles
           const activeVehicles = vehicles.filter(v => v.status === "AVAILABLE");
            vehicleSelect.innerHTML = `<option value="" disabled selected>Select active vehicle</option>` +
                activeVehicles.map(v => `<option value="${v.id}">${v.licensePlate} (${v.model})</option>`).join("");
        }

        // Drivers
        const dRes = await apiCall("/driver/getAll");
        if (dRes.ok) {
            const drivers = await dRes.json();
            // Show available drivers
            const availableDrivers = drivers.filter(d => d.status === "AVAILABLE");
            driverSelect.innerHTML = `<option value="" disabled selected>Select available driver</option>` +
                availableDrivers.map(d => `<option value="${d.id}">${d.user ? d.user.username : 'N/A'} (License: ${d.licenseNumber})</option>`).join("");
        }
    } catch (err) {
        showError("Failed to populate dispatcher selectors.");
    }
}

async function fetchTripsDispatcher() {
    const tbody = document.getElementById("tripsTableBody");
    try {
        const res = await apiCall("/trip/getAll");
        if (res.ok) {
            const trips = await res.json();

            if (trips.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">No trips logged yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = trips.map(t => `
                <tr>
                    <td>${t.id}</td>
                    <td><strong>${t.vehicle ? t.vehicle.licensePlate : 'N/A'}</strong></td>
                    <td>${t.driver && t.driver.user ? t.driver.user.username : 'N/A'}</td>
                    <td><span class="status-badge ${t.status.toLowerCase()}">${t.status}</span></td>
                    <td>${t.distanceCovered !== null ? t.distanceCovered.toFixed(1) + ' km' : '--'}</td>
                    <td>
                        ${t.status === 'ACTIVE' ? `
                            <button class="btn-action btn-danger"
                                onclick="openEndTripModal(${t.id})">
                                End Trip
                            </button>
                        ` : `
                            <span style="color:#94a3b8;font-size:12px;">
                                Completed
                            </span>
                        `}
                    </td>
                </tr>
            `).join("");
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="loading-cell" style="color:#ff6b6b">
            Failed to load trips.
        </td></tr>`;
    }
}

// Start Trip Form Handler
document.getElementById("startTripForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const vehicleId = document.getElementById("dispatchVehicle").value;
    const driverId = document.getElementById("dispatchDriver").value;

    try {
        const res = await apiCall(`/trip/startTrip?vehicleId=${vehicleId}&driverId=${driverId}`, {
            method: "POST"
        });

        if (res.ok) {
            showSuccess("Trip started and vehicle dispatched!");
            document.getElementById("startTripForm").reset();
            loadDispatcherData();
        } else {
            const data = await res.json();
            showError(data.message || "Failed to start trip.");
        }
    } catch (err) {
        showError("Server error starting trip.");
    }
});

window.openEndTripModal = function(tripId) {
    document.getElementById("endTripId").value = tripId;
    showModal("endTripModal");
};

// End Trip Form Handler
document.getElementById("endTripForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tripId = document.getElementById("endTripId").value;
    const distance = parseFloat(document.getElementById("tripDistance").value);

    try {
        const res = await apiCall(`/trip/endTrip?tripId=${tripId}&distance=${distance}`, {
            method: "PUT"
        });

        if (res.ok) {
            showSuccess("Trip ended and logs saved.");
            closeModal("endTripModal");
            document.getElementById("endTripForm").reset();
            loadDispatcherData();
        } else {
            const data = await res.json();
            showError(data.message || "Failed to close trip.");
        }
    } catch (err) {
        showError("Server error ending trip.");
    }
});

// ==========================================
// 3. DRIVER DASHBOARD LOGIC
// ==========================================
async function loadDriverData() {
    try {
        const res = await apiCall("/driver/getAll");
        if (res.ok) {
            const drivers = await res.json();
            // Find driver corresponding to current logged in username
            const currentDriver = drivers.find(d => d.user && d.user.username === username);
            if (currentDriver) {
                document.getElementById("driverIdVal").textContent = currentDriver.id;
                document.getElementById("driverLicenseVal").textContent = currentDriver.licenseNumber;
                document.getElementById("driverStatusVal").textContent = currentDriver.status;
            } else {
                document.getElementById("driverStatusVal").textContent = "PENDING MANAGER CREATION";
                showError("Your driver profile hasn't been set up by the Fleet Manager yet.");
            }
        }
    } catch (err) {
        showError("Failed to fetch driver credentials.");
    }
}

// ==========================================
// 4. MAINTENANCE TECH PORTAL LOGIC
// ==========================================
async function loadMaintenanceTechData() {
    await fetchMaintenanceVehicles();
}

async function fetchMaintenanceVehicles() {
    const tbody = document.getElementById("maintenanceTableBody");
    try {
        const res = await apiCall("/vehicle/getAll");
        if (res.ok) {
            const vehicles = await res.json();
            if (vehicles.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">No vehicles registered.</td></tr>`;
                return;
            }
            tbody.innerHTML = vehicles.map(v => `
                <tr>
                    <td>${v.id}</td>
                    <td><strong>${v.licensePlate}</strong></td>
                    <td>${v.model}</td>
                    <td><span class="status-badge ${v.status.toLowerCase()}">${v.status}</span></td>
                    <td>
                        ${v.status === 'AVAILABLE' ? `
                        <button class="btn-action btn-danger" onclick="toggleVehicleMaintenance(${v.id}, '${v.licensePlate}', '${v.vin}', '${v.model}', ${v.currentMileage}, 'UNDER_MAINTENANCE')">Mark Maintenance</button>
                        `: ''}

                        ${v.status === 'UNDER_MAINTENANCE' ? `
                        <button class="btn-action btn-secondary" onclick="toggleVehicleMaintenance(${v.id}, '${v.licensePlate}', '${v.vin}', '${v.model}', ${v.currentMileage}, 'AVAILABLE')">Mark Available</button>
                        ` : ''}

${v.status === 'ON_TRIP' ? `
    <span style="color:#60a5fa; font-size:12px; font-style:italic">Currently on route</span>
` : ''}
                    </td>
                </tr>
            `).join("");
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="loading-cell" style="color:#ff6b6b">Failed to fetch maintenance details.</td></tr>`;
    }
}

window.toggleVehicleMaintenance = async function(id, licensePlate, vin, model, mileage, nextStatus) {
    try {
        const res = await apiCall(`/vehicle/update/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                licensePlate,
                vin,
                model,
                currentMileage: mileage,
                status: nextStatus
            })
        });

        if (res.ok) {
            showSuccess(`Vehicle ${licensePlate} marked as ${nextStatus}`);
            fetchMaintenanceVehicles();
        } else {
            const data = await res.json();
            showError(data.message || "Failed to update vehicle status.");
        }
    } catch (err) {
        showError("S_erver error updating maintenance log.");
    }
};
