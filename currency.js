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

/**
 * Returns the user's display currency info.
 * rate_to_usd = units of that currency per 1 USD.
 * conversion:  usdAmount * rate_to_usd  →  local amount
 */
function getCurrencyForCountry(country) {
    const known = Object.prototype.hasOwnProperty.call(COUNTRIES, country);
    if (!known) {
        console.warn(`⚠️ Unknown country "${country}", falling back to United States`);
    }
    const resolvedCountry = known ? country : "United States";
    const meta = COUNTRIES[resolvedCountry];

    const liveRate = ratesCache.rates[meta.code];
    const hasLive = typeof liveRate === "number" && isFinite(liveRate) && liveRate > 0;

    // countries.js stores the static rate as `rate` (1 USD in local currency)
    const staticRate = Number(meta.rate);
    const rate = hasLive ? liveRate : (isFinite(staticRate) && staticRate > 0 ? staticRate : 1);

    return {
        country: resolvedCountry,
        code: meta.code,
        symbol: meta.symbol,
        name: meta.name || meta.code,
        rate_to_usd: rate,
        live: hasLive
    };
}

/** Convert a USD amount into the user's local currency (rounded to 2dp). */
function convertFromUSD(usdAmount, country) {
    const c = getCurrencyForCountry(country);
    return Math.round(Number(usdAmount || 0) * c.rate_to_usd * 100) / 100;
}

/** Format an already-converted amount with the country's symbol. */
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
