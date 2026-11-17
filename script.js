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
    "Preferred campus: " + (data.get("campus") === "bherowal" ? "Bherowal Campus" : "Bhoa Hassan Campus"),
    "Contact number: " + data.get("phone"),
    "",
    "Please share the admission details. Thank you."
  ].join("\n");

  document.getElementById("formStatus").textContent = "Opening WhatsApp with your admission enquiry…";
  const campusNumbers = {
    "bherowal": "923455760821",
    "bhoa-hassan": "923150799406"
  };
  const selectedCampus = data.get("campus");
  const whatsappNumber = campusNumbers[selectedCampus];
  if (!whatsappNumber) {
    document.getElementById("formStatus").textContent = "Please select a campus before sending your enquiry.";
    return;
  }
  const whatsappUrl = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message);
  const whatsappWindow = window.open(whatsappUrl, "_blank");
  if (!whatsappWindow) {
    document.getElementById("formStatus").textContent = "WhatsApp could not open automatically. Please allow pop-ups and try again.";
  }
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
    const tbody = document.querySelector("#resultsTable tbody");
    const resultCount = document.getElementById("resultCount");
    if (Array.isArray(data) && data.length > 0 && tbody) {
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
    }

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
          image.src = /^https:\/\//i.test(photo.public_image_path) ? photo.public_image_path : schoolDb.storage.from("school-gallery-public").getPublicUrl(photo.public_image_path).data.publicUrl;
          image.alt = photo.alt_text || photo.title || "Pakistan Scholars High School campus photograph";
          image.loading = "lazy";
          const info = document.createElement("div");
          info.className = "published-gallery-caption";
          const title = document.createElement("h3");
          title.textContent = photo.title;
          const campus = document.createElement("span");
          campus.textContent = photo.campus === "School Gallery" ? "PAKISTAN SCHOLARS" : photo.campus + " Campus";
          info.append(campus, title);
          card.append(image, info);
          galleryGrid.appendChild(card);
        });
      }
    }

    if (resultCount && Array.isArray(data) && data.length > 0) resultCount.textContent = data.length + " records · live database";
    if (resultSearch && Array.isArray(data) && data.length > 0) resultSearch.dispatchEvent(new Event("input"));
  } catch (error) {
    console.warn("School results database is temporarily unavailable; showing the saved page records.", error);
  }
})();


// Load the same latest admin-selected logo into every public brand mark.
(async()=>{
 try{
  const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2.119.0");
  const client=createClient("https://vuptztqeqblngbpflqzt.supabase.co","sb_publishable_fglLwYtA9GpLJdkwRc90Jw_dNw7TtK8");
  const {data,error}=await client.from("school_settings").select("logo_path,updated_at").eq("id",1).maybeSingle();
  if(error)throw error;
  if(!data?.logo_path)return;
  const base=client.storage.from("school-gallery-public").getPublicUrl(data.logo_path).data.publicUrl;
  const url=base+(base.includes("?")?"&":"?")+"v="+encodeURIComponent(data.updated_at||Date.now());
  document.querySelectorAll(".brand-mark").forEach(mark=>{
   const img=document.createElement("img");
   img.src=url;img.alt="Pakistan Scholars High School logo";img.loading="eager";img.decoding="async";
   img.onerror=()=>{console.warn("Uploaded school logo could not be displayed:",url);};
   mark.replaceChildren(img);
   mark.setAttribute("aria-label","Pakistan Scholars High School logo");
   mark.setAttribute("title","Pakistan Scholars High School");
  });
 }catch(error){console.warn("School logo could not be loaded.",error);}
})();


// Keep the school identity prominent at the top, then compact it while scrolling.
(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const updateHeader = () => header.classList.toggle("is-compact", window.scrollY > 45);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
})();


// Accessible More / Show less controls for both leadership biographies.
document.querySelectorAll(".profile-more-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const details = document.getElementById(button.getAttribute("aria-controls"));
    if (!details) return;
    const expanded = button.getAttribute("aria-expanded") === "true";
    details.hidden = expanded;
    button.setAttribute("aria-expanded", String(!expanded));
    button.innerHTML = expanded
      ? 'More <span aria-hidden="true">＋</span>'
      : 'Show less <span aria-hidden="true">−</span>';
  });
});
