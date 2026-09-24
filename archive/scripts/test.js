const fs = require("fs")
const content = fs.readFileSync("src/components/SymptomAI.tsx", "utf8")
let idx = content.indexOf("return (")
let jsx = content.substring(idx)

// very naive stack for debugging
let stack = []
let lines = jsx.split("\n")
lines.forEach((line, i) => {
  let re = /<\/?([A-Za-z0-9_]+)[^>]*?\/?>/g
  let match
  while ((match = re.exec(line)) !== null) {
    let tagStr = match[0]
    let tag = match[1]
    if (
      tagStr.endsWith("/>") ||
      ["input", "path", "circle", "ellipse", "rect", "line", "svg"].includes(
        tag,
      )
    )
      continue

    if (tagStr.startsWith("</")) {
      if (stack.length === 0)
        console.log("Unmatched </" + tag + "> at line " + (i + 718))
      else if (stack[stack.length - 1].tag === tag) stack.pop()
      else
        console.log(
          "Mismatched </" +
            tag +
            "> at line " +
            (i + 718) +
            ", expected </" +
            stack[stack.length - 1].tag +
            "> from line " +
            stack[stack.length - 1].line,
        )
    } else {
      stack.push({ tag, line: i + 718 })
    }
  }
})
console.log("Unclosed tags:", stack)
