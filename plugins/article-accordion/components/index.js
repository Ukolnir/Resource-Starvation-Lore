import { h } from "preact"

/* Аккордеоны в статье. Признак — поле `аккордеон:` (или `accordion:`) во
   фронтматтере статьи. Числа — ОТНОСИТЕЛЬНЫЕ уровни заголовков этой статьи:
   1 = самые верхние заголовки на странице, 2 = следующие под ними, и т.д.
   (не важно, как они выглядят в markdown — Quartz сам сдвигает уровни).
     аккордеон: true    → сворачиваются все уровни заголовков
     аккордеон: 2       → со 2-го уровня и глубже (верхний остаётся обычным)
     аккордеон: "1-1"   → только верхний уровень; подзаголовки внутри НЕ сворачиваются
     аккордеон: "1-2"   → верхние два уровня, глубже — обычный текст
   Заголовки в диапазоне становятся кликабельными, тело секции скрыто до раскрытия;
   всё, что глубже верхней границы, показывается как обычный текст внутри секции.
   Клик по пункту «Содержания» (ссылка #якорь) раскрывает нужную секцию, её
   родителей и скроллит к ней. Рендер маркера — серверный, поведение — клиентский
   скрипт; фактические уровни вычисляются на клиенте по реальным заголовкам. */

const parseRange = (flag) => {
  // возвращаем ПОРЯДКОВЫЕ уровни (1 = самый верхний заголовок статьи); 99 = до конца
  if (flag === true) return { from: 1, to: 99 }
  if (typeof flag === "number") return { from: Math.max(1, flag), to: 99 }
  if (typeof flag === "string") {
    const s = flag.trim()
    const m = s.match(/^(\d)\s*[-–—]\s*(\d)$/) // "1-2"
    if (m) {
      const a = Math.max(1, +m[1]),
        b = Math.max(1, +m[2])
      return { from: Math.min(a, b), to: Math.max(a, b) }
    }
    if (/^\d$/.test(s)) return { from: Math.max(1, +s), to: 99 }
  }
  return { from: 1, to: 99 }
}

const AccordionMarker = ({ fileData }) => {
  const fm = fileData.frontmatter || {}
  const flag = fm["аккордеон"] ?? fm["accordion"]
  if (flag === undefined || flag === null || flag === false) return null
  const { from, to } = parseRange(flag)
  return h("div", { class: "js-accordionize", "data-from": String(from), "data-to": String(to), hidden: true })
}

AccordionMarker.displayName = "AccordionMarker"

AccordionMarker.css = `
.acc { border-left: 2px solid var(--rs-border-strong); margin: 0.5rem 0; }
.acc > .acc-head {
  cursor: pointer;
  position: relative;
  margin: 0;
  padding: 0.35rem 2rem 0.35rem 0.7rem;
  background: var(--rs-bg-code);
  transition: background-color 0.12s, color 0.12s;
  user-select: none;
}
.acc > .acc-head:hover { background: var(--rs-accent-soft); color: var(--rs-text-bright); }
.acc.open > .acc-head { color: var(--rs-accent); }
.acc > .acc-head .acc-chev {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--rs-text-faint);
  transition: transform 0.12s;
}
.acc > .acc-head .acc-chev::before { content: "\\203A"; font-size: 1.3rem; line-height: 1; }
.acc.open > .acc-head .acc-chev { transform: translateY(-50%) rotate(90deg); }
.acc > .acc-body { display: none; padding: 0.2rem 0 0.2rem 0.7rem; }
.acc.open > .acc-body { display: block; }
/* лёгкий сдвиг вложенных уровней */
.acc .acc { margin-left: 0.3rem; }
`

AccordionMarker.afterDOMLoaded = `
(() => {
  if (window.__accordionBound) return;
  window.__accordionBound = true;

  const isHead = (n) => /^H[1-6]$/.test(n.tagName);
  const lvlOf = (n) => parseInt(n.tagName[1], 10);

  function build() {
    const marker = document.querySelector(".js-accordionize");
    const container = document.querySelector("article .markdown-preview-view") || document.querySelector("article");
    if (!marker || !container || container.dataset.accordionized) return;
    const fromOrd = parseInt(marker.dataset.from || "1", 10);
    const toOrd = parseInt(marker.dataset.to || "99", 10);
    // реальные уровни заголовков на странице (по возрастанию), порядковый → фактический
    const levels = [...new Set([...container.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => lvlOf(h)))].sort((a, b) => a - b);
    if (!levels.length) { container.dataset.accordionized = "1"; return; }
    const actualFrom = levels[Math.min(levels.length, fromOrd) - 1];
    const actualTo = levels[Math.min(levels.length, toOrd) - 1];

    for (let lvl = actualTo; lvl >= actualFrom; lvl--) {
      container.querySelectorAll("h" + lvl).forEach((head) => {
        const body = document.createElement("div");
        body.className = "acc-body";
        let n = head.nextElementSibling;
        while (n && !(isHead(n) && lvlOf(n) <= lvl)) {
          const next = n.nextElementSibling;
          body.appendChild(n);
          n = next;
        }
        const sec = document.createElement("section");
        sec.className = "acc acc-l" + lvl;
        head.classList.add("acc-head");
        head.setAttribute("role", "button");
        head.setAttribute("tabindex", "0");
        const chev = document.createElement("span");
        chev.className = "acc-chev";
        head.appendChild(chev);
        head.parentNode.insertBefore(sec, head);
        sec.appendChild(head);
        sec.appendChild(body);
      });
    }
    container.dataset.accordionized = "1";
    openFromHash(false);
  }

  function openById(id, scroll) {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    let p = el.closest(".acc");
    while (p) { p.classList.add("open"); p = p.parentElement && p.parentElement.closest(".acc"); }
    if (scroll) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const openFromHash = (scroll) => openById(decodeURIComponent((location.hash || "").slice(1)), scroll);

  // тоггл по заголовку-аккордеону
  document.addEventListener("click", (e) => {
    const head = e.target.closest(".acc-head");
    if (head && !e.target.closest("a")) {
      e.preventDefault();
      head.closest(".acc").classList.toggle("open");
    }
  });
  // раскрытие цели по клику на ссылку-якорь (Содержание, [[#ссылки]]).
  // Quartz-SPA скроллит сам через pushState (нативный hashchange не стреляет) и
  // глушит всплытие на TOC-ссылках, поэтому слушаем в фазе перехвата (capture).
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const hi = href.indexOf("#");
      if (hi < 0) return;
      const id = decodeURIComponent(href.slice(hi + 1));
      if (id && document.getElementById(id)) setTimeout(() => openById(id, true), 0);
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("acc-head")) {
      e.preventDefault();
      e.target.closest(".acc").classList.toggle("open");
    }
  });
  window.addEventListener("hashchange", () => openFromHash(true));
  document.addEventListener("nav", build);
  build();
})();
`

export { AccordionMarker }
