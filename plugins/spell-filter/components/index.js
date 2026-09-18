import { h } from "preact"

/* Фильтруемый список-аккордеон. Универсальный движок для разных списков.
   Включается флагом во фронтматтере страницы, флаг задаёт РЕЖИМ:
     фильтр-заклинаний: true   → режим "spells"   (Тип + Время каста)
     фильтр-способности: true  → режим "abilities" (Ранг)

   Общее для всех режимов:
   - сверху панель: строка поиска (по названию) + кнопки-фильтры;
   - каждый элемент (заголовок + его блок) сворачивается в карточку-аккордеон;
     в свёрнутом виде видно название и чипы, тело раскрывается по клику;
   - счётчик «Показано: N из M»;
   - заголовок, который не распознан как карточка (нет мета-строки режима),
     прячется как разделитель.

   Как добавить новый список: заведи новый флаг+режим здесь (кнопки фильтров) и
   парсер этого режима в afterDOMLoaded (parsers). Фильтрация — generic: apply()
   сверяет каждую группу `data-filter` панели с одноимённым data-атрибутом карточки,
   так что новый фильтр «просто работает», если парсер проставил карточке
   соответствующий data-атрибут. */

const classNames = (...c) => c.filter(Boolean).join(" ")

const btn = (value, label, active) =>
  h("button", { type: "button", "data-value": value, class: active ? "is-active" : null }, label)

// группа фильтров: name соответствует data-атрибуту карточки; первый пункт — «Все».
// match "multi" → карточка хранит НЕСКОЛЬКО значений через пробел (совпадение по
// вхождению, а не по равенству) — например «характеристика» черты.
const group = (name, label, items, match, control) => {
  const attrs = { class: "spell-filter__group", "data-filter": name, ...(match ? { "data-match": match } : {}) }
  if (control === "select") {
    return h(
      "div",
      attrs,
      h("span", { class: "spell-filter__label" }, label),
      h("select", { class: "spell-select" }, ...items.map(([v, l]) => h("option", { value: v }, l))),
    )
  }
  return h(
    "div",
    attrs,
    h("span", { class: "spell-filter__label" }, label),
    ...items.map(([v, l]) => btn(v, l, v === "all")),
  )
}

const STATS = [
  ["all", "Все"], ["сила", "Сила"], ["ловкость", "Ловкость"], ["телосложение", "Телосложение"],
  ["интеллект", "Интеллект"], ["мудрость", "Мудрость"], ["харизма", "Харизма"], ["воля", "Воля"],
]

const MODES = {
  spells: [
    ["type", "Тип", [["all", "Все"], ["cantrip", "Заговор"], ["spell", "Заклинание"]]],
    ["time", "Каст", [["all", "Все"], ["action", "Действие"], ["bonus", "Бонусное"], ["reaction", "Реакция"]]],
  ],
  abilities: [
    ["rank", "Ранг", [["all", "Все"], ["1", "1"], ["2", "2"], ["3", "3"]]],
  ],
  feats: [
    ["type", "Тип", [
      ["all", "Все"], ["боевая", "Боевая"], ["магия", "Магия"], ["пси/нейро", "Пси/нейро"],
      ["защита разума", "Защита разума"], ["броня", "Броня"], ["имплант", "Имплант"],
      ["выживание", "Выживание"], ["социальная", "Социальная"], ["прочее", "Прочее"], ["дар", "Дар"],
    ]],
    ["req", "Требования", [["all", "Все"], ["yes", "Есть"], ["no", "Нет"]]],
    ["char", "Увеличивает", STATS, "multi"],
  ],
  implants: [
    ["slot", "Слот", [
      ["all", "Все слоты"], ["операционная система", "Операционная система"], ["голова", "Голова"],
      ["кровеносная система", "Кровеносная система"], ["иммунная система", "Иммунная система"], ["кожа", "Кожа"],
      ["скелет", "Скелет"], ["нервная система", "Нервная система"], ["руки", "Руки"], ["ноги", "Ноги"],
      ["нет", "Без слота"],
    ], null, "select"],
    ["quality", "Качество", [
      ["all", "Все"], ["базовое", "Базовое"], ["обычное", "Обычное"], ["продвинутое", "Продвинутое"], ["про", "Про"], ["именное", "Именное"],
    ]],
    ["req", "Нужен имплант", [
      ["all", "Все"], ["нет", "Нет"], ["нейроинтерфейс", "Нейроинтерфейс"], ["драйвер", "Драйвер"],
    ]],
    ["net", "Нетраннерство", [["all", "Все"], ["yes", "Нужно"], ["no", "Не нужно"]]],
    ["porog", "Порог ≤", [
      ["all", "Все"], ["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"],
      ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"],
    ], "lte"],
  ],
}

const SpellFilter = ({ fileData, displayClass }) => {
  const fm = fileData.frontmatter || {}
  let mode = null
  if (fm["фильтр-заклинаний"] || fm["spell-filter"]) mode = "spells"
  else if (fm["фильтр-способности"] || fm["ability-filter"]) mode = "abilities"
  else if (fm["фильтр-черт"] || fm["feat-filter"]) mode = "feats"
  else if (fm["фильтр-имплантов"] || fm["implant-filter"]) mode = "implants"
  if (!mode) return null

  const groups = (MODES[mode] || []).map(([name, label, items, match, control]) => group(name, label, items, match, control))

  return h(
    "div",
    { class: classNames(displayClass, "spell-filter"), "data-spell-filter": "", "data-mode": mode },
    h(
      "div",
      { class: "spell-filter__search" },
      h("input", {
        type: "search",
        class: "spell-search",
        placeholder: "Поиск по списку…",
        "aria-label": "Поиск по списку",
        autocomplete: "off",
        spellcheck: "false",
      }),
    ),
    ...groups,
    h(
      "div",
      { class: "spell-filter__foot" },
      h("p", { class: "spell-filter__count", "data-spell-count": "" }, ""),
      h("button", { type: "button", class: "spell-expand-all", "data-spell-expand": "" }, "Развернуть всё"),
    ),
  )
}

SpellFilter.displayName = "SpellFilter"

SpellFilter.css = `
.spell-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.4rem;
  align-items: center;
  margin: 0 0 1.2rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--rs-border-strong);
  background: var(--rs-bg-code);
}
.spell-filter__group { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; }
.spell-filter__label {
  font-family: var(--rs-uiFont);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--rs-text-faint);
  margin-right: 0.2rem;
}
.spell-filter button {
  font-family: var(--rs-uiFont);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem 0.7rem;
  border: 1px solid var(--rs-border-strong);
  background: transparent;
  color: var(--rs-text-dim);
  transition: background-color 0.12s, color 0.12s, border-color 0.12s;
}
.spell-filter button:hover { background: var(--rs-accent-soft); color: var(--rs-text-bright); }
.spell-filter button.is-active {
  background: var(--rs-accent-active);
  border-color: var(--rs-accent);
  color: var(--rs-accent);
}
.spell-filter__foot {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.1rem;
}
.spell-filter__count {
  margin: 0;
  font-family: var(--rs-uiFont);
  font-size: 0.72rem;
  color: var(--rs-text-faint);
}
.spell-expand-all {
  font-family: var(--rs-uiFont);
  font-size: 0.72rem;
  cursor: pointer;
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--rs-border-strong);
  background: transparent;
  color: var(--rs-text-dim);
  white-space: nowrap;
  transition: background-color 0.12s, color 0.12s, border-color 0.12s;
}
.spell-expand-all:hover { background: var(--rs-accent-soft); color: var(--rs-text-bright); border-color: var(--rs-accent); }
.spell-select {
  font-family: var(--rs-uiFont);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--rs-border-strong);
  background: var(--rs-bg-panel);
  color: var(--rs-text-dim);
  max-width: 100%;
}
.spell-select:focus { outline: none; border-color: var(--rs-accent); color: var(--rs-text-bright); }
.spell-select option { background: var(--rs-bg-panel); color: var(--rs-text-bright); }
.spell-filter__search { width: 100%; }
.spell-search {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--rs-uiFont);
  font-size: 0.85rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--rs-border-strong);
  background: var(--rs-bg-panel);
  color: var(--rs-text-bright);
}
.spell-search::placeholder { color: var(--rs-text-faint); }
.spell-search:focus { outline: none; border-color: var(--rs-accent); }

/* карточки */
.spell-card { border-left: 2px solid var(--rs-border-strong); margin: 0.5rem 0; }
.spell-card--hidden { display: none; }
.spell-card > .spell-card__head {
  cursor: pointer;
  position: relative;
  margin: 0;
  padding: 0.4rem 2rem 0.4rem 0.7rem;
  background: var(--rs-bg-code);
  transition: background-color 0.12s, color 0.12s;
  user-select: none;
}
.spell-card > .spell-card__head:hover { background: var(--rs-accent-soft); color: var(--rs-text-bright); }
.spell-card.open > .spell-card__head { color: var(--rs-accent); }
.spell-card > .spell-card__head::after {
  content: "\\203A";
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.3rem;
  line-height: 1;
  color: var(--rs-text-faint);
  transition: transform 0.12s;
}
.spell-card.open > .spell-card__head::after { transform: translateY(-50%) rotate(90deg); }
.spell-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.35rem 0.7rem 0;
}
.spell-card__chip {
  font-family: var(--rs-uiFont);
  font-size: 0.7rem;
  padding: 0.05rem 0.5rem;
  border: 1px solid var(--rs-border-strong);
  color: var(--rs-text-dim);
}
.spell-card__chip--type { color: var(--rs-accent); border-color: var(--rs-accent); }
.spell-card__chip--char { color: var(--rs-text-em); }
.spell-card__chip--req { color: var(--tertiary); border-color: var(--tertiary); }
.spell-card__body { display: none; padding: 0.3rem 0.7rem 0.4rem; }
.spell-card.open > .spell-card__body { display: block; }
.spell-divider { display: none; }
`

SpellFilter.afterDOMLoaded = `
(() => {
  const isHead = (n) => /^H[1-6]$/.test(n.tagName);
  const norm = (t) => (t || "").toLowerCase().replace(/ё/g, "е").replace(/\\s+/g, " ").trim();
  const afterColon = (t) => { const i = t.indexOf(":"); return (i < 0 ? t : t.slice(i + 1)).trim().replace(/\\.$/, ""); };

  // Парсер режима получает (head, blocks) и возвращает
  //   { data:{...}, chips:[[css,текст],...], remove:[узлы, которые убрать из тела] }
  // либо null, если это не карточка (тогда заголовок прячется как разделитель).
  const parsers = {
    spells(head, blocks) {
      const typeP = blocks.find((b) => /^\\s*Тип\\s*:/.test(b.textContent));
      if (!typeP) return null;
      const timeP = blocks.find((b) => /^\\s*Время\\s+накладыв/i.test(b.textContent));
      const typeTxt = afterColon(typeP.textContent);
      const timeTxt = timeP ? afterColon(timeP.textContent) : "";
      const s = timeTxt.toLowerCase();
      return {
        data: {
          type: /заговор/i.test(typeTxt) ? "cantrip" : /заклинан/i.test(typeTxt) ? "spell" : "other",
          time: s.includes("бонус") ? "bonus" : s.includes("реакц") ? "reaction" : s.includes("действие") ? "action" : "other",
        },
        chips: [["spell-card__chip--type", typeTxt], ["spell-card__chip--time", timeTxt]].filter((c) => c[1]),
        remove: [typeP, timeP].filter(Boolean),
      };
    },
    abilities(head, blocks) {
      // мета-строка вида «Ранг 1 · 1 очко развития»
      const metaP = blocks.find((b) => /^\\s*ранг\\s*\\d/i.test(b.textContent));
      if (!metaP) return null;
      const m = metaP.textContent.match(/ранг\\s*(\\d)/i);
      if (!m) return null;
      const rank = m[1];
      const parts = metaP.textContent.split(/·|\\|/);
      const chips = [["spell-card__chip--type", "Ранг " + rank]];
      if (parts[1] && parts[1].trim()) chips.push(["spell-card__chip--time", parts[1].trim()]);
      return { data: { rank }, chips, remove: [metaP] };
    },
    feats(head, blocks) {
      // мета-строка вида «Тип: боевая · Увеличивает: Ловкость, Сила · Требование: нет»
      const metaP = blocks.find((b) => /требование\\s*:/i.test(b.textContent));
      if (!metaP) return null;
      const map = {};
      metaP.textContent.split("·").forEach((p) => {
        const i = p.indexOf(":");
        if (i > 0) map[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim().replace(/\\.$/, "");
      });
      const tip = map["тип"] || "";
      const req = map["требование"] || "";
      const chars = map["увеличивает"] || "";
      const hasReq = req && !/^нет$/i.test(req);
      const charList = chars && chars !== "—" ? chars.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const chips = [];
      if (tip) chips.push(["spell-card__chip--type", tip]);
      charList.forEach((c) => chips.push(["spell-card__chip--char", c]));
      if (hasReq) chips.push(["spell-card__chip--req", "Требование"]);
      return {
        data: {
          type: tip.toLowerCase().replace(/ё/g, "е"),
          req: hasReq ? "yes" : "no",
          char: charList.map((c) => c.toLowerCase().replace(/ё/g, "е")).join(" "),
        },
        chips,
        remove: [metaP],
      };
    },
    implants(head, blocks) {
      // поля-абзацы: **Слот.** X · **Порог.** N · **Требование.** … (опц.)
      const val = (re) => {
        const p = blocks.find((b) => re.test(b.textContent));
        if (!p) return { p: null, v: "" };
        return { p, v: p.textContent.replace(/^\\s*[^.:]*[.:]\\s*/, "").trim().replace(/\\.$/, "") };
      };
      const slot = val(/^\\s*Слот\\s*[.:]/i);
      if (!slot.p) return null;
      const porog = val(/^\\s*Порог\\s*[.:]/i);
      const reqF = val(/^\\s*Требование\\s*[.:]/i);

      const slotNo = /^нет/i.test(slot.v);
      const slotCat = slotNo ? "нет" : slot.v.toLowerCase().replace(/ё/g, "е");
      const slotLabel = slotNo ? "Без слота" : slot.v;
      const porogNum = (porog.v.match(/\\d+/) || [""])[0];

      const rl = reqF.v.toLowerCase();
      const hasNeuro = /нейроинтерфейс/.test(rl);
      const hasDriver = /драйвер/.test(rl);
      const reqCat = !reqF.p ? "нет"
        : hasNeuro && hasDriver ? "оба"
        : hasNeuro ? "нейроинтерфейс"
        : hasDriver ? "драйвер"
        : "другое";
      const net = reqF.p && /нетраннерств/i.test(rl) ? "yes" : "no";

      // качество — из названия импланта. Именные (в кавычках) — отдельная категория,
      // проверяем первой: у них нет маркеров базов/продвинут.
      const nm = head.textContent.toLowerCase();
      const quality = /["«»“”„]/.test(nm) ? "именное"
        : /продвинут/.test(nm) ? "продвинутое"
        : /базов/.test(nm) ? "базовое"
        : / про$/.test(nm) ? "про"
        : "обычное";
      const qLabel = { "базовое": "Базовое", "продвинутое": "Продвинутое", "про": "Про", "именное": "Именное" };

      const chips = [["spell-card__chip--type", slotLabel]];
      if (qLabel[quality]) chips.push(["spell-card__chip--char", qLabel[quality]]);
      if (porogNum !== "") chips.push(["", "Порог " + porogNum]);
      const reqLabel = { "нейроинтерфейс": "Нейроинтерфейс", "драйвер": "Драйвер", "оба": "Нейро+драйвер", "другое": "Требование" };
      if (reqCat !== "нет") chips.push(["spell-card__chip--req", reqLabel[reqCat]]);
      if (net === "yes") chips.push(["spell-card__chip--req", "Нетраннерство"]);

      return {
        data: { slot: slotCat, quality, porog: porogNum, req: reqCat, net },
        chips,
        remove: [slot.p, porog.p].filter(Boolean), // требование оставляем в теле (там точный текст)
      };
    },
  };

  function build() {
    const toolbar = document.querySelector("[data-spell-filter]");
    const container = document.querySelector("article .markdown-preview-view") || document.querySelector("article");
    if (!toolbar || !container) return;
    const parse = parsers[toolbar.dataset.mode] || parsers.spells;

    if (!container.dataset.spellFiltered) {
      const heads = [...container.querySelectorAll("h1,h2,h3,h4,h5,h6")];
      heads.forEach((head) => {
        const blocks = [];
        let n = head.nextElementSibling;
        while (n && !isHead(n)) { blocks.push(n); n = n.nextElementSibling; }

        const parsed = parse(head, blocks);
        if (!parsed) { head.classList.add("spell-divider"); return; }

        const sec = document.createElement("section");
        sec.className = "spell-card";
        Object.entries(parsed.data).forEach(([k, v]) => { sec.dataset[k] = v; });
        head.parentNode.insertBefore(sec, head);

        head.classList.add("spell-card__head");
        head.setAttribute("role", "button");
        head.setAttribute("tabindex", "0");

        const meta = document.createElement("div");
        meta.className = "spell-card__meta";
        parsed.chips.forEach(([cls, txt]) => {
          const s = document.createElement("span");
          s.className = "spell-card__chip " + cls;
          s.textContent = txt;
          meta.appendChild(s);
        });

        const body = document.createElement("div");
        body.className = "spell-card__body";
        const removeSet = new Set(parsed.remove);
        blocks.forEach((b) => { if (removeSet.has(b)) b.remove(); else body.appendChild(b); });

        sec.appendChild(head);
        sec.appendChild(meta);
        sec.appendChild(body);
        sec.dataset.search = norm(head.textContent); // поиск только по названию
      });
      container.dataset.spellFiltered = "1";
    }

    // generic-фильтрация: по каждой группе панели + строке поиска.
    // multi-группа сверяется по вхождению значения в список (через пробел).
    const groups = [...toolbar.querySelectorAll("[data-filter]")].map((g) => ({
      name: g.dataset.filter,
      match: g.dataset.match || "eq",
    }));
    const state = { q: "" };
    groups.forEach((g) => { state[g.name] = "all"; });
    const countEl = toolbar.querySelector("[data-spell-count]");
    const expandBtn = toolbar.querySelector("[data-spell-expand]");
    const visibleCards = () => [...container.querySelectorAll(".spell-card")].filter((c) => !c.classList.contains("spell-card--hidden"));
    const setExpanded = (open) => {
      visibleCards().forEach((c) => c.classList.toggle("open", open));
      if (expandBtn) expandBtn.textContent = open ? "Свернуть всё" : "Развернуть всё";
    };
    const apply = () => {
      let shown = 0;
      const cards = container.querySelectorAll(".spell-card");
      cards.forEach((card) => {
        const ok = groups.every(({ name, match }) => {
          if (state[name] === "all") return true;
          const v = card.dataset[name] || "";
          if (match === "multi") return v.split(" ").includes(state[name]);
          if (match === "lte") return v !== "" && Number(v) <= Number(state[name]);
          return v === state[name];
        }) && (state.q === "" || (card.dataset.search || "").includes(state.q));
        card.classList.toggle("spell-card--hidden", !ok);
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = "Показано: " + shown + " из " + cards.length;
    };

    if (!toolbar.dataset.bound) {
      toolbar.dataset.bound = "1";
      // кнопки-фильтры: НЕ трогают раскрытие (просмотр по категориям — свёрнуто)
      toolbar.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-value]");
        if (!b) return;
        const grp = b.closest("[data-filter]");
        const g = grp.dataset.filter;
        const val = b.dataset.value;
        state[g] = state[g] === val ? "all" : val;
        grp.querySelectorAll("button").forEach((x) => x.classList.toggle("is-active", x.dataset.value === state[g]));
        apply();
      });
      // селекторы (например слот)
      toolbar.addEventListener("change", (e) => {
        const sel = e.target.closest("select.spell-select");
        if (!sel) return;
        const g = sel.closest("[data-filter]").dataset.filter;
        state[g] = sel.value;
        apply();
      });
      // поиск: раскрываем совпавшие карточки (пусто → сворачиваем)
      const input = toolbar.querySelector(".spell-search");
      if (input) input.addEventListener("input", (e) => { state.q = norm(e.target.value); apply(); setExpanded(state.q !== ""); });
      // ручная кнопка «Развернуть/Свернуть всё»
      if (expandBtn) expandBtn.addEventListener("click", () => {
        const anyClosed = visibleCards().some((c) => !c.classList.contains("open"));
        setExpanded(anyClosed);
      });
    }
    apply();
  }

  if (!window.__spellFilterToggle) {
    window.__spellFilterToggle = true;
    document.addEventListener("click", (e) => {
      const head = e.target.closest(".spell-card__head");
      if (head && !e.target.closest("a")) { e.preventDefault(); head.closest(".spell-card").classList.toggle("open"); }
    });
    document.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("spell-card__head")) {
        e.preventDefault();
        e.target.closest(".spell-card").classList.toggle("open");
      }
    });
  }

  document.addEventListener("nav", build);
  build();
})();
`

export { SpellFilter }
