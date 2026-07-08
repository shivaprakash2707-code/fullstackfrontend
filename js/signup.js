const API_BASE_URL = "https://shivaprakash2707-code.github.io/fullstackbackend";

const form = document.getElementById("signupForm");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");
const submitBtn = document.getElementById("submitBtn");
const btnLoader = document.getElementById("btnLoader");

const eyeOpenSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeClosedSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

// Toggle password visibility
document.getElementById("togglePassword").addEventListener("click", function () {
    const passwordInput = document.getElementById("password");
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    this.innerHTML = isVisible ? eyeOpenSVG : eyeClosedSVG;
});

document.getElementById("toggleConfirmPassword").addEventListener("click", function () {
    const confirmInput = document.getElementById("confirmPassword");
    const isVisible = confirmInput.type === "text";
    confirmInput.type = isVisible ? "password" : "text";
    this.innerHTML = isVisible ? eyeOpenSVG : eyeClosedSVG;
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add("active");
    successMessage.classList.remove("active");
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add("active");
    errorMessage.classList.remove("active");
}

function clearMessages() {
    errorMessage.classList.remove("active");
    successMessage.classList.remove("active");
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnLoader.classList.toggle("active", isLoading);
    submitBtn.querySelector(".btn-text").textContent = isLoading ? "Signing Up..." : "Sign Up";
}

form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessages();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const role = document.getElementById("role").value;

    // Client-side validation
    if (!username || !email || !password || !confirmPassword || !role) {
        showError("Please fill in all fields.");
        return;
    }

    if (username.length < 3) {
        showError("Username must be at least 3 characters.");
        return;
    }

    if (password.length < 6) {
        showError("Password must be at least 6 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showError("Passwords do not match.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError("Please enter a valid email address.");
        return;
    }

    setLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: username,
                password: password,
                email: email,
                role: role,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess(data.message || "Registration successful! Redirecting to login...");
            form.reset();

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        } else {
            // Handle validation errors or server errors
            if (data.message) {
                showError(data.message);
            } else if (data.errors) {
                const errorList = Object.values(data.errors).join(", ");
                showError(errorList);
            } else {
                showError("Registration failed. Please try again.");
            }
        }
    } catch (error) {
        showError("Unable to connect to the server. Please check if the server is running.");
    } finally {
        setLoading(false);
    }
});
