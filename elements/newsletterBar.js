// elements/newsletterBar.js
const cache = new Map();
const DEFAULT_SRC = new URL("./newsletterBar.html", import.meta.url).href;

class NewsletterBar extends HTMLElement {
  async connectedCallback() {
    if (this.shadowRoot) return;

    const root = this.attachShadow({ mode: "open" });
    const attr = this.getAttribute("src");
    const src = attr ? new URL(attr, document.baseURI).href : DEFAULT_SRC;

    try {
      const html = cache.has(src)
        ? cache.get(src)
        : await fetch(src, { cache: "no-store" }).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
          });

      cache.set(src, html);
      root.innerHTML = html;

      // Asegura que el host siempre ocupe espacio
      const baseStyle = document.createElement("style");
      baseStyle.textContent = ":host{display:block}";
      root.prepend(baseStyle);

      const form = root.querySelector("#sib-form");

      if (form) {
        form.addEventListener("submit", async (event) => {
          event.preventDefault(); // 👈 ya no navegamos fuera

          // 1) Validación HTML5
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const emailInput = form.querySelector("#EMAIL");
          const emailValue = emailInput?.value.trim() || "";

          // 2) GA4 opcional
          if (window.gtag) {
            try {
              gtag("event", "newsletter_submit", {
                origin: "home_bar_brevo",
                email_length: emailValue.length,
              });
            } catch (err) {
              console.warn("[newsletter-bar] GA4 event error", err);
            }
          }

          // 3) Enviar a Brevo en segundo plano
          try {
            const formData = new FormData(form);

            await fetch(form.action, {
              method: "POST",
              body: formData,
              mode: "no-cors", // no leemos respuesta, solo disparamos el POST
            });

            // 4) Feedback al usuario
            emailInput.value = "";
            showToast("¡Listo! Te has suscrito con éxito 🙂", {
              type: "success",
              duration: 2800,
            });
          } catch (err) {
            console.error("[newsletter-bar] Error enviando a Brevo", err);
            showToast("Ocurrió un error. Inténtalo de nuevo.", {
              type: "error",
            });
          }
        });
      }
    } catch (err) {
      root.innerHTML = `
        <style>:host{display:block;font:14px/1.4 system-ui}</style>
        <div class="error">No se pudo cargar el formulario de newsletter: ${err.message}</div>
      `;
      console.error("[newsletter-bar]", err);
    }
  }
}

customElements.define("newsletter-bar", NewsletterBar);
