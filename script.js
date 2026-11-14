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
