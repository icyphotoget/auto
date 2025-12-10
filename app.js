import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ----------------------
// SUPABASE
// ----------------------
const supabaseUrl = "https://yvfcisqttpcccbbppycu.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZmNpc3F0dHBjY2NiYnBweWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODcwMzUsImV4cCI6MjA4MDg2MzAzNX0.2tvPijAXms6mdUZtMmm_Ae6guhZ0bo0bohf8iFjaccM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ----------------------
// DOM ELEMENTI
// ----------------------
const brandSelect = document.getElementById("brand-select");
const modelSelect = document.getElementById("car-select");
const yearSelect = document.getElementById("year-select");

const form = document.getElementById("calc-form");
const annualKmInput = document.getElementById("annual-km");
const fuelPriceInput = document.getElementById("fuel-price");
const resultsSection = document.getElementById("results");

const totalYearlyEl = document.getElementById("total-yearly");
const totalMonthlyEl = document.getElementById("total-monthly");
const fuelYearlyEl = document.getElementById("fuel-yearly");
const insYearlyEl = document.getElementById("ins-yearly");
const serviceYearlyEl = document.getElementById("service-yearly");
const tiresYearlyEl = document.getElementById("tires-yearly");
const repairsYearlyEl = document.getElementById("repairs-yearly");
const deprYearlyEl = document.getElementById("depr-yearly");

// info o autu (ako prikazuješ)
const carImageEl = document.getElementById("car-image");
const carTitleEl = document.getElementById("car-title");
const carSubtitleEl = document.getElementById("car-subtitle");

// default cijene goriva po tipu
const defaultFuelPriceByType = {
  dizel: 1.55,
  benzin: 1.65,
  "benzin-hibrid": 1.60
};

// fallback slika
const fallbackImage = "/cars/default.jpg";

// globalni cache auta
let allCars = [];

// ----------------------
// POMOĆNE FUNKCIJE
// ----------------------
function formatEur(value) {
  if (!Number.isFinite(value)) return "–";
  return value.toFixed(0) + " €";
}

function getBrandFromCar(car) {
  return (car.brand || "").trim();
}

function getYearFromCar(car) {
  // pokušaj izvući godinu iz naziva, npr. "(2016)"
  if (!car.name) return null;
  const m = car.name.match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : null;
}

function calculateCosts(car, annualKm, fuelPrice) {
  const fuelConsumption = Number(car.fuel_consumption || 0);
  const fuelYearly = (annualKm / 100) * fuelConsumption * fuelPrice;

  const purchase = Number(car.purchase_price || 0);
  const resale = Number(car.resale_price_after_n_years || 0);
  const years = Number(car.years_for_depreciation || 5);
  const depreciationYearly = years > 0 ? (purchase - resale) / years : 0;

  const insuranceYearly = Number(car.insurance_registration_yearly || 0);
  const serviceYearly = Number(car.service_yearly || 0);
  const tiresPrice = Number(car.tires_set_price || 0);
  const tiresYears = Number(car.tires_years || 4);
  const tiresYearly = tiresYears > 0 ? tiresPrice / tiresYears : 0;
  const repairsYearly = Number(car.unexpected_repairs_yearly || 0);

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
    totalMonthly
  };
}

// ----------------------
// UČITAVANJE AUTA IZ BAZE
// ----------------------
async function loadCars() {
  if (!brandSelect || !modelSelect || !yearSelect) {
    console.warn("Nema select elemenata za brand/model/year.");
    return;
  }

  console.log("▶ loadCars() start");

  modelSelect.innerHTML = `<option value="">Učitavanje...</option>`;
  modelSelect.disabled = true;

  let data, error;
  try {
    const res = await supabase
      .from("cars")
      .select("id, name, brand, segment, fuel_type, fuel_consumption, annual_km_default, purchase_price, resale_price_after_n_years, years_for_depreciation, insurance_registration_yearly, service_yearly, tires_set_price, tires_years, unexpected_repairs_yearly, image_path")
      .order("name", { ascending: true });

    data = res.data;
    error = res.error;
  } catch (e) {
    console.error("❌ Supabase fetch exception:", e);
    error = e;
  }

  console.log("✅ Supabase data:", data);
  console.log("❗ Supabase error:", error);

  if (error) {
    console.error("Greška pri učitavanju auta:", error);
    brandSelect.innerHTML = `<option value="">Greška pri učitavanju</option>`;
    modelSelect.innerHTML = `<option value="">Greška pri učitavanju</option>`;
    yearSelect.innerHTML = `<option value="">Greška pri učitavanju</option>`;
    return;
  }

  allCars = data || [];
  console.log("🔢 allCars length:", allCars.length);

  if (!allCars.length) {
    console.warn("cars tablica je prazna (nema redova).");
    brandSelect.innerHTML = `<option value="">Nema podataka</option>`;
    modelSelect.innerHTML = `<option value="">Nema podataka</option>`;
    yearSelect.innerHTML = `<option value="">Nema podataka</option>`;
    return;
  }

  // ---- MARKA ----
  const brands = [
    ...new Set(
      allCars
        .map((car) => (car.brand || "").trim())
        .filter((b) => b && b !== "NULL")
    )
  ].sort();

  console.log("🚗 Brands found:", brands);

  brandSelect.innerHTML = `<option value="">Sve marke</option>`;
  brands.forEach((brand) => {
    const opt = document.createElement("option");
    opt.value = brand;
    opt.textContent = brand;
    brandSelect.appendChild(opt);
  });

  // ---- GODIŠTA ----
  const years = [
    ...new Set(
      allCars
        .map((car) => {
          if (!car.name) return null;
          const m = car.name.match(/(19|20)\d{2}/);
          return m ? parseInt(m[0], 10) : null;
        })
        .filter(Boolean)
    )
  ].sort((a, b) => b - a);

  console.log("📅 Years found:", years);

  yearSelect.innerHTML = `<option value="">Sva godišta</option>`;
  years.forEach((year) => {
    const opt = document.createElement("option");
    opt.value = String(year);
    opt.textContent = String(year);
    yearSelect.appendChild(opt);
  });

  modelSelect.innerHTML = `<option value="">Prvo odaberi marku</option>`;
  modelSelect.disabled = true;

  console.log("✅ loadCars() done");
}


// ----------------------
// FILTRIRANJE MODEL LISTE
// ----------------------
function updateModelOptions() {
  if (!brandSelect || !modelSelect || !yearSelect) return;

  const selectedBrand = brandSelect.value || "";
  const selectedYear = yearSelect.value ? parseInt(yearSelect.value, 10) : null;

  // filtriraj aute prema brandu i godištu
  let filtered = allCars.slice();

  if (selectedBrand) {
    filtered = filtered.filter(
      (car) => getBrandFromCar(car) === selectedBrand
    );
  }

  if (selectedYear) {
    filtered = filtered.filter(
      (car) => getYearFromCar(car) === selectedYear
    );
  }

  modelSelect.innerHTML = "";

  if (!filtered.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Nema modela za ovaj filter";
    modelSelect.appendChild(opt);
    modelSelect.disabled = true;
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = selectedBrand ? "Odaberi model" : "Prvo odaberi marku";
  modelSelect.appendChild(placeholder);

  filtered.forEach((car) => {
    const opt = document.createElement("option");
    opt.value = car.id; // čuvamo id
    opt.textContent = car.name;
    modelSelect.appendChild(opt);
  });

  modelSelect.disabled = false;
}

// ----------------------
// EVENT LISTENERS
// ----------------------
if (brandSelect && modelSelect && yearSelect) {
  loadCars();

  brandSelect.addEventListener("change", () => {
    updateModelOptions();
  });

  yearSelect.addEventListener("change", () => {
    updateModelOptions();
  });
}

// SUBMIT KALKULATORA
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!modelSelect || !modelSelect.value) {
      alert("Molim odaberi model auta.");
      return;
    }

    const carId = modelSelect.value;
    const car = allCars.find((c) => c.id === carId);

    if (!car) {
      alert("Ne mogu pronaći odabrani model u bazi.");
      return;
    }

    // popuni info o autu (naslov + podnaslov)
    if (carTitleEl) carTitleEl.textContent = car.name;
    if (carSubtitleEl) {
      const brand = getBrandFromCar(car);
      const seg = car.segment || "";
      const fuel = car.fuel_type || "";
      carSubtitleEl.textContent = [brand, seg, fuel].filter(Boolean).join(" • ");
    }

    // slika
    if (carImageEl) {
      const imgSrc = car.image_path || fallbackImage;
      carImageEl.src = imgSrc;
      carImageEl.alt = car.name;
      carImageEl.classList.remove("hidden");
    }

    // ulazi
    const annualKm =
      Number(annualKmInput?.value) ||
      Number(car.annual_km_default) ||
      15000;

    let fuelPrice = Number(fuelPriceInput?.value);
    if (!fuelPrice || !Number.isFinite(fuelPrice)) {
      const byType = defaultFuelPriceByType[car.fuel_type] || 1.5;
      fuelPrice = byType;
      if (fuelPriceInput) {
        fuelPriceInput.value = fuelPrice.toFixed(2);
      }
    }

    const result = calculateCosts(car, annualKm, fuelPrice);

    totalYearlyEl.textContent = formatEur(result.totalYearly);
    totalMonthlyEl.textContent = formatEur(result.totalMonthly);
    fuelYearlyEl.textContent = formatEur(result.fuelYearly);
    insYearlyEl.textContent = formatEur(result.insuranceYearly);
    serviceYearlyEl.textContent = formatEur(result.serviceYearly);
    tiresYearlyEl.textContent = formatEur(result.tiresYearly);
    repairsYearlyEl.textContent = formatEur(result.repairsYearly);
    deprYearlyEl.textContent = formatEur(result.depreciationYearly);

    if (resultsSection) {
      resultsSection.hidden = false;
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}
