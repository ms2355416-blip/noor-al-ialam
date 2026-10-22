
const $ = (id) => document.getElementById(id);

const menuBtn = $("menuBtn");
const nav = $("nav");

menuBtn?.addEventListener("click", () => nav.classList.toggle("open"));
nav?.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => nav.classList.remove("open"))
);

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}

const prayerNames = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء"
};

async function loadPrayerTimes() {
  const grid = $("prayerGrid");
  $("nextPrayer").textContent = "جارٍ تحميل المواقيت…";
  grid.innerHTML = "<p>جارٍ تحميل مواقيت الصلاة…</p>";

  try {
    const date = new Date();
    const stamp = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const url = `https://api.aladhan.com/v1/timingsByCity/${stamp}?city=Alexandria&country=Egypt&method=5`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("prayer request failed");

    const json = await response.json();
    const times = json.data.timings;
    const wanted = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

    grid.innerHTML = "";

    wanted.forEach(key => {
      const card = document.createElement("div");
      card.className = "prayer";

      const heading = document.createElement("h3");
      heading.textContent = prayerNames[key];

      const time = document.createElement("b");
      time.textContent = times[key];

      card.append(heading, time);
      grid.append(card);
    });

    const now = date.getHours() * 60 + date.getMinutes();

    const upcoming = wanted
      .filter(k => {
        const [h, m] = times[k].split(":").map(Number);
        return h * 60 + m > now;
      })
      .map(k => ({
        key: k,
        minutes: times[k].split(":").map(Number)
          .reduce((a, v, i) => a + v * (i === 0 ? 60 : 1), 0)
      }))
      .sort((a, b) => a.minutes - b.minutes)[0];

    $("nextPrayer").textContent = upcoming
      ? `الصلاة القادمة: ${prayerNames[upcoming.key]} — ${times[upcoming.key]}`
      : "مواقيت اليوم معروضة";

    $("prayerNote").textContent =
      `تاريخ اليوم: ${json.data.date.readable} — الإسكندرية. قد تختلف طريقة الحساب؛ راجع مصدرًا محليًا موثوقًا.`;

  } catch (e) {
    grid.innerHTML =
      '<p class="error">تعذر تحميل المواقيت. تأكد من اتصال الإنترنت ثم اضغط «تحديث المواقيت».</p>';

    $("nextPrayer").textContent = "تعذر التحميل";
    $("prayerNote").textContent = "تعذر الاتصال بمصدر المواقيت.";
  }
}

$("refreshPrayer")?.addEventListener("click", loadPrayerTimes);
loadPrayerTimes();

let surahs = [];

async function loadSurahs() {
  const list = $("surahList");

  try {
    const res = await fetch("https://api.alquran.cloud/v1/surah");
    if (!res.ok) throw new Error("quran list failed");

    const data = await res.json();
    surahs = data.data;
    renderSurahs(surahs);

  } catch {
    list.innerHTML =
      '<p class="error">تعذر تحميل السور. تحقق من الإنترنت ثم أعد تحميل الصفحة.</p>';
  }
}

function renderSurahs(items) {
  const list = $("surahList");
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = "<p>لا توجد نتائج.</p>";
    return;
  }

  items.forEach(surah => {
    const button = document.createElement("button");
    button.className = "surah";

    button.innerHTML =
      `<span class="n">${surah.number}</span> <span class="name"></span><span class="muted small"> — ${surah.numberOfAyahs} آية</span>`;

    button.querySelector(".name").textContent = surah.name;
    button.addEventListener("click", () => openSurah(surah));

    list.append(button);
  });
}

$("surahSearch")?.addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();

  renderSurahs(
    surahs.filter(s =>
      s.name.toLowerCase().includes(q) || String(s.number) === q
    )
  );
});

async function openSurah(surah) {
  const reader = $("reader");
  reader.classList.remove("hidden");

  $("surahTitle").textContent =
    `${surah.name} — سورة رقم ${surah.number}`;

  $("ayahs").textContent = "جارٍ تحميل الآيات…";

  $("audio").src =
    `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surah.number}.mp3`;

  reader.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/surah/${surah.number}`
    );

    if (!res.ok) throw new Error("surah request failed");

    const data = await res.json();
    const fragment = document.createDocumentFragment();

    data.data.ayahs.forEach(ayah => {
      const span = document.createElement("span");
      span.textContent = `${ayah.text} ۞ `;
      fragment.append(span);
    });

    $("ayahs").replaceChildren(fragment);

  } catch {
    $("ayahs").textContent =
      "تعذر تحميل الآيات. تحقق من اتصال الإنترنت.";
  }
}

$("closeReader")?.addEventListener("click", () =>
  $("reader").classList.add("hidden")
);

loadSurahs();

let count = 0;
let currentDhikr = "سبحان الله";

document.querySelectorAll("[data-dhikr]").forEach(button => {
  button.addEventListener("click", () => {
    currentDhikr = button.dataset.dhikr;
    $("currentDhikr").textContent = currentDhikr;

    document.querySelectorAll("[data-dhikr]").forEach(b =>
      b.classList.toggle("on", b === button)
    );
  });
});

function updateCount() {
  $("count").textContent = count;

  const target = Number($("targetCount").value);

  $("targetMessage").textContent =
    target && count >= target
      ? `أتممت ${target} مرة من ${currentDhikr}، تقبّل الله منك.`
      : "بالتوفيق، تقبّل الله منك.";
}

$("countBtn").addEventListener("click", () => {
  count++;
  updateCount();
});

$("resetCount").addEventListener("click", () => {
  count = 0;
  updateCount();
});

$("targetCount").addEventListener("change", updateCount);

document.querySelectorAll(".copyDhikr").forEach(button => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      toast("تم نسخ الذكر");
    } catch {
      toast(button.dataset.copy);
    }
  });
});
