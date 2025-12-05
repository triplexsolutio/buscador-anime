// elements/missingAnimeForm.js
const __cache = new Map();
const DEFAULT_SRC = new URL("./missingAnimeForm.html", import.meta.url).href;

class MissingAnimeForm extends HTMLElement {
  async connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });

    const attr = this.getAttribute("src");
    const src = attr ? new URL(attr, document.baseURI).href : DEFAULT_SRC;

    try {
      const html = __cache.has(src)
        ? __cache.get(src)
        : await fetch(src, { cache: "no-store" }).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
          });
      __cache.set(src, html);
      root.innerHTML = html;

      // Asegura layout del host
      const baseStyle = document.createElement("style");
      baseStyle.textContent = ":host{display:block}";
      root.prepend(baseStyle);

      const form = root.querySelector("#sib-form");
      const emailInput = root.querySelector("#EMAIL");
      const animeInput = root.querySelector("#ANIME");

      if (!form) return;

      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();

        // Validación nativa
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        // (opcional) Evento GA4
        if (window.gtag) {
          try {
            gtag("event", "missing_anime_submit", {
              email_length: (emailInput?.value || "").length,
              anime_length: (animeInput?.value || "").length,
              origin: "missing_anime_form",
            });
          } catch (_) {}
        }

        try {
          const fd = new FormData(form);
          await fetch(form.action, {
            method: "POST",
            body: fd,
            mode: "no-cors",
          });

          // Reset + feedback
          form.reset();
          if (window.showToast) {
            showToast("¡Solicitud enviada! Te avisaré cuando esté 💌", {
              type: "success",
              duration: 3000,
            });
          }
        } catch (err) {
          console.error("[missing-anime-form] submit error", err);
          if (window.showToast) {
            showToast("No se pudo enviar. Inténtalo de nuevo.", {
              type: "error",
            });
          }
        }
      });
    } catch (err) {
      root.innerHTML = `
        <style>:host{display:block;font:14px/1.4 system-ui;color:var(--text)}</style>
        <div>⚠️ No se pudo cargar el formulario. ${err?.message || ""}</div>
      `;
      console.error("[missing-anime-form]", err);
    }
  }
}

customElements.define("missing-anime-form", MissingAnimeForm);
