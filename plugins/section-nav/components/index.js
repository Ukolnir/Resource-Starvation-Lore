import { h } from "preact"

/* Навигация «две зоны»:
   верх — папки 1-го уровня как кнопки-вкладки (закреплены), они переключают
   низ — папки 2-го уровня активного раздела. Глубже 2-го уровня игнорируем.
   Рендерится на сервере: каждая страница печёт свою навигацию по своему slug. */

// Желаемый порядок. Ключ — последний сегмент slug (строчными). Меньше — выше.
// Тот же смысл, что в explorer sortFn в quartz.config.yaml.
const ORDER = {
  "00_сеттинг": 1, "01_правила": 2,
  "основы": 1, "создание-персонажа": 2, "развитие": 3, "способности": 4,
  "черты": 5, "бой": 6, "особые-способности": 7, "импланты": 8, "снаряжение": 9,
  // 3-й уровень: характеристики
  "характеристики": 1, "отличия-от-d-and-d": 2,
  "сила": 3, "ловкость": 4, "телосложение": 5, "интеллект": 6,
  "мудрость": 7, "харизма": 8, "воля": 9,
  "спасброски": 10, "навыки": 11, "пассивные-параметры": 12,
  "владения": 13, "вдохновение": 14,
}
const classNames = (...c) => c.filter(Boolean).join(" ")

// "../.." до корня сайта из текущего slug (как в quartz page-title)
const pathToRoot = (slug) => {
  const r = (slug || "").split("/").filter((x) => x !== "").slice(0, -1).map(() => "..").join("/")
  return r.length ? r : "."
}

const SectionNav = ({ fileData, allFiles, displayClass }) => {
  const curSlug = fileData.slug || ""
  const cur = curSlug.split("/")
  const curL1 = cur[0]
  const curL2 = cur[1]
  const root = pathToRoot(curSlug)

  // индекс: slug -> title / файл, и множество «есть ли index у папки»
  const titleBySlug = new Map()
  const fileBySlug = new Map()
  const hasIndex = new Set() // folderSlug (без /index)
  for (const f of allFiles) {
    const slug = f.slug || ""
    // подпись в сайдбаре: поле `навигация:` (или `nav:`) перебивает заголовок
    titleBySlug.set(
      slug,
      f.frontmatter?.["навигация"] || f.frontmatter?.["nav"] || f.frontmatter?.title || slug.split("/").pop(),
    )
    fileBySlug.set(slug, f)
    if (slug.endsWith("/index")) hasIndex.add(slug.slice(0, -"/index".length))
  }
  const titleOf = (folderOrPageSlug) =>
    titleBySlug.get(folderOrPageSlug) ??
    titleBySlug.get(folderOrPageSlug + "/index") ??
    folderOrPageSlug.split("/").pop()

  // ПОРЯДОК СОРТИРОВКИ. Признак — поле `порядок:` (или `order:`) во фронтматтере
  // статьи/индекса папки. Меньше = выше. Если поля нет — берём карту ORDER, иначе
  // алфавит. Так порядок можно задавать прямо в статье, не трогая этот файл.
  const numOr = (v) => {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN
    return Number.isFinite(n) ? n : undefined
  }
  const fmOrder = (fullSlug) => {
    const f = fileBySlug.get(fullSlug) ?? fileBySlug.get(fullSlug + "/index")
    const fm = f?.frontmatter
    return fm ? numOr(fm["порядок"] ?? fm["order"]) : undefined
  }
  const rankOf = (fullSlug, seg) => fmOrder(fullSlug) ?? ORDER[seg] ?? 999
  const sortSegs = (segs, parent) =>
    segs.slice().sort((a, b) => {
      const fa = parent ? `${parent}/${a}` : a
      const fb = parent ? `${parent}/${b}` : b
      return (
        rankOf(fa, a) - rankOf(fb, b) ||
        String(titleOf(fa)).localeCompare(String(titleOf(fb)), "ru", { numeric: true })
      )
    })

  // ссылка на раздел/статью с учётом относительного пути (работает и на поддомене/подпути)
  const hrefFor = (slug) => `${root}/${slug}${hasIndex.has(slug) ? "/" : ""}`

  // скрытые страницы (unlisted: глоссарий, микро-страницы терминов) — мимо навигации
  const isHidden = (f) => f.unlisted === true || f.frontmatter?.unlisted === true

  // L1 (разделы-вкладки) и L2→L3 (дерево активного раздела)
  const l1set = new Set()
  const l2map = new Map() // l2seg -> Set(l3seg)  (пустой набор = L2 без вложенности)
  for (const f of allFiles) {
    if (isHidden(f)) continue
    const segs = (f.slug || "").split("/")
    const s0 = segs[0]
    if (!s0 || s0 === "tags" || s0 === "index") continue
    if (segs.length < 2) continue // страница в корне — не раздел
    l1set.add(s0)
    if (s0 !== curL1) continue // дерево строим только для активного раздела
    const s1 = segs[1]
    if (!s1 || s1 === "index") continue
    if (!l2map.has(s1)) l2map.set(s1, new Set())
    const s2 = segs[2] // 3-й уровень
    if (s2 && s2 !== "index") l2map.get(s1).add(s2)
  }
  const l1s = sortSegs([...l1set], "")

  const tabs = l1s.map((l1) =>
    h(
      "a",
      { class: classNames("section-tab", l1 === curL1 && "active"), href: hrefFor(l1) },
      String(titleOf(l1)).toUpperCase(),
    ),
  )

  let sub = null
  if (curL1 && l2map.size) {
    const l2s = sortSegs([...l2map.keys()], curL1)
    sub = h(
      "nav",
      { class: "section-subnav" },
      l2s.map((l2) => {
        const slug = `${curL1}/${l2}`
        const children = sortSegs([...l2map.get(l2)], slug)
        const hasKids = children.length > 0
        const isFolder = hasKids || hasIndex.has(slug)
        const openNow = l2 === curL2 && hasKids // активная ветка раскрыта на старте

        // ссылка-лейбл (уводит в раздел) + кнопка-шеврон справа (раскрывает L3)
        const row = h(
          "div",
          { class: "subnav-row" },
          h(
            "a",
            { class: classNames("subnav-item", l2 === curL2 && "active", isFolder && "is-folder"), href: hrefFor(slug) },
            titleOf(slug),
          ),
          hasKids
            ? h("button", { class: "chev-btn", type: "button", "aria-label": "Развернуть" }, h("span", { class: "chev" }))
            : null,
        )

        const kidsWrap = hasKids
          ? h(
              "div",
              { class: "subnav-children" },
              children.map((l3) =>
                h(
                  "a",
                  { class: classNames("subnav-child", cur[2] === l3 && "active"), href: hrefFor(`${slug}/${l3}`) },
                  titleOf(`${slug}/${l3}`),
                ),
              ),
            )
          : null

        return h("div", { class: classNames("subnav-group", openNow && "open"), "data-slug": slug }, row, kidsWrap)
      }),
    )
  }

  return h(
    "div",
    { class: classNames(displayClass, "section-nav") },
    h("nav", { class: "section-tabs" }, tabs),
    sub,
  )
}

SectionNav.displayName = "SectionNav"
SectionNav.css = `
.section-nav {
  font-family: var(--rs-uiFont);
  /* занять остаток высоты сайдбара: вкладки сверху, подменю со своим скроллом */
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.section-tabs {
  flex: 0 0 auto; /* закреплены сверху, не скроллятся */
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-bottom: 0.6rem;
  margin-bottom: 0.7rem;
  border-bottom: 1px solid var(--rs-border-strong);
}
.section-tab {
  display: block;
  padding: 0.5rem 0.7rem;
  border-left: 3px solid var(--rs-border-strong);
  background: var(--rs-bg-code);
  color: var(--rs-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.12s, background-color 0.12s, color 0.12s;
}
.section-tab:hover {
  border-left-color: var(--rs-accent);
  background: var(--rs-accent-soft);
  color: var(--rs-text-bright);
}
.section-tab.active {
  border-left-color: var(--rs-accent);
  background: var(--rs-accent-active);
  color: var(--rs-accent);
}

.section-subnav {
  flex: 1 1 auto; /* занимает остаток высоты и скроллится сам */
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  scrollbar-width: thin;
  scrollbar-color: var(--rs-border-strong) transparent;
}
.section-subnav::-webkit-scrollbar { width: 6px; }
.section-subnav::-webkit-scrollbar-thumb {
  background: var(--rs-border-strong);
  border-radius: 3px;
}
.section-subnav .subnav-item {
  display: block;
  padding: 0.34rem 0.6rem;
  border-left: 2px solid transparent;
  border-radius: 0 4px 4px 0;
  color: var(--darkgray);
  font-size: 0.85rem;
  text-decoration: none;
  transition: border-color 0.12s, background-color 0.12s, color 0.12s;
}
.section-subnav .subnav-item:hover {
  background: var(--rs-accent-soft);
  color: var(--rs-text-bright);
}
.section-subnav .subnav-item.active {
  background: var(--rs-accent-active);
  border-left-color: var(--rs-accent);
  color: var(--rs-accent);
}

/* ряд L2: слот-шеврон + ссылка-лейбл */
.subnav-row {
  display: flex;
  align-items: stretch;
}
.subnav-row .subnav-item {
  flex: 1;
  min-width: 0;
}

/* кнопка-шеврон справа разворачивает L3 на месте, не уходя со страницы */
.chev-btn {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  padding: 0 0.55rem 0 0.3rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--rs-text-faint);
}
.chev-btn:hover {
  color: var(--rs-accent);
}
.chev-btn .chev::before {
  content: "\\203A"; /* › */
  display: inline-block;
  width: 0.7em;
  font-size: 1.3rem;
  line-height: 1;
  text-align: center;
  transition: transform 0.12s;
}
.subnav-group.open > .subnav-row .chev-btn .chev::before {
  transform: rotate(90deg);
}

/* 3-й уровень: скрыт, пока папка не раскрыта */
.subnav-children {
  display: none;
  margin: 0.45rem 0 0.55rem 1.1rem;
  padding-top: 0.1rem;
  border-left: 1px solid var(--rs-border-strong);
}
.subnav-group.open > .subnav-children {
  display: block;
}
.subnav-children .subnav-child {
  display: block;
  padding: 0.28rem 0.55rem;
  border-left: 2px solid transparent;
  border-radius: 0 4px 4px 0;
  color: var(--darkgray);
  font-size: 0.82rem;
  text-decoration: none;
  transition: border-color 0.12s, background-color 0.12s, color 0.12s;
}
.subnav-children .subnav-child:hover {
  background: var(--rs-accent-soft);
  color: var(--rs-text-bright);
}
.subnav-children .subnav-child.active {
  background: var(--rs-accent-active);
  border-left-color: var(--rs-accent);
  color: var(--rs-accent);
}
`

// Клик по шеврону разворачивает/сворачивает L3 на месте. Делегирование на
// document переживает SPA-переходы Quartz; флаг не даёт навесить дважды.
SectionNav.afterDOMLoaded = `
(() => {
  const KEY = "sectionNavOpen";
  const read = () => { try { return new Set(JSON.parse(sessionStorage.getItem(KEY) || "[]")); } catch (e) { return new Set(); } };
  const groups = () => [...document.querySelectorAll(".section-nav .subnav-group[data-slug]")];

  const save = () => {
    const stored = read();
    const gs = groups();
    // разделы, показанные сейчас (по префиксу slug) — их состояние перезаписываем,
    // остальные секции в памяти сохраняем как были
    const shown = new Set(gs.map((g) => g.dataset.slug.split("/")[0]));
    const kept = [...stored].filter((s) => !shown.has(s.split("/")[0]));
    const openNow = gs.filter((g) => g.classList.contains("open")).map((g) => g.dataset.slug);
    try { sessionStorage.setItem(KEY, JSON.stringify([...kept, ...openNow])); } catch (e) {}
  };

  const restore = () => {
    const set = read();
    groups().forEach((g) => { if (set.has(g.dataset.slug)) g.classList.add("open"); });
  };

  if (!window.__sectionNavBound) {
    window.__sectionNavBound = true;
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".section-nav .chev-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const grp = btn.closest(".subnav-group");
      if (grp) { grp.classList.toggle("open"); save(); }
    });
    document.addEventListener("nav", restore);
  }
  restore();
})();
`

export { SectionNav }
