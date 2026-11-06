// currency.js — live rates from open.er-api.com (free, no key), cached 6h
const COUNTRIES = require("./countries");

let ratesCache = { rates: {}, fetchedAt: 0 };
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

async function fetchLiveRates() {
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.result !== "success") throw new Error(json["error-type"] || "API error");
        ratesCache = { rates: json.rates || {}, fetchedAt: Date.now() };
        console.log("✅ Live exchange rates refreshed");
    } catch (err) {
        console.error("❌ Live rates fetch failed, using static fallback:", err.message);
    }
}

// Refresh at boot and every 6h
fetchLiveRates();
setInterval(fetchLiveRates, CACHE_MS);

function getCurrencyForCountry(country) {
    const meta = COUNTRIES[country] || COUNTRIES["United States"];
    const liveRate = ratesCache.rates[meta.code];
    return {
        country: country || "United States",
        code: meta.code,
        symbol: meta.symbol,
        name: meta.name,
        rate_to_usd: typeof liveRate === "number" ? liveRate : meta.rate_to_usd,
        live: typeof liveRate === "number"
    };
}

function convertFromUSD(usdAmount, country) {
    const c = getCurrencyForCountry(country);
    return Math.round(Number(usdAmount || 0) * c.rate_to_usd * 100) / 100;
}

function formatLocal(amountInLocal, country) {
    const c = getCurrencyForCountry(country);
    return `${c.symbol}${Number(amountInLocal || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function listCountries() {
    return Object.keys(COUNTRIES).sort().map(name => ({
        name,
        code: COUNTRIES[name].code,
        symbol: COUNTRIES[name].symbol
    }));
}

module.exports = { getCurrencyForCountry, convertFromUSD, formatLocal, listCountries, fetchLiveRates };