import { h } from "preact"

/* Хлебная крошка, понимающая поле `навигация:` (как section-nav).
   Подпись каждого сегмента = навигация ?? nav ?? title — то есть одно поле
   рулит и сайдбаром, и крошкой. Рендерится на сервере. Корневой сегмент —
   ROOT_NAME. На index-страницах не показывается (условие в layout конфига). */

const ROOT_NAME = "Магнатрон"
const SPACER = "❯" // ❯

const classNames = (...c) => c.filter(Boolean).join(" ")

const pathToRoot = (slug) => {
  const r = (slug || "").split("/").filter((x) => x !== "").slice(0, -1).map(() => "..").join("/")
  return r.length ? r : "."
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

const Breadcrumbs = ({ fileData, allFiles, displayClass }) => {
  const curSlug = fileData.slug || ""
  const root = pathToRoot(curSlug)

  // подпись по slug: навигация ?? nav ?? title
  const labelBySlug = new Map()
  const hasIndex = new Set()
  for (const f of allFiles) {
    const s = f.slug || ""
    const fm = f.frontmatter || {}
    const lbl = fm["навигация"] || fm["nav"] || fm.title
    if (lbl) labelBySlug.set(s, lbl)
    if (s.endsWith("/index")) hasIndex.add(s.slice(0, -"/index".length))
  }
  const landing = (p) => (labelBySlug.has(p) ? p : labelBySlug.has(p + "/index") ? p + "/index" : null)
  const labelOf = (p) => {
    const l = landing(p)
    return l ? labelBySlug.get(l) : cap((p.split("/").pop() || "").replace(/-/g, " "))
  }
  const hrefFor = (p) => `${root}/${p}${hasIndex.has(p) ? "/" : ""}`

  const segs = curSlug.split("/")
  const crumbs = []
  crumbs.push({ label: ROOT_NAME, href: `${root}/` }) // корень

  let acc = ""
  for (let i = 0; i < segs.length - 1; i++) {
    acc = acc ? `${acc}/${segs[i]}` : segs[i]
    const hasLanding = landing(acc) !== null
    crumbs.push({ label: labelOf(acc), href: hasLanding ? hrefFor(acc) : "" })
  }
  // текущая страница — без ссылки
  crumbs.push({ label: labelOf(curSlug), href: "" })

  return h(
    "nav",
    { class: classNames(displayClass, "breadcrumb-container"), "aria-label": "breadcrumbs" },
    crumbs.map((c, i) =>
      h(
        "div",
        { class: "breadcrumb-element" },
        c.href ? h("a", { href: c.href }, c.label) : h("span", null, c.label),
        i !== crumbs.length - 1 ? h("p", null, ` ${SPACER} `) : null,
      ),
    ),
  )
}

Breadcrumbs.displayName = "Breadcrumbs"
Breadcrumbs.css = `
.breadcrumb-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 0;
  padding: 0;
}
.breadcrumb-element {
  display: inline-flex;
  align-items: center;
}
.breadcrumb-element p {
  margin: 0 0.5em;
  opacity: 0.7;
}
.breadcrumb-element a { text-decoration: none; }
.breadcrumb-element a:hover { text-decoration: underline; }
`

export { Breadcrumbs }
