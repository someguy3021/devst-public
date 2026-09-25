#!/usr/bin/env node
// devst-public hygiene check — zero runtime dependencies (Node stdlib only).
//
// Two gates, per ADR-023 ("curated porting + stop-patterns"):
//   1. Leak gate    — no private markers anywhere in the published texts.
//   2. Link gate    — every relative link/image in a Markdown file resolves
//                     to a file in this repository.
//
// Exit code 1 on any finding; designed to run in CI on every push.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Private markers that must never appear in the public repository.
// The genre word "TTRPG" is allowed in the sanctioned neutral phrase
// "a TTRPG side project" (ADR-023) — the *name* of the private project is not.
const FORBIDDEN = [
  { re: /AI_Cwork/i, why: "local machine path" },
  { re: /C:\\+Users/i, why: "local user path" },
  { re: /\bttrpg-app-q\b/i, why: "private project name" },
  { re: /\bdev-flow-want-this\b/i, why: "private repository name" },
  { re: /github\.com\/someguy3021\/devst(?!-public)/i, why: "link to the private repository" },
];

function listMarkdownFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) listMarkdownFiles(full, out);
    else if (name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

// [text](target) and ![alt](target); skips code fences so inline examples
// of Markdown syntax do not produce false positives.
function extractLinks(md) {
  const links = [];
  const withoutFences = md.replace(/```[\s\S]*?```/g, (fence) => fence.replace(/[^\n]/g, " "));
  const re = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(withoutFences)) !== null) links.push(m[1]);
  return links;
}

const problems = [];
const mdFiles = listMarkdownFiles(ROOT);

for (const file of mdFiles) {
  const rel = file.slice(ROOT.length + 1);
  const md = readFileSync(file, "utf8");
  const lines = md.split("\n");

  // 1. Leak gate
  lines.forEach((line, i) => {
    for (const { re, why } of FORBIDDEN) {
      if (re.test(line)) {
        problems.push(`${rel}:${i + 1}  leaked marker (${why}): ${line.trim().slice(0, 80)}`);
      }
    }
  });

  // 2. Link gate
  for (const target of extractLinks(md)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const pathPart = target.split("#")[0];
    if (!pathPart) continue;
    const resolved = resolve(dirname(file), decodeURIComponent(pathPart));
    if (!resolved.startsWith(ROOT + sep)) {
      problems.push(`${rel}  link escapes the repository: ${target}`);
    } else if (!existsSync(resolved)) {
      problems.push(`${rel}  broken relative link: ${target}`);
    }
  }
}

console.log(`devst-public hygiene: ${mdFiles.length} markdown file(s) scanned`);
if (problems.length > 0) {
  console.error(`\nFAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log("all clear: no leaked markers, all relative links resolve");
