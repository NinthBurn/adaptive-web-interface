function initializeInterfacePage() {
  initializeThemeToggle();
  initializeChapterNavigation();
  initializeCarousels();
  initializeFlipCards();
  initializeModals();
}

function initializeThemeToggle() {
  const root = document.documentElement;
  const toggle = document.querySelector(".theme-toggle");
  const label = toggle?.querySelector(".theme-label");
  const icon = toggle?.querySelector(".theme-icon");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  if (!toggle) return;

  const savedTheme = localStorage.getItem("interface-theme");

  function applyTheme(theme) {
    root.dataset.theme = theme;

    const isDark = theme === "dark";

    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");

    if (label) label.textContent = isDark ? "Light" : "Dark";
    if (icon) icon.textContent = isDark ? "☼" : "◐";
  }

  applyTheme(savedTheme || (systemTheme.matches ? "dark" : "light"));

  toggle.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

    localStorage.setItem("interface-theme", nextTheme);
    applyTheme(nextTheme);
  });

  function handleSystemThemeChange(event) {
    if (!localStorage.getItem("interface-theme")) {
      applyTheme(event.matches ? "dark" : "light");
    }
  }

  if (systemTheme.addEventListener) {
    systemTheme.addEventListener("change", handleSystemThemeChange);
  } else {
    systemTheme.addListener(handleSystemThemeChange);
  }
}

function initializeChapterNavigation() {
  const links = [...document.querySelectorAll(".chapter-link")];

  const sections = links
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!links.length || !sections.length) return;

  function setActiveChapter(sectionId) {
    links.forEach(link => {
      const isActive = link.getAttribute("href") === `#${sectionId}`;

      link.classList.toggle("active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function updateActiveChapter() {
    const activationPoint = window.innerHeight * 0.35;

    let activeSection = sections[0];

    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= activationPoint) {
        activeSection = section;
      }
    });

    setActiveChapter(activeSection.id);
  }

  const observer = new IntersectionObserver(updateActiveChapter, {
    rootMargin: "-20% 0px -65% 0px",
    threshold: [0, 0.1, 0.25, 0.5]
  });

  sections.forEach(section => observer.observe(section));

  window.addEventListener("scroll", updateActiveChapter, { passive: true });
  window.addEventListener("resize", updateActiveChapter);

  links.forEach(link => {
    link.addEventListener("click", () => {
      const sectionId = link.getAttribute("href").slice(1);
      setActiveChapter(sectionId);
    });
  });

  updateActiveChapter();
}

function initializeCarousels() {
  initializeCarousel("#interface-carousel", "[data-carousel-prev]", "[data-carousel-next]");
  initializeCarousel("#perspectives-carousel", "[data-perspectives-prev]", "[data-perspectives-next]");
}

function initializeCarousel(trackSelector, previousSelector, nextSelector) {
  const track = document.querySelector(trackSelector);
  const previous = document.querySelector(previousSelector);
  const next = document.querySelector(nextSelector);

  if (!track || !previous || !next) return;

  const cards = [...track.children];

  if (!cards.length) return;

  function getCarouselStep() {
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;

    return cardWidth + gap;
  }

  function updateCarouselButtons() {
    const maxScroll = track.scrollWidth - track.clientWidth;

    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maxScroll - 2;
  }

  function moveCarousel(direction) {
    track.scrollBy({
      left: direction * getCarouselStep(),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth"
    });
  }

  previous.addEventListener("click", () => moveCarousel(-1));
  next.addEventListener("click", () => moveCarousel(1));

  track.addEventListener("scroll", updateCarouselButtons, { passive: true });
  window.addEventListener("resize", updateCarouselButtons);

  updateCarouselButtons();
}

function initializeFlipCards() {
  initializeCardGroup(".word-card");
  initializeCardGroup(".perspective-card");
}

function initializeCardGroup(selector) {
  const cards = [...document.querySelectorAll(selector)];

  if (!cards.length) return;

  function resetCardGroup() {
    cards.forEach(card => {
      card.classList.remove("is-flipped");
      card.setAttribute("aria-pressed", "false");
    });
  }

  function toggleCard(card) {
    const isAlreadyFlipped = card.classList.contains("is-flipped");

    resetCardGroup();

    if (!isAlreadyFlipped) {
      card.classList.add("is-flipped");
      card.setAttribute("aria-pressed", "true");
    }
  }

  cards.forEach(card => {
    card.addEventListener("click", () => toggleCard(card));

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleCard(card);
      }

      if (event.key === "Escape") {
        resetCardGroup();
        card.blur();
      }
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(selector)) {
      resetCardGroup();
    }
  });
}

function initializeModals() {
  const modalConfigs = [
    {
      modal: "#fun-fact-modal",
      dialog: ".fun-fact-modal",
      openButton: ".fun-fact-button"
    },
    {
      modal: "#credits-modal",
      dialog: ".modal-content",
      openButton: ".credits-button"
    }
  ];

  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  let activeModal = null;
  let previousFocus = null;
  let inertStates = [];
  let previousOverflow = "";

  function getFocusableElements(dialog) {
    return [...dialog.querySelectorAll(focusableSelector)]
      .filter(element =>
        !element.hasAttribute("hidden") &&
        element.getAttribute("aria-hidden") !== "true"
      );
  }

  function lockPage(modal) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    inertStates = [...document.body.children]
      .filter(element => element !== modal)
      .map(element => ({
        element,
        wasInert: element.inert
      }));

    inertStates.forEach(({ element }) => {
      element.inert = true;
    });
  }

  function unlockPage() {
    document.body.style.overflow = previousOverflow;

    inertStates.forEach(({ element, wasInert }) => {
      element.inert = wasInert;
    });

    inertStates = [];
  }

  function closeModal() {
    if (!activeModal) return;

    activeModal.modal.hidden = true;
    unlockPage();

    document.removeEventListener("keydown", handleModalKeyboard);

    const focusTarget = previousFocus;

    activeModal = null;
    previousFocus = null;

    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus();
    }
  }

  function openModal(config) {
    if (activeModal) closeModal();

    activeModal = config;
    previousFocus = document.activeElement;

    config.modal.hidden = false;
    lockPage(config.modal);

    config.closeButton.focus();

    document.addEventListener("keydown", handleModalKeyboard);
  }

  function handleModalKeyboard(event) {
    if (!activeModal) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements(activeModal.dialog);

    if (!focusableElements.length) {
      event.preventDefault();
      activeModal.dialog.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  modalConfigs.forEach(config => {
    const modal = document.querySelector(config.modal);
    const dialog = modal?.querySelector(config.dialog);
    const openButton = document.querySelector(config.openButton);
    const closeButton = modal?.querySelector(".modal-close");

    if (!modal || !dialog || !openButton || !closeButton) return;

    config.modal = modal;
    config.dialog = dialog;
    config.closeButton = closeButton;

    modal.addEventListener("click", event => {
      if (event.target === modal && activeModal === config) {
        closeModal();
      }
    });

    openButton.addEventListener("click", () => {
      openModal(config);
    });

    closeButton.addEventListener("click", closeModal);
  });
}

initializeInterfacePage();