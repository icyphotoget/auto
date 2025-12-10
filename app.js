import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔧 TVOJ SUPABASE – ostavio sam tvoje podatke kakve si poslao
const supabaseUrl = "https://yvfcisqttpcccbbppycu.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZmNpc3F0dHBjY2NiYnBweWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODcwMzUsImV4cCI6MjA4MDg2MzAzNX0.2tvPijAXms6mdUZtMmm_Ae6guhZ0bo0bohf8iFjaccM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// DOM elementi
const brandSelect = document.getElementById("brand-select");
const carSelect = document.getElementById("car-select");
const yearSelect = document.getElementById("year-select");
const form = document.getElementById("calc-form");
const annualKmInput = document.getElementById("annual-km");
const fuelPriceInput = document.getElementById("fuel-price");
const resultsSection = document.getElementById("results");

// rezultati
const totalYearlyEl = document.getElementById("total-yearly");
const totalMonthlyEl = document.getElementById("total-monthly");
const fuelYearlyEl = document.getElementById("fuel-yearly");
const insYearlyEl = document.getElementById("ins-yearly");
const serviceYearlyEl = document.getElementById("service-yearly");
const tiresYearlyEl = document.getElementById("tires-yearly");
const repairsYearlyEl = document.getElementById("repairs-yearly");
const deprYearlyEl = document.getElementById("depr-yearly");

// share card elementi
const resultCarNameEl = document.getElementById("result-car-name");
const resultMetaEl = document.getElementById("result-meta");
const shareBtn = document.getElementById("share-btn");
const shareInfoEl = document.getElementById("share-info");

// default cijene goriva po tipu
const defaultFuelPriceByType = {
  dizel: 1.55,
  benzin: 1.65,
  "benzin-hibrid": 1.60,
  hibrid: 1.60,
  "plug-in hibrid": 1.60,
};

// state u memoriji
let allCars = [];
let carById = {};

// helpers
function formatEur(value) {
  if (!Number.isFinite(value)) return "–";
  return value.toFixed(0) + " €";
}

function parseYearFromName(name) {
  if (!name) return null;
  const match = name.match(/(20\d{2}|19\d{2})/);
  return match ? Number(match[1]) : null;
}

function calculateCosts(car, annualKm, fuelPrice) {
  const fuelConsumption = Number(car.fuel_consumption ?? 0);
  const fuelYearly = (annualKm / 100) * fuelConsumption * fuelPrice;

  const purchase = Number(car.purchase_price ?? 0);
  const resale = Number(car.resale_price_after_n_years ?? 0);
  const years = Number(car.years_for_depreciation || 5);
  const depreciationYearly = years > 0 ? (purchase - resale) / years : 0;

  const insuranceYearly = Number(car.insurance_registration_yearly ?? 0);
  const serviceYearly = Number(car.service_yearly ?? 0);
  const tiresPrice = Number(car.tires_set_price ?? 0);
  const tiresYears = Number(car.tires_years || 4);
  const tiresYearly = tiresYears > 0 ? tiresPrice / tiresYears : 0;
  const repairsYearly = Number(car.unexpected_repairs_yearly ?? 0);

  const totalYearly =
    fuelYearly +
    insuranceYearly +
    serviceYearly +
    tiresYearly +
    repairsYearly +
    depreciationYearly;

  const totalMonthly = totalYearly / 12;

  return {
    fuelYearly,
    insuranceYearly,
    serviceYearly,
    tiresYearly,
    repairsYearly,
    depreciationYearly,
    totalYearly,
    totalMonthly,
  };
}

function getDefaultFuelPriceForCar(car) {
  const t = (car.fuel_type || "").toLowerCase();
  if (defaultFuelPriceByType[t] != null) return defaultFuelPriceByType[t];
  return 1.5;
}

// ------------ UI POPULATING ------------

function buildBrandOptions() {
  if (!brandSelect) return;
  const brandSet = new Set();

  allCars.forEach((car) => {
    const b = (car.brand || "").trim();
    if (!b) return;
    brandSet.add(b);
  });

  const brands = Array.from(brandSet).sort((a, b) => a.localeCompare(b, "hr"));

  brandSelect.innerHTML = `<option value="">Sve marke</option>`;
  brands.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    brandSelect.appendChild(opt);
  });
}

function buildYearOptionsForBrand(brandValue) {
  if (!yearSelect) return;

  let filtered = allCars;
  if (brandValue) {
    filtered = filtered.filter(
      (car) => (car.brand || "").trim() === brandValue
    );
  }

  const yearSet = new Set();
  filtered.forEach((car) => {
    if (car.parsedYear) yearSet.add(car.parsedYear);
  });

  const years = Array.from(yearSet).sort((a, b) => b - a); // noviji prvi

  const currentValue = yearSelect.value;
  yearSelect.innerHTML = `<option value="">Sva godišta</option>`;
  years.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  });

  // Ako prethodno odabrana godina i dalje postoji, zadrži je
  if (currentValue && years.includes(Number(currentValue))) {
    yearSelect.value = currentValue;
  } else {
    yearSelect.value = "";
  }
}

function buildCarOptions() {
  if (!carSelect) return;

  const brandValue = brandSelect ? brandSelect.value : "";
  const yearValue = yearSelect ? yearSelect.value : "";

  let filtered = allCars;

  if (brandValue) {
    filtered = filtered.filter(
      (car) => (car.brand || "").trim() === brandValue
    );
  }
  if (yearValue) {
    filtered = filtered.filter(
      (car) => String(car.parsedYear || "") === yearValue
    );
  }

  carSelect.innerHTML = "";
  if (!brandValue) {
    carSelect.disabled = true;
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Prvo odaberi marku";
    carSelect.appendChild(opt);
    return;
  }

  carSelect.disabled = false;

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Odaberi model";
  carSelect.appendChild(placeholder);

  // sortiraj po imenu
  filtered
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "hr"))
    .forEach((car) => {
      const opt = document.createElement("option");
      opt.value = car.id;
      opt.textContent = car.name;
      opt.dataset.carId = car.id;
      carSelect.appendChild(opt);
    });
}

function updateFormDefaultsForCar(car) {
  if (!car) return;

  if (annualKmInput) {
    annualKmInput.value =
      car.annual_km_default != null && car.annual_km_default !== ""
        ? car.annual_km_default
        : 15000;
  }

  if (fuelPriceInput) {
    const price = getDefaultFuelPriceForCar(car);
    fuelPriceInput.value = price.toFixed(2);
  }
}

// ------------ SHARE ------------

function updateShareLink(car, annualKm, fuelPrice) {
  if (!shareBtn || !car) return;

  const url = new URL(window.location.href);
  url.searchParams.set("car", car.id);
  url.searchParams.set("km", String(annualKm));
  url.searchParams.set("fuel", fuelPrice.toFixed(2));
  url.searchParams.set("show", "1");

  shareBtn.dataset.shareUrl = url.toString();

  // update address bar (da user može samo copy/paste)
  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, "", url.pathname + url.search);
  }

  if (shareInfoEl) {
    shareInfoEl.textContent =
      "Rezultat se može podijeliti linkom – klikni na “Podijeli rezultat”.";
  }
}

// ------------ CALC + RENDER ------------

function renderResults(car, annualKm, fuelPrice, result) {
  if (!resultsSection) return;

  totalYearlyEl.textContent = formatEur(result.totalYearly);
  totalMonthlyEl.textContent = formatEur(result.totalMonthly);

  fuelYearlyEl.textContent = formatEur(result.fuelYearly);
  insYearlyEl.textContent = formatEur(result.insuranceYearly);
  serviceYearlyEl.textContent = formatEur(result.serviceYearly);
  tiresYearlyEl.textContent = formatEur(result.tiresYearly);
  repairsYearlyEl.textContent = formatEur(result.repairsYearly);
  deprYearlyEl.textContent = formatEur(result.depreciationYearly);

  if (resultCarNameEl) {
    resultCarNameEl.textContent = car?.name || "Tvoj auto";
  }

  if (resultMetaEl && car) {
    const parts = [];
    if (car.segment) parts.push(car.segment);
    if (car.fuel_type) parts.push(car.fuel_type);
    parts.push(`${annualKm.toLocaleString("hr-HR")} km/god`);
    parts.push(`gorivo ~ ${fuelPrice.toFixed(2)} €/L`);
    resultMetaEl.textContent = parts.join(" • ");
  }

  resultsSection.hidden = false;
}

function runCalculationForCar(car, annualKm, fuelPrice) {
  const result = calculateCosts(car, annualKm, fuelPrice);
  renderResults(car, annualKm, fuelPrice, result);
  updateShareLink(car, annualKm, fuelPrice);
}

// ------------ URL PARAMS ------------

function applyQueryFromUrl() {
  if (!allCars.length) return;
  const params = new URLSearchParams(window.location.search);

  const carId = params.get("car");
  const kmParam = params.get("km");
  const fuelParam = params.get("fuel");
  const show = params.get("show");

  if (!carId || !carById[carId]) {
    return;
  }

  const car = carById[carId];

  // postavi filtere: marka + godište + model
  const brandValue = (car.brand || "").trim();
  if (brandSelect && brandValue) {
    brandSelect.value = brandValue;
    buildYearOptionsForBrand(brandValue);
  } else if (brandSelect) {
    brandSelect.value = "";
    buildYearOptionsForBrand("");
  }

  if (yearSelect && car.parsedYear) {
    // ako postoji opcija za tu godinu
    const yearStr = String(car.parsedYear);
    const hasYearOption = Array.from(yearSelect.options).some(
      (opt) => opt.value === yearStr
    );
    if (hasYearOption) {
      yearSelect.value = yearStr;
    }
  }

  // napuni modele s filtrima
  buildCarOptions();

  if (carSelect) {
    carSelect.value = car.id;
  }

  // inputi
  const annualKm =
    kmParam && !Number.isNaN(Number(kmParam))
      ? Number(kmParam)
      : car.annual_km_default || 15000;

  const fuelPrice =
    fuelParam && !Number.isNaN(Number(fuelParam))
      ? Number(fuelParam)
      : getDefaultFuelPriceForCar(car);

  if (annualKmInput) annualKmInput.value = String(annualKm);
  if (fuelPriceInput) fuelPriceInput.value = fuelPrice.toFixed(2);

  // auto-izračun – ako postoji show=1 ili barem km/fuel
  if (show === "1" || kmParam || fuelParam) {
    runCalculationForCar(car, annualKm, fuelPrice);
  }
}

// ------------ LOAD CARS ------------

async function loadCars() {
  if (!carSelect || !brandSelect || !yearSelect) return;

  carSelect.innerHTML = `<option value="">Učitavanje...</option>`;
  carSelect.disabled = true;

  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .order("brand", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Greška pri učitavanju auta:", error);
    carSelect.innerHTML = `<option value="">Greška pri učitavanju</option>`;
    return;
  }

  allCars = (data || []).map((car) => {
    const parsedYear = parseYearFromName(car.name);
    const cleanBrand = (car.brand || "").trim();
    const cleanFuelType = (car.fuel_type || "").toLowerCase();
    const obj = {
      ...car,
      brand: cleanBrand,
      fuel_type: cleanFuelType,
      parsedYear,
    };
    carById[car.id] = obj;
    return obj;
  });

  buildBrandOptions();
  buildYearOptionsForBrand("");
  buildCarOptions();

  // primijeni URL parametre (ako ih ima)
  applyQueryFromUrl();
}

// ------------ EVENT LISTENERS ------------

if (brandSelect) {
  brandSelect.addEventListener("change", () => {
    const brandValue = brandSelect.value;
    buildYearOptionsForBrand(brandValue);
    buildCarOptions();
    if (carSelect) {
      carSelect.value = "";
    }
  });
}

if (yearSelect) {
  yearSelect.addEventListener("change", () => {
    buildCarOptions();
    if (carSelect) {
      carSelect.value = "";
    }
  });
}

if (carSelect) {
  carSelect.addEventListener("change", () => {
    const id = carSelect.value;
    if (!id || !carById[id]) return;
    const car = carById[id];
    updateFormDefaultsForCar(car);
  });
}

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const carId = carSelect.value;
    if (!carId || !carById[carId]) {
      alert("Molim odaberi model auta.");
      return;
    }

    const car = carById[carId];

    const annualKm =
      Number(annualKmInput.value) ||
      Number(car.annual_km_default) ||
      15000;
    const fuelPrice =
      Number(fuelPriceInput.value) || getDefaultFuelPriceForCar(car);

    runCalculationForCar(car, annualKm, fuelPrice);
  });
}

if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    const url = shareBtn.dataset.shareUrl || window.location.href;

    // native share
    if (navigator.share) {
      try {
        await navigator.share({
          title: "KolikoAuto – moj trošak auta",
          text: "Pogledaj moj izračun troška auta.",
          url,
        });
      } catch (err) {
        console.log("Share otkazan ili nije uspio:", err);
      }
      return;
    }

    // clipboard fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        if (shareInfoEl) {
          shareInfoEl.textContent = "Link kopiran u međuspremnik ✅";
        }
      } catch (err) {
        console.error("Clipboard error:", err);
        if (shareInfoEl) {
          shareInfoEl.textContent =
            "Kopiranje nije uspjelo – možeš ručno kopirati adresu iz browsera.";
        }
      }
      return;
    }

    // zadnji fallback
    prompt("Kopiraj ovaj link:", url);
  });
}

// start
loadCars();
