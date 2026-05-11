// background.js

chrome.runtime.onInstalled.addListener(() => {
    // Buat alarm yang berjalan setiap 1 menit
    chrome.alarms.create("acmtHeartbeat", { periodInMinutes: 1.0 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "acmtHeartbeat") {
        console.log("Mengirim Heartbeat ke portal ACMT untuk mencegah auto-logout...");
        // Ping halaman ACMT untuk menjaga sesi tetap hidup
        fetch("https://portalapp.iconpln.co.id/acmt/Main.htm", { method: "HEAD" })
            .then(res => {
                console.log("Heartbeat sukses, status:", res.status);
                // Langsung paksa baca cookie terbaru dan kirim ke METRIK tiap 1 menit
                // Ini menutupi kelemahan onChanged yang kadang gagal mendeteksi rotasi cookie F5
                chrome.cookies.getAll({ domain: "portalapp.iconpln.co.id" }, (cookies) => {
                    let cookieString = cookies.map(c => `${c.name}=${c.value}`).join("; ");
                    if (cookieString.includes("JSESSIONID") || cookieString.includes("ci_session")) {
                        syncToMetrik(cookieString);
                    }
                });
            })
            .catch(err => console.error("Heartbeat gagal:", err));
    }
});

chrome.cookies.onChanged.addListener((changeInfo) => {
    // Memantau jika ada perubahan cookie di domain ACMT
    if (changeInfo.cookie.domain.includes("portalapp.iconpln.co.id")) {
        // Ambil ulang semua cookie dari domain tersebut
        chrome.cookies.getAll({ domain: "portalapp.iconpln.co.id" }, (cookies) => {
            let cookieString = cookies.map(c => `${c.name}=${c.value}`).join("; ");
            
            // Coba sinkronisasi jika sudah terlihat seperti session valid
            if (cookieString.includes("JSESSIONID") || cookieString.includes("ci_session")) {
                syncToMetrik(cookieString);
            }
        });
    }
});

function syncToMetrik(cookieString) {
    chrome.storage.sync.get(["metrikUrl", "secretKey"], (data) => {
        if (!data.metrikUrl || !data.secretKey) {
            console.log("Auto-Sync ditunda: URL METRIK atau Secret Key belum disetting di popup.");
            return;
        }

        let apiUrl = data.metrikUrl.replace(/\/$/, "") + "/api/foto/sync-extension";
        
        fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                cookie_string: cookieString,
                secret_key: data.secretKey
            })
        })
        .then(res => res.json())
        .then(resData => {
            console.log("Berhasil auto-sync ke METRIK:", resData);
        })
        .catch(err => {
            console.error("Gagal auto-sync ke METRIK:", err);
        });
    });
}
