import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("app.js loaded");

// 🔧 OVDJE UBACI SVOJE PODATKE
const supabaseUrl = "https://yvfcisqttpcccbbppycu.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZmNpc3F0dHBjY2NiYnBweWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODcwMzUsImV4cCI6MjA4MDg2MzAzNX0.2tvPijAXms6mdUZtMmm_Ae6guhZ0bo0bohf8iFjaccM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// DOM elementi – postoje samo na calculator.html
const carSelect = document.getElementById("car-select");
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

// info o autu
const carImageEl = document.getElementById("car-image");
const carTitleEl = document.getElementById("car-title");
const carSubtitleEl = document.getElementById("car-subtitle");

// default cijene goriva po tipu
const defaultFuelPriceByType = {
  dizel: 1.55,
  benzin: 1.65,
  "benzin-hibrid": 1.6,
};

// fallback slika ako model nema svoju
const fallbackImage = "/cars/default.jpg"; // napravi ju u public/cars/default.jpg

function formatEur(value) {
  if (!Number.isFinite(value)) return "–";
  return value.toFixed(0) + " €";
}

function calculateCosts(car, annualKm, fuelPrice) {
  const fuelConsumption = Number(car.fuel_consumption ?? 0);
  const fuelYearly = (annualKm / 100) * fuelConsumption * fuelPrice;

  const purchase = Number(car.purchase_price ?? 0);
  const resale = Number(car.resale_price_after_n_years ?? 0);
  const years = Number(car.years_for_depreciation || 5);
  const depreciationYearly =
    years > 0 ? (purchase - resale) / years : 0;

  const insuranceYearly = Number(car.insurance_registration_yearly ?? 0);
  const serviceYearly = Number(car.service_yearly ?? 0);
  const tiresPrice = Number(car.tires_set_price ?? 0);
  const tiresYears = Number(car.tires_years || 4);
  const tiresYearly =
    tiresYears > 0 ? tiresPrice / tiresYears : 0;
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

async function loadCars() {
  if (!carSelect) {
    console.warn("carSelect not found, vjerojatno nismo na calculator.html");
    return;
  }

  carSelect.innerHTML = `<option value="">Učitavanje...</option>`;

  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .order("name", { ascending: true });

  console.log("Supabase odgovor:", { data, error });

  if (error) {
    console.error("Supabase error:", error);
    alert("Supabase error: " + error.message);
    carSelect.innerHTML = `<option value="">Greška pri učitavanju</option>`;
    return;
  }

  if (!data || data.length === 0) {
    carSelect.innerHTML = `<option value="">Nema dostupnih modela</option>`;
    return;
  }

  carSelect.innerHTML = `<option value="">Odaberi model</option>`;

  data.forEach((car) => {
    const opt = document.createElement("option");
    opt.value = car.id;
    opt.textContent = car.name;
    opt.dataset.car = JSON.stringify(car);
    carSelect.appendChild(opt);
  });
}

if (carSelect) {
  loadCars();

  carSelect.addEventListener("change", () => {
    const selectedOption = carSelect.options[carSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;

    const car = JSON.parse(selectedOption.dataset.car);

    // prikaži osnovne info
    if (carTitleEl) carTitleEl.textContent = car.name;
    if (carSubtitleEl)
      carSubtitleEl.textContent = `${car.segment} • ${car.fuel_type}`;

    // slika po modelu
    if (carImageEl) {
      const imgSrc = car.image_path || fallbackImage;
      if (imgSrc) {
        carImageEl.src = imgSrc;
        carImageEl.alt = car.name;
        carImageEl.classList.remove("hidden");
      } else {
        carImageEl.classList.add("hidden");
      }
    }

    // default annual km
    if (annualKmInput && car.annual_km_default) {
      annualKmInput.value = car.annual_km_default;
    }

    // default fuel price po tipu goriva (bez miksanja ?? i ||)
    if (fuelPriceInput) {
      let price = defaultFuelPriceByType[car.fuel_type];

      if (price == null || Number.isNaN(price)) {
        // ako nemamo mapirano, koristi postojeći unos ili 1.5 kao fallback
        price = Number(fuelPriceInput.value) || 1.5;
      }

      fuelPriceInput.value = price.toFixed(2);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const selectedOption = carSelect.options[carSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
      alert("Molim odaberi model auta.");
      return;
    }

    const car = JSON.parse(selectedOption.dataset.car);
    const annualKm =
      Number(annualKmInput.value) ||
      Number(car.annual_km_default) ||
      15000;
    const fuelPrice = Number(fuelPriceInput.value) || 1.5;

    const result = calculateCosts(car, annualKm, fuelPrice);

    totalYearlyEl.textContent = formatEur(result.totalYearly);
    totalMonthlyEl.textContent = formatEur(result.totalMonthly);

    fuelYearlyEl.textContent = formatEur(result.fuelYearly);
    insYearlyEl.textContent = formatEur(result.insuranceYearly);
    serviceYearlyEl.textContent = formatEur(result.serviceYearly);
    tiresYearlyEl.textContent = formatEur(result.tiresYearly);
    repairsYearlyEl.textContent = formatEur(result.repairsYearly);
    deprYearlyEl.textContent = formatEur(result.depreciationYearly);

    resultsSection.hidden = false;
  });
}
