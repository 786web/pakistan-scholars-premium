const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  menuToggle.textContent = isOpen ? "×" : "☰";
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.textContent = "☰";
  });
});

document.getElementById("year").textContent = new Date().getFullYear();

const admissionForm = document.getElementById("admissionForm");
admissionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!admissionForm.reportValidity()) return;

  const data = new FormData(admissionForm);
  const message = [
    "Assalam-o-Alaikum Pakistan Scholars High School,",
    "",
    "I would like to enquire about admission.",
    "Parent / Guardian: " + data.get("parentName"),
    "Student: " + data.get("studentName"),
    "Class: " + data.get("className"),
    "Preferred campus: " + data.get("campus"),
    "Contact number: " + data.get("phone"),
    "",
    "Please share the admission details. Thank you."
  ].join("\n");

  document.getElementById("formStatus").textContent = "Opening WhatsApp with your admission enquiry…";
  const whatsappUrl = "https://wa.me/923001560822?text=" + encodeURIComponent(message);
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});

// Lightweight premium motion: reveal on scroll and gentle 3D card tilt.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const revealTargets = document.querySelectorAll(
    ".intro-copy, .intro-visual, .values-grid > div, .section-heading, .campus-card, .feature-item, .result-feature, .archive-row, .life-card, .admissions-grid > div, .admission-form, .contact-inner"
  );

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

    revealTargets.forEach((element) => {
      element.classList.add("motion-reveal");
      revealObserver.observe(element);
    });
  }

  // Pointer-only tilt: disabled on touch screens for comfortable mobile use.
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".campus-card, .life-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * 5;
        const rotateX = (0.5 - y) * 5;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }
})();

const resultSearch = document.getElementById("resultSearch");
if (resultSearch) {
  const resultRows = Array.from(document.querySelectorAll("#resultsTable tbody tr"));
  const resultCount = document.getElementById("resultCount");
  resultSearch.addEventListener("input", () => {
    const query = resultSearch.value.trim().toLocaleLowerCase();
    let visible = 0;
    resultRows.forEach((row) => {
      const match = row.textContent.toLocaleLowerCase().includes(query);
      row.hidden = !match;
      if (match) visible += 1;
    });
    resultCount.textContent = visible + (visible === 1 ? " record" : " records");
  });
}


// Supabase connection: public website reads only published school results.
// The publishable key is intended for browser use; database RLS protects every row.
(async () => {
  const SUPABASE_URL = "https://vuptztqeqblngbpflqzt.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fglLwYtA9GpLJdkwRc90Jw_dNw7TtK8";

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.119.0");
    const schoolDb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data, error } = await schoolDb
      .from("school_results")
      .select("year, student_name, board_roll_no, marks_obtained, total_marks")
      .eq("is_published", true)
      .order("year", { ascending: true })
      .order("student_name", { ascending: true });

    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) return;

    const tbody = document.querySelector("#resultsTable tbody");
    const resultCount = document.getElementById("resultCount");
    if (!tbody) return;

    tbody.replaceChildren();
    data.forEach((record) => {
      const row = document.createElement("tr");
      [
        record.year,
        record.student_name,
        record.board_roll_no || "—",
        record.marks_obtained + "/" + record.total_marks
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });


    // Public gallery only reads rows explicitly approved by the school admin.
    const galleryGrid = document.getElementById("publishedGalleryGrid");
    if (galleryGrid) {
      const { data: photos, error: galleryError } = await schoolDb
        .from("school_gallery")
        .select("id, campus, title, alt_text, public_image_path")
        .eq("is_published", true)
        .not("public_image_path", "is", null)
        .order("created_at", { ascending: false });
      if (galleryError) throw galleryError;
      if (Array.isArray(photos) && photos.length) {
        galleryGrid.replaceChildren();
        photos.forEach((photo) => {
          const card = document.createElement("article");
          card.className = "published-gallery-card";
          const image = document.createElement("img");
          image.src = schoolDb.storage.from("school-gallery-public").getPublicUrl(photo.public_image_path).data.publicUrl;
          image.alt = photo.alt_text || photo.title || "Pakistan Scholars High School campus photograph";
          image.loading = "lazy";
          const info = document.createElement("div");
          info.className = "published-gallery-caption";
          const title = document.createElement("h3");
          title.textContent = photo.title;
          const campus = document.createElement("span");
          campus.textContent = photo.campus + " Campus";
          info.append(campus, title);
          card.append(image, info);
          galleryGrid.appendChild(card);
        });
      }
    }

    if (resultCount) resultCount.textContent = data.length + " records · live database";
    if (resultSearch) resultSearch.dispatchEvent(new Event("input"));
  } catch (error) {
    console.warn("School results database is temporarily unavailable; showing the saved page records.", error);
  }
})();
