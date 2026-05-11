document.addEventListener("DOMContentLoaded", () => {
    const metrikUrlInput = document.getElementById("metrikUrl");
    const secretKeyInput = document.getElementById("secretKey");
    const saveBtn = document.getElementById("saveBtn");
    const syncNowBtn = document.getElementById("syncNowBtn");
    const statusDiv = document.getElementById("status");

    // Load saved settings
    chrome.storage.sync.get(["metrikUrl", "secretKey"], (data) => {
        if (data.metrikUrl) metrikUrlInput.value = data.metrikUrl;
        if (data.secretKey) secretKeyInput.value = data.secretKey;
    });

    saveBtn.addEventListener("click", () => {
        chrome.storage.sync.set({
            metrikUrl: metrikUrlInput.value,
            secretKey: secretKeyInput.value
        }, () => {
            showStatus("Pengaturan disimpan!", "green");
        });
    });

    syncNowBtn.addEventListener("click", () => {
        showStatus("Mengambil cookie...", "#007bff");
        
        // Ambil semua cookie di domain ACMT
        chrome.cookies.getAll({ domain: "portalapp.iconpln.co.id" }, (cookies) => {
            let cookieString = cookies.map(c => `${c.name}=${c.value}`).join("; ");
            
            if (!cookieString || cookieString.length < 10) {
                showStatus("Cookie kosong! Harap login ke ACMT dulu.", "red");
                return;
            }

            let apiUrl = metrikUrlInput.value.replace(/\/$/, "") + "/api/foto/sync-extension";
            
            fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cookie_string: cookieString,
                    secret_key: secretKeyInput.value
                })
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                showStatus("✅ Berhasil disinkronkan!", "green");
            })
            .catch(err => {
                showStatus("❌ Gagal sync! Cek Server METRIK / Secret Key.", "red");
                console.error("Sync Error:", err);
            });
        });
    });

    function showStatus(message, color) {
        statusDiv.textContent = message;
        statusDiv.style.color = color;
        setTimeout(() => {
            if (statusDiv.textContent === message) {
                statusDiv.textContent = "";
            }
        }, 4000);
    }
});
