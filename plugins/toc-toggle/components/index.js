import { h } from "preact"

/* Кнопка показа/скрытия оглавления (TOC).
   Живёт в тулбаре слева, рядом с поиском и режимом чтения.

   Поведение видимости оглавления:
   - по умолчанию оглавление ПОКАЗАНО;
   - на странице с `оглавление: false` (или `toc: false`) во фронтматтере —
     ВСЕГДА скрыто при заходе (дефолт важнее): страницы-списки открываются без
     оглавления, даже если читатель включал его где-то раньше. Кнопкой можно
     временно показать его на такой странице;
   - на обычных страницах выбор читателя (клик по кнопке) запоминается в
     localStorage и действует, пока он не переключит обратно.

   Само оглавление всегда генерируется плагином table-of-contents — кнопка лишь
   переключает CSS-видимость через атрибут data-toc на <html>. Если на странице
   оглавления нет (нет заголовков), кнопка не рисуется. */

const classNames = (...c) => c.filter(Boolean).join(" ")

const TocToggle = ({ fileData, displayClass }) => {
  // нет оглавления на странице — нет и кнопки
  if (!fileData?.toc) return null

  const fm = fileData.frontmatter || {}
  const def = fm["оглавление"] === false || fm["toc"] === false ? "off" : "on"

  return h(
    "button",
    {
      type: "button",
      class: classNames(displayClass, "toc-toggle"),
      "aria-label": "Оглавление",
      title: "Показать/скрыть оглавление",
      "data-toc-default": def,
    },
    h(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        width: "20",
        height: "20",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
      h("line", { x1: "8", y1: "6", x2: "21", y2: "6" }),
      h("line", { x1: "8", y1: "12", x2: "21", y2: "12" }),
      h("line", { x1: "8", y1: "18", x2: "21", y2: "18" }),
      h("line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }),
      h("line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }),
      h("line", { x1: "3", y1: "18", x2: "3.01", y2: "18" }),
    ),
  )
}

TocToggle.displayName = "TocToggle"

TocToggle.css = `
.toc-toggle {
  cursor: pointer;
  padding: 0;
  position: relative;
  background: none;
  border: none;
  width: 20px;
  height: 32px;
  margin: 0;
  text-align: inherit;
  flex-shrink: 0;
  color: var(--darkgray);
}
.toc-toggle svg {
  position: absolute;
  top: calc(50% - 10px);
  transition: opacity 0.1s ease, color 0.1s ease;
}
.toc-toggle:hover { color: var(--secondary); }
/* оглавление скрыто — приглушаем иконку */
:root[data-toc="off"] .toc-toggle { opacity: 0.45; }
:root[data-toc="off"] .toc-toggle:hover { opacity: 1; }
/* сам показ/скрытие оглавления */
:root[data-toc="off"] .toc { display: none; }
`

TocToggle.afterDOMLoaded = `
(() => {
  const KEY = "rs-toc-visible";
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch (e) {} };

  function apply() {
    const btn = document.querySelector(".toc-toggle");
    const def = btn && btn.dataset.tocDefault === "off" ? "off" : "on";
    const stored = read();
    let state;
    // дефолт «off» важнее: страницы-списки всегда открываются без оглавления,
    // даже если читатель раньше где-то включил его. На обычных страницах
    // (дефолт «on») действует сохранённый выбор читателя.
    if (def === "off") state = "off";
    else state = stored === "on" || stored === "off" ? stored : "on";
    document.documentElement.setAttribute("data-toc", state);
    if (btn) btn.setAttribute("aria-pressed", state === "on" ? "true" : "false");
  }

  function bind() {
    apply();
    for (const b of document.getElementsByClassName("toc-toggle")) {
      if (b.dataset.bound) continue;
      b.dataset.bound = "1";
      const h = () => {
        const cur = document.documentElement.getAttribute("data-toc") === "off" ? "off" : "on";
        const next = cur === "on" ? "off" : "on";
        document.documentElement.setAttribute("data-toc", next);
        b.setAttribute("aria-pressed", next === "on" ? "true" : "false");
        write(next);
      };
      b.addEventListener("click", h);
      if (window.addCleanup) window.addCleanup(() => b.removeEventListener("click", h));
    }
  }

  document.addEventListener("nav", bind);
  document.addEventListener("render", bind);
})();
`

export { TocToggle }
