const fs = require("fs");
const path = require("path");

const target = path.join(
  process.cwd(),
  "node_modules",
  "@opennextjs",
  "aws",
  "dist",
  "adapters",
  "server-adapter.js"
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, "utf8");
const needle = /(^|\n)([ \t]*)process\.chdir\(__dirname\);/;
const replacement = [
  "$1$2try {",
  "$2  process.chdir(__dirname);",
  "$2}",
  "$2catch {",
  "$2  // Cloudflare Workers does not provide a writable cwd; skip this AWS-specific workaround.",
  "$2}"
].join("\n");

if (source.includes("Cloudflare Workers does not provide a writable cwd")) {
  process.exit(0);
}

if (!needle.test(source)) {
  throw new Error("Unable to patch OpenNext server adapter: expected process.chdir call not found.");
}

fs.writeFileSync(target, source.replace(needle, replacement));
console.log("Patched OpenNext server adapter for Cloudflare Workers.");
