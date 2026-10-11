// Builds the deployable site into ./dist. No dependencies.
// Runs automatically inside GitHub Actions; nobody needs to run it by hand.
//
//  - copies only the files the live site needs (no docs, scripts or git data)
//  - points canonical links, sitemap, robots.txt and social tags at the real site address
//  - stamps the offline cache with the commit id so every deploy refreshes it
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DEFAULT_SITE = "https://rccgkd.github.io/bible-family-feud"; // address written in the source files
const repo = process.env.GITHUB_REPOSITORY || "rccgkd/bible-family-feud";
const [owner, name] = repo.split("/");

// A CNAME file (custom domain) wins; otherwise use the standard GitHub Pages address.
let site = `https://${owner.toLowerCase()}.github.io/${name}`;
if (existsSync("CNAME")) {
  const domain = readFileSync("CNAME", "utf8").trim().split(/\s+/)[0];
  if (domain) site = `https://${domain}`;
}
const basePath = new URL(site).pathname.replace(/\/?$/, "/");
const build = (process.env.GITHUB_SHA || "dev").slice(0, 8);

const KEEP = ["index.html", "host.html", "404.html", "sw.js", "manifest.webmanifest", "robots.txt", "sitemap.xml", "CNAME", "css", "js", "assets"];
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
for (const item of KEEP) if (existsSync(item)) cpSync(item, join("dist", item), { recursive: true });

const TEXT = new Set([".html", ".xml", ".txt", ".js", ".webmanifest", ".css"]);
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) { walk(path); continue; }
    if (!TEXT.has(extname(path))) continue;
    let text = readFileSync(path, "utf8");
    text = text.split(DEFAULT_SITE).join(site).replaceAll("__BUILD__", build);
    text = text.replace('<base href="/bible-family-feud/" />', `<base href="${basePath}" />`);
    writeFileSync(path, text);
  }
})("dist");

console.log(`Built dist/ for ${site} (build ${build})`);
