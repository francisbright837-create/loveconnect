const API_URL = "http://localhost:3000/api";

let token = null;
let currentUser = null;

window.onload = function () {
  token = localStorage.getItem("token");
  if (token) {
    showApp();
  }
};

function toggleForm() {
  const title = document.getElementById("form-title");
  const btn = document.getElementById("submit-btn");
  const toggleText = document.getElementById("toggle-text");

  if (title.textContent === "Sign Up") {
    title.textContent = "Log In";
    btn.textContent = "Log In";
    toggleText.innerHTML = 'No account yet? <a href="#" onclick="toggleForm()">Sign Up</a>';
    document.getElementById("name").style.display = "none";
    document.getElementById("gender").style.display = "none";
    document.getElementById("interest").style.display = "none";
  } else {
    title.textContent = "Sign Up";
    btn.textContent = "Sign Up";
    toggleText.innerHTML = 'Already have an account? <a href="#" onclick="toggleForm()">Log In</a>';
    document.getElementById("name").style.display = "block";
    document.getElementById("gender").style.display = "block";
    document.getElementById("interest").style.display = "block";
  }
}

async function submitForm() {
  const isLogin = document.getElementById("form-title").textContent === "Log In";
  if (isLogin) await login();
  else await register();
}

async function register() {
  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    gender: document.getElementById("gender").value,
    interest: document.getElementById("interest").value,
  };

  if (!payload.name || !payload.email || !payload.password || !payload.gender || !payload.interest) {
    alert("Please fill all fields!");
    return;
  }

  try {
    const res = await fetch(API_URL + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");

    alert("Account created! Please log in now.");
    toggleForm();
  } catch (err) {
    alert(err.message);
  }
}

async function login() {
  const payload = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  };

  if (!payload.email || !payload.password) {
    alert("Please enter email and password!");
    return;
  }

  try {
    const res = await fetch(API_URL + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    token = data.token;
    localStorage.setItem("token", token);
    showApp();
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  localStorage.removeItem("token");
  token = null;
  currentUser = null;
  document.getElementById("app").style.display = "none";
  document.getElementById("auth-section").style.display = "block";
}

async function showApp() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app").style.display = "block";

  try {
    const res = await fetch(API_URL + "/profile/me", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Session expired. Please log in again.");
    currentUser = await res.json();

    document.getElementById("current-user-name").textContent = currentUser.name;

    if (!currentUser.profilePicture || !currentUser.bio?.trim()) {
      document.getElementById("profile-setup").style.display = "block";
      document.getElementById("matching-screen").style.display = "none";
    } else {
      document.getElementById("profile-setup").style.display = "none";
      document.getElementById("matching-screen").style.display = "block";
      fetchProfiles();
    }
  } catch (err) {
    alert(err.message);
    logout();
  }
}

// Photo preview
document.getElementById("photo-input")?.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById("photo-preview");
    preview.src = ev.target.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);
});

async function saveProfile() {
  const bio = document.getElementById("bio").value.trim();
  const fileInput = document.getElementById("photo-input");

  let profilePicture = null;
  if (fileInput.files[0]) {
    profilePicture = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(fileInput.files[0]);
    });
  }

  if (!profilePicture && !bio) {
    alert("Please add at least a photo or a short bio!");
    return;
  }

  try {
    const res = await fetch(API_URL + "/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ profilePicture, bio })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to save profile");
    }

    await showApp();  // refresh → should now go to matching
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function fetchProfiles() {
  try {
    const res = await fetch(API_URL + "/profiles", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load profiles");

    const profiles = await res.json();
    displayProfiles(profiles);
  } catch (err) {
    document.getElementById("profiles").innerHTML = `<p style="color:red">${err.message}</p>`;
  }
}

function displayProfiles(profiles) {
  const container = document.getElementById("profiles");
  container.innerHTML = "";

  if (profiles.length === 0) {
    container.innerHTML = "<p>No other profiles available yet.</p>";
    return;
  }

  profiles.forEach(p => {
    const card = document.createElement("div");
    card.className = "profile-card";

    let imgHtml = p.profilePicture
      ? `<img src="${escapeHTML(p.profilePicture)}" alt="${escapeHTML(p.name)}">`
      : `<div style="height:200px; background:#eee; border-radius:10px; display:flex; align-items:center; justify-content:center;">No photo</div>`;

    card.innerHTML = `
      ${imgHtml}
      <h3>${escapeHTML(p.name)}</h3>
      <p><strong>Gender:</strong> ${escapeHTML(p.gender || "—")}</p>
      <p><strong>Looking for:</strong> ${escapeHTML(p.interest || "—")}</p>
      <p>${escapeHTML(p.bio || "No bio yet.")}</p>
      <button onclick="likeUser('${p._id}')">Like ❤️</button>
    `;

    container.appendChild(card);
  });
}

async function likeUser(targetId) {
  try {
    const res = await fetch(API_URL + `/match/like/${targetId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Like failed");

    if (data.match) {
      alert("It's a match! 🎉");
    } else {
      alert("Liked! 💕");
    }

    fetchProfiles(); // refresh list
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}