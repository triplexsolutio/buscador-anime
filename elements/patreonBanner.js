// Custom Element que inyecta HTML externo dentro de Shadow DOM
const cache = new Map();

// ✅ Resuelve el HTML por defecto al lado de ESTE archivo JS (robusto en subrutas)
const DEFAULT_SRC = new URL("./patreonBanner.html", import.meta.url).href;
const patreonBtn = document.getElementById("patreon_banner_button");

class PatreonBanner extends HTMLElement {
  async connectedCallback() {
    // Si pasas un src, lo normalizamos a URL absoluta; si no, usamos el default:
    const attr = this.getAttribute("src");
    const src = attr ? new URL(attr, document.baseURI).href : DEFAULT_SRC;

    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });

    try {
      const html = cache.has(src)
        ? cache.get(src)
        : await fetch(src, { cache: "no-store" }).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
          });

      cache.set(src, html);
      root.innerHTML = html;

      // Garantiza que el host ocupe espacio aunque el HTML cargado falle
      const style = document.createElement("style");
      style.textContent = ":host{display:block}";
      root.prepend(style);

      const patreonBtn = root.querySelector("#patreon_banner_button");

      if (patreonBtn) {
        patreonBtn.addEventListener("click", () => {
          // Evento de Google Analytics 4
          if (window.gtag) {
            gtag("event", "click_patreon_banner", {
              location: "anime_search_banner",
              link_url: "https://www.patreon.com/triplexsolutio/membership",
            });
          }
          // No hace falta preventDefault porque abre en otra pestaña (_blank)
        });
      }
    } catch (err) {
      root.innerHTML = `
        <style>:host{display:block;font:14px/1.4 system-ui}</style>
        <div class="error">No se pudo cargar <code>${src}</code>: ${err.message}</div>
      `;
      console.error("[patreon-banner]", err);
    }
  }
}

customElements.define("patreon-banner", PatreonBanner);
