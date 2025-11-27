// Custom Element que inyecta HTML externo dentro de Shadow DOM
const cache = new Map();

class PatreonBanner extends HTMLElement {
  async connectedCallback() {
    const src = this.getAttribute("src") || "elements/patreonBanner.html";

    // Evita recargar si ya está renderizado
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

      // Opcional: pasar variables CSS del host al shadow (heredan automáticamente)
      // Puedes exponer estilos globales al :host si necesitas:
      // root.adoptedStyleSheets = [...document.adoptedStyleSheets];
    } catch (err) {
      root.innerHTML = `
        <style>
          :host { display:block; font: 14px/1.4 system-ui, sans-serif; }
          .error { padding:12px; border-radius:8px; background:#2b1b1b; color:#f7d7d7 }
        </style>
        <div class="error">No se pudo cargar <code>${src}</code>: ${err.message}</div>
      `;
      console.error("[patreon-banner]", err);
    }
  }
}

customElements.define("patreon-banner", PatreonBanner);
