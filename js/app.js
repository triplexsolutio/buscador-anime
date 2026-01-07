// ====== ESTADO GLOBAL ======
let animes = [];
let filteredAnimes = [];
let currentPage = 1;
let pageSize = getPageSize(); // dinámico según ancho
let shouldScrollOnPageChange = false;
let patreonCountdownInterval = null;
let patreonGateActive = false;

// ====== ELEMENTOS DOM ======

const resultsContainer = document.getElementById("resultsContainer");
const noResultsEl = document.getElementById("noResults");
const searchInput = document.getElementById("searchInput");
const paginationContainer = document.getElementById("pagination");

// Modal elements
const modal = document.getElementById("animeModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalTitleJp = document.getElementById("modalTitleJp");
const modalYear = document.getElementById("modalYear");
const modalSeasons = document.getElementById("modalSeasons");
const modalEpisodes = document.getElementById("modalEpisodes");
const modalDescription = document.getElementById("modalDescription");
const modalPlatforms = document.getElementById("modalPlatforms");
const modalGenres = document.getElementById("modalGenres");
const patreonGate = document.getElementById("patreonGate");
const patreonCountdownEl = document.getElementById("patreonCountdown");
const patreonTimerEl = document.getElementById("patreonTimer");
const patreonSkipBtn = document.getElementById("patreonSkip");
const menuToggleBtn = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const mobileMenuCloseBtn = document.getElementById("mobileMenuClose");
const searchJumpBtn = document.getElementById("searchJump");
const buscador = document.getElementById("buscar");
const resultsSection = document.querySelector(".results-section");
const clearBtn = document.getElementById("clearSearch");
const searchIconBtn = document.getElementById("searchSubmit");
const addAnimeBtn = document.getElementById("addAnimeBtn");
const logoZone = document.getElementById("logo-id");

// Tema
const themeToggleBtn = document.getElementById("themeToggle");
const rootHtml = document.documentElement;
const bodyEl = document.body;

// Año footer
document.getElementById("year").textContent = new Date().getFullYear();

// ====== INIT ======

document.addEventListener("DOMContentLoaded", () => {
  // 1) Tema guardado
  const savedTheme = localStorage.getItem("ts-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    rootHtml.setAttribute("data-theme", savedTheme);
  }
  updateThemeToggleIcon();

  // 2) Cargar datos
  fetch("data/animes.json")
    .then((res) => res.json())
    .then((data) => {
      animes = data;
      filteredAnimes = animes.slice();
      renderPage(1);
    })
    .catch((err) => {
      console.error("Error cargando animes.json", err);
      noResultsEl.textContent = "Error cargando los datos. Revisa la consola.";
      noResultsEl.classList.remove("hidden");
    });

  // 3) analiticas botones redes footer
  const footerSocialLinks = document.querySelectorAll(".footer-social__link");

  footerSocialLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const network = link.dataset.social || "unknown";

      if (window.gtag) {
        gtag("event", "click_social_footer", {
          network, // "instagram", "tiktok", etc.
          location: "footer", // por si luego tienes botones en otros sitios
          link_url: link.href, // URL real a la que van
        });
      }
      // No hace falta preventDefault: se abrirá en otra pestaña (_blank)
    });
  });
});

// ====== AJUSTE DE PAGE SIZE EN RESIZE ======

window.addEventListener("resize", () => {
  const newPageSize = getPageSize();
  if (newPageSize !== pageSize) {
    pageSize = newPageSize;
    // Re-render con el nuevo tamaño por página
    renderPage(currentPage);
  }
});

function getPageSize() {
  const width = window.innerWidth || document.documentElement.clientWidth;
  // Ejemplo: móviles < 640px → 8, resto → 16
  return width < 640 ? 4 : 8;
}

function scrollToResultsTop(element) {
  // if (!resultsSection) return;
  const rect = element.getBoundingClientRect();
  const absoluteTop = rect.top + window.scrollY;

  // Offset para que no quede pegado del todo al borde (header fijo)
  const offset = 70;

  window.scrollTo({
    top: Math.max(absoluteTop - offset, 0),
    behavior: "smooth",
  });
}

// ====== BUSCADOR ======

searchInput.addEventListener("input", () => {
  const term = searchInput.value.trim().toLowerCase();
  scrollToResultsTop(buscador);
  if (!term) {
    filteredAnimes = animes.slice();
    shouldScrollOnPageChange = false;
    renderPage(1);
    return;
  }

  filteredAnimes = animes.filter((anime) => {
    const nameMatch =
      anime.nombreEng.toLowerCase().includes(term) ||
      (anime.nombreJp && anime.nombreJp.toLowerCase().includes(term));

    const genresMatch = (anime.generos || [])
      .join(" ")
      .toLowerCase()
      .includes(term);

    return nameMatch || genresMatch;
  });
  shouldScrollOnPageChange = false;
  renderPage(1);

  searchInput.classList.toggle("has-value", searchInput.value.length > 0);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    // evento a Google Analytics
    if (window.gtag) {
      gtag("event", "search_input_enter", {
        search_term: searchInput.value.trim() || "",
      });
    }
    event.preventDefault();
    searchInput.blur(); // ocultar teclado móvil
    shouldScrollOnPageChange = true; // desplazar a resultados
    renderPage(1); // asegura render con lo escrito
    scrollToResultsTop(resultsSection);
  } else {
    shouldScrollOnPageChange = false;
  }
});

clearBtn?.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.classList.remove("has-value");
  filteredAnimes = animes.slice();
  shouldScrollOnPageChange = false;
  renderPage(1);
  searchInput.blur(); // oculta teclado en móvil
});

// ====== RENDERIZADO + PAGINACIÓN ======

function renderPage(page) {
  if (!filteredAnimes || filteredAnimes.length === 0) {
    resultsContainer.innerHTML = "";
    paginationContainer.innerHTML = "";
    noResultsEl.classList.remove("hidden");
    return;
  }

  noResultsEl.classList.add("hidden");

  const totalItems = filteredAnimes.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Clamp de página
  currentPage = Math.max(1, Math.min(page, totalPages));

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filteredAnimes.slice(start, end);

  renderResults(pageItems);
  renderPagination(totalPages);
  if (shouldScrollOnPageChange) {
    scrollToResultsTop(resultsSection);
  }
}

function renderResults(list) {
  resultsContainer.innerHTML = "";

  list.forEach((anime) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "result-image-wrapper";

    const img = document.createElement("img");
    img.src = anime.imagen || "img/placeholder.png";
    img.alt = anime.nombreEng;

    imgWrapper.appendChild(img);

    const titleEl = document.createElement("h3");
    titleEl.className = "result-title";
    titleEl.textContent = anime.nombreEng;

    const metaEl = document.createElement("p");
    metaEl.className = "result-meta";
    metaEl.textContent = `${anime.anio ?? ""} · ${
      anime.temporadas ?? "?"
    } temp · ${anime.episodios ?? "?"} ep`;

    const tagsList = document.createElement("ul");
    tagsList.className = "tag-list";
    (anime.generos || []).slice(0, 3).forEach((gen) => {
      const li = document.createElement("li");
      li.className = "tag";
      li.textContent = gen;
      tagsList.appendChild(li);
    });

    card.appendChild(imgWrapper);
    card.appendChild(titleEl);
    card.appendChild(metaEl);
    card.appendChild(tagsList);

    card.addEventListener("click", () => openModal(anime));

    resultsContainer.appendChild(card);
  });
}

function renderPagination(totalPages) {
  paginationContainer.innerHTML = "";

  if (totalPages <= 1) return;

  // Botón "Anterior"
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "‹";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", (e) => {
    e.target.blur();
    if (currentPage > 1) {
      shouldScrollOnPageChange = true;
      renderPage(currentPage - 1);
    }
  });
  paginationContainer.appendChild(prevBtn);

  // NUEVO: solo algunas páginas + puntos suspensivos
  const visiblePages = getVisiblePages(currentPage, totalPages, 5); // cambia 7 si quieres más/menos

  visiblePages.forEach((p) => {
    if (p === "...") {
      const dots = document.createElement("span");
      dots.textContent = "...";
      dots.classList.add("pagination-ellipsis");
      paginationContainer.appendChild(dots);
    } else {
      const btn = document.createElement("button");
      btn.textContent = p;
      if (p === currentPage) {
        btn.classList.add("active");
      }
      btn.addEventListener("click", (e) => {
        e.target.blur();
        if (p !== currentPage) {
          shouldScrollOnPageChange = true;
          renderPage(p);
        }
      });
      paginationContainer.appendChild(btn);
    }
  });

  // Botón "Siguiente"
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "›";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", (e) => {
    e.target.blur();
    if (currentPage < totalPages) {
      shouldScrollOnPageChange = true;
      renderPage(currentPage + 1);
    }
  });
  paginationContainer.appendChild(nextBtn);
}

function getVisiblePages(currentPage, totalPages, maxButtons = 5) {
  const pages = [];

  // Si hay pocas páginas, mostramos todas
  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  const firstPage = 1;
  const lastPage = totalPages;
  const windowSize = maxButtons - 2; // reservamos 2 para primera y última

  let start = currentPage - Math.floor(windowSize / 2);
  let end = currentPage + Math.floor(windowSize / 2);

  if (start < 2) {
    start = 2;
    end = start + windowSize - 1;
  }

  if (end > lastPage - 1) {
    end = lastPage - 1;
    start = end - windowSize + 1;
  }

  pages.push(firstPage);

  if (start > 2) {
    pages.push("...");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < lastPage - 1) {
    pages.push("...");
  }

  pages.push(lastPage);

  return pages;
}

// ====== MODAL ======

function setModalContent(anime) {
  modalImage.src = anime.imagen || "img/placeholder.png";
  modalTitle.textContent = anime.nombreEng;
  modalTitleJp.textContent = anime.nombreJp ? "(" + anime.nombreJp + ")" : "";
  modalYear.textContent = anime.anio || "";
  modalSeasons.textContent = anime.temporadas ?? "?";
  modalEpisodes.textContent = anime.episodios ?? "?";
  modalDescription.textContent = anime.descripcion || "";

  // evento a Google Analytics
  if (window.gtag) {
    gtag("event", "open_modal_anime", {
      anime: anime.nombreEng,
    });
  }

  // Plataformas
  modalPlatforms.innerHTML = "";
  if (anime.plataformas) {
    Object.entries(anime.plataformas).forEach(([nombre, disponible]) => {
      if (!disponible) return;
      const animeURL = anime.plataformas[nombre];
      const a = document.createElement("a");
      a.href = animeURL;
      a.textContent = nombre;
      a.className = "tag";
      a.target = "_blank";
      a.rel = "noopener";

      a.addEventListener("click", (e) => {
        // evento a Google Analytics
        if (window.gtag) {
          gtag("event", "go_to_plataform_clic", {
            plataform_clic: nombre,
          });
        }
      });

      modalPlatforms.appendChild(a);
    });
  }

  // Géneros
  modalGenres.innerHTML = "";
  (anime.generos || []).forEach((gen) => {
    const li = document.createElement("li");
    li.className = "tag";
    li.textContent = gen;
    modalGenres.appendChild(li);
  });
}

function updatePatreonCountdown(value) {
  if (patreonCountdownEl) {
    patreonCountdownEl.textContent = value;
  }
}

function clearPatreonGateTimers() {
  if (patreonCountdownInterval) {
    clearInterval(patreonCountdownInterval);
    patreonCountdownInterval = null;
  }
}

function lockPageScroll() {
  bodyEl?.classList.add("modal-open");
}

function unlockPageScroll() {
  bodyEl?.classList.remove("modal-open");
}

function hidePatreonGate({ showModalAfter = false } = {}) {
  clearPatreonGateTimers();
  if (patreonGate) {
    patreonGate.classList.add("hidden");
  }
  if (patreonTimerEl) {
    patreonTimerEl.classList.remove("hidden");
  }
  patreonSkipBtn?.classList.add("hidden");
  patreonSkipBtn?.setAttribute("aria-disabled", "true");
  patreonGateActive = false;
  if (showModalAfter) {
    modal.classList.remove("hidden");
    lockPageScroll();
  } else {
    unlockPageScroll();
  }
}

function startPatreonGate() {
  if (patreonGateActive) {
    hidePatreonGate();
  }

  if (!patreonGate) {
    lockPageScroll();
    modal.classList.remove("hidden");
    return;
  }

  patreonGateActive = true;
  lockPageScroll();
  modal.classList.add("hidden");
  patreonGate.classList.remove("hidden");
  patreonTimerEl?.classList.remove("hidden");
  patreonSkipBtn?.classList.add("hidden");
  patreonSkipBtn?.setAttribute("aria-disabled", "true");

  let remaining = 15;
  updatePatreonCountdown(remaining);
  clearPatreonGateTimers();

  patreonCountdownInterval = setInterval(() => {
    remaining -= 1;
    updatePatreonCountdown(Math.max(remaining, 0));
    if (remaining <= 0) {
      clearPatreonGateTimers();
      patreonTimerEl?.classList.add("hidden");
      patreonSkipBtn?.classList.remove("hidden");
      patreonSkipBtn?.removeAttribute("aria-disabled");
    }
  }, 1000);
}

function openModal(anime) {
  setModalContent(anime);
  startPatreonGate();
}

function closeModal() {
  modal.classList.add("hidden");
  hidePatreonGate();
}

modalCloseBtn.addEventListener("click", closeModal);

modal.addEventListener("click", (e) => {
  if (e.target === modal || e.target.classList.contains("modal-backdrop")) {
    closeModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;

  if (patreonGate && !patreonGate.classList.contains("hidden")) {
    hidePatreonGate();
    return;
  }

  if (!modal.classList.contains("hidden")) {
    closeModal();
  }
});

patreonSkipBtn?.addEventListener("click", () => {
  hidePatreonGate({ showModalAfter: true });
});

patreonCountdownEl?.addEventListener("click", () => {
  hidePatreonGate({ showModalAfter: true });
});

patreonGate?.addEventListener("click", (e) => {
  if (e.target.classList.contains("patreon-gate__backdrop")) {
    hidePatreonGate();
  }
});

// ====== TEMA LIGHT/DARK ======

function updateThemeToggleIcon() {
  if (!themeToggleBtn) return;
  const isDark = rootHtml.getAttribute("data-theme") === "dark";
  themeToggleBtn.innerHTML = isDark
    ? '<i class="fa-solid fa-moon"></i>'
    : '<i class="fa-solid fa-sun"></i>';
}

themeToggleBtn?.addEventListener("click", () => {
  const current = rootHtml.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  rootHtml.setAttribute("data-theme", next);
  localStorage.setItem("ts-theme", next);
  updateThemeToggleIcon();
});

// ====== MENÚ MÓVIL ======

function openMobileMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.add("open");
  if (window.gtag) {
    gtag("event", "open_mobile_menu", {});
  }
}

function closeMobileMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.remove("open");

  if (window.gtag) {
    gtag("event", "close_mobile_menu", {});
  }
}

menuToggleBtn?.addEventListener("click", () => {
  if (!mobileMenu) return;
  if (mobileMenu.classList.contains("open")) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
});

mobileMenuCloseBtn?.addEventListener("click", closeMobileMenu);

// Cerrar al hacer clic en el fondo
mobileMenu?.addEventListener("click", (e) => {
  if (e.target.classList.contains("mobile-menu-backdrop")) {
    closeMobileMenu();
  }
});

// Cerrar al pulsar ESC si el menú está abierto (aprovechamos el mismo keydown que el modal)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (patreonGate && !patreonGate.classList.contains("hidden")) {
      hidePatreonGate();
      return;
    }
    if (!modal.classList.contains("hidden")) {
      closeModal();
    }
    if (mobileMenu?.classList.contains("open")) {
      closeMobileMenu();
    }
  }
});

// Cerrar menú al hacer clic en un enlace interno
document.querySelectorAll("[data-menu-link]").forEach((link) => {
  link.addEventListener("click", () => {
    closeMobileMenu();
  });
});

// ====== BOTÓN LUPA: IR A LA SECCIÓN BUSCADOR Y DESTACAR INPUT ======

searchJumpBtn?.addEventListener("click", () => {
  scrollToResultsTop(buscador);

  if (mobileMenu?.classList.contains("open")) {
    closeMobileMenu();
  }

  // pequeña espera para que el scroll termine y luego animamos el input
  setTimeout(highlightSearchInput, 350);
});

function highlightSearchInput() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  // reset de la animación (por si se repite)
  input.classList.remove("search-highlight");
  void input.offsetWidth; // truco para reiniciar animación CSS

  input.classList.add("search-highlight");
  input.focus();

  // quitar la clase al finalizar la animación (opcional pero limpio)
  input.addEventListener(
    "animationend",
    () => {
      input.classList.remove("search-highlight");
    },
    { once: true }
  );
}

function triggerSearchFromIcon() {
  const q = searchInput.value.trim();
  // evento a Google Analytics
  if (window.gtag) {
    gtag("event", "triggerSearchFromIcon", {
      searchInput: q || "",
    });
  }
  if (!q) {
    // si está vacío, solo enfoca para escribir
    searchInput.focus();
    return;
  }
  shouldScrollOnPageChange = true;
  renderPage(1); // tu función de render con la query actual
  searchInput.blur(); // ocultar teclado en móvil
  if (typeof scrollToResultsTop === "function")
    scrollToResultsTop(resultsSection);
}

searchIconBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  triggerSearchFromIcon();
});

// Accesible con teclado: Enter y Space en la lupa
searchIconBtn?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    triggerSearchFromIcon();
  }
});

addAnimeBtn?.addEventListener("click", () => {
  if (window.gtag) {
    gtag("event", "add_anime_btn_form", {});
  }
});

// ==============  OTROS EVENTOS ================

logoZone.addEventListener("click", () => {
  // Siempre te lleva al home del dominio (raíz)
  const url = `${window.location.origin}/`;
  window.location.href = url; // misma pestaña
});

// ============== Simple toast/snackbar ==============
function showToast(message, { type = "success", duration = 2600 } = {}) {
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");

  // (opcional) icono según tipo
  const icon = type === "success" ? "✅" : type === "error" ? "⚠️" : "ℹ️";
  el.innerHTML = `<span class="toast__icon" aria-hidden="true">${icon}</span>${message}`;

  document.body.appendChild(el);
  // entrada
  requestAnimationFrame(() => el.classList.add("is-visible"));

  // cierre automático y al hacer clic
  const close = () => {
    el.classList.remove("is-visible");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  };
  const t = setTimeout(close, duration);
  el.addEventListener("click", () => {
    clearTimeout(t);
    close();
  });
}

// Para poder llamarlo desde cualquier parte si lo necesitas:
window.showToast = showToast;
