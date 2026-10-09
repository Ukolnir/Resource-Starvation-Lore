/* Ударения в названиях. В тексте ставим + перед ударной гласной:
     Лиор+ан, Нова Р+еста, аждах+а
   На странице ударение показывается только у ПЕРВОГО упоминания слова — дальше
   оно пишется обычным текстом, плюс просто убирается. Формы одного слова
   («Лиор+ан», «Лиор+ана») считаются одним словом: сравнивается начало слова
   до ударной гласной включительно.
   Плюс срабатывает, только если перед ним буква, а после — гласная, поэтому
   «+2 к атаке» и «2к6+3» не трогаются. Внутри кода и формул — тоже.
   Работает на этапе сборки, до оглавления и поискового индекса: туда слово
   попадает уже без плюса. Сам значок рисует CSS (.stress в custom.scss). */

const VOWELS = "аеёиоуыэюяАЕЁИОУЫЭЮЯaeiouyAEIOUY"
const MARK = new RegExp(`(?<=\\p{L})\\+([${VOWELS}])`, "gu")
const LETTER = /[\p{L}+]/u
const SKIP = new Set(["code", "inlineCode", "math", "inlineMath", "html", "yaml"])

function remarkStress() {
  return (tree) => {
    const seen = new Set()

    const wordStart = (s, i) => {
      while (i > 0 && LETTER.test(s[i - 1])) i--
      return i
    }

    const stressNode = (vowel) => ({
      type: "stress",
      data: {
        hName: "span",
        hProperties: { className: vowel === vowel.toLowerCase() ? ["stress"] : ["stress", "stress-cap"] },
      },
      children: [{ type: "text", value: vowel }],
    })

    const split = (node) => {
      const s = node.value
      const out = []
      let buf = ""
      let last = 0
      for (const m of s.matchAll(MARK)) {
        buf += s.slice(last, m.index)
        const vowel = m[1]
        const key = (s.slice(wordStart(s, m.index), m.index) + vowel).replace(/\+/g, "").toLowerCase()
        if (seen.has(key)) {
          buf += vowel
        } else {
          seen.add(key)
          if (buf) out.push({ type: "text", value: buf })
          buf = ""
          out.push(stressNode(vowel))
        }
        last = m.index + m[0].length
      }
      buf += s.slice(last)
      if (buf) out.push({ type: "text", value: buf })
      return out
    }

    const toHtml = (nodes) =>
      nodes
        .map((n) =>
          n.type === "text" ? n.value : `<span class="${n.data.hProperties.className.join(" ")}">${n.children[0].value}</span>`,
        )
        .join("")

    // заголовок выноски плагин obsidian-flavored-markdown уже превратил в
    // готовый HTML — обрабатываем текст между тегами, атрибуты не трогаем
    const splitCalloutTitle = (node) => {
      node.value = node.value.replace(/>([^<]*\+[^<]*)</g, (_, text) => `>${toHtml(split({ value: text }))}<`)
    }

    const walk = (node) => {
      if (!node.children) return
      const next = []
      for (const child of node.children) {
        if (child.type === "text" && child.value.includes("+")) {
          next.push(...split(child))
        } else if (child.type === "html" && child.value.includes("callout-title") && child.value.includes("+")) {
          splitCalloutTitle(child)
          next.push(child)
        } else {
          if (!SKIP.has(child.type)) walk(child)
          next.push(child)
        }
      }
      node.children = next
    }

    walk(tree)
  }
}

export default function Stress() {
  return {
    name: "Stress",
    markdownPlugins() {
      return [remarkStress]
    },
  }
}
