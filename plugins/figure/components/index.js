/* Картинки «как в Википедии»: обтекание текстом и подпись.
   Управляется первым словом в тексте после | у картинки:
     ![[AXIOM.png|справа|300]]                         → справа, текст слева от неё
     ![[AXIOM.png|справа Башня AXIOM в Нойштале|300]]  → то же + подпись под картинкой
     ![[AXIOM.png|слева Подпись]]                      → слева (ширина по умолчанию)
     ![[AXIOM.png|центр Подпись|500]]                  → по центру, без обтекания
   Слова: справа/слева/центр (или right/left/center). Число в конце — ширина в px.
   Без этих слов картинка остаётся обычной. Подпись — простой текст (без ссылок).
   На узком экране обтекание отключается — картинка встаёт по центру во всю ширину.
   Рендерить нечего: компонент только подключает CSS и клиентский скрипт. */

const FigureMarker = () => null

FigureMarker.displayName = "FigureMarker"

FigureMarker.css = `
.rs-fig {
  margin: 0.3rem 0 1rem;
  padding: 4px;
  max-width: 100%;
  background: var(--rs-bg-code);
  border: 1px solid var(--rs-border-strong);
  box-sizing: border-box;
}
.rs-fig > img {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  border-radius: 0;
}
.rs-fig > figcaption {
  margin: 0.35rem 0.2rem 0.1rem;
  font-size: 0.85em;
  line-height: 1.35;
  color: var(--rs-text-faint);
  text-align: center;
}
.rs-fig-right { float: right; clear: right; margin-left: 1.5rem; width: 300px; max-width: 45%; }
.rs-fig-left  { float: left;  clear: left;  margin-right: 1.5rem; width: 300px; max-width: 45%; }
.rs-fig-center { margin-left: auto; margin-right: auto; }
@media (max-width: 600px) {
  .rs-fig-right, .rs-fig-left { float: none; margin: 0.5rem auto 1rem; max-width: 100%; }
}
`

FigureMarker.afterDOMLoaded = `
(() => {
  if (window.__figureBound) return;
  window.__figureBound = true;

  const POS = { "справа": "right", "right": "right", "слева": "left", "left": "left", "центр": "center", "center": "center" };

  function build() {
    document.querySelectorAll("article img[alt]").forEach((img) => {
      if (img.closest(".rs-fig")) return;
      const m = (img.getAttribute("alt") || "").trim().match(/^(\\S+)\\s*[:—–-]?\\s*([\\s\\S]*)$/);
      const pos = m && POS[m[1].toLowerCase()];
      if (!pos) return;
      const caption = m[2].trim();

      const fig = document.createElement("figure");
      fig.className = "rs-fig rs-fig-" + pos;
      const w = parseInt(img.getAttribute("width"), 10);
      if (w > 0) fig.style.width = w + "px";
      img.setAttribute("alt", caption);
      img.removeAttribute("width");
      img.removeAttribute("height");

      // картинка лежит внутри абзаца — выносим фигуру перед ним, чтобы
      // абзац и всё ниже обтекало её; перенос строки после картинки убираем
      const p = img.parentElement;
      if (p && p.tagName === "P") {
        let n = img.nextSibling;
        while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
        if (n && n.nodeName === "BR") n.remove();
        p.parentNode.insertBefore(fig, p);
        fig.appendChild(img);
        if (!p.textContent.trim() && !p.children.length) p.remove();
      } else {
        img.parentNode.insertBefore(fig, img);
        fig.appendChild(img);
      }
      if (caption) {
        const cap = document.createElement("figcaption");
        cap.textContent = caption;
        fig.appendChild(cap);
      }
    });
  }

  document.addEventListener("nav", build);
  build();
})();
`

export { FigureMarker }
