/**
 * build.js — Generiert posts-index.json aus allen Markdown-Dateien in /posts/
 * Wird automatisch von Cloudflare Pages beim Deploy ausgeführt.
 *
 * Cloudflare Pages Build-Einstellung:
 *   Build command:      node build.js
 *   Build output dir:   /  (root)
 */

const fs   = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, 'posts');
const OUT_FILE  = path.join(__dirname, 'posts-index.json');

// Einfaches Frontmatter-Parsing (kein externes Paket nötig)
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { meta: {}, body: content };

  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      let val = rest.join(':').trim();
      // Boolean
      if (val === 'true')  val = true;
      if (val === 'false') val = false;
      meta[key.trim()] = val;
    }
  });

  return { meta, body: content.slice(match[0].length).trim() };
}

// Alle .md Dateien einlesen
if (!fs.existsSync(POSTS_DIR)) {
  fs.writeFileSync(OUT_FILE, '[]');
  console.log('posts/ Verzeichnis leer — posts-index.json erstellt (leer)');
  process.exit(0);
}

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

const index = files.map(filename => {
  const raw   = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf-8');
  const { meta } = parseFrontmatter(raw);
  const slug  = filename.replace(/\.md$/, '');

  return {
    slug,
    title:     meta.title     || slug,
    date:      meta.date      || '',
    excerpt:   meta.excerpt   || '',
    image:     meta.image     || null,
    published: meta.published !== false,
  };
}).filter(p => p.published);

// Nach Datum sortieren (neueste zuerst)
index.sort((a, b) => new Date(b.date) - new Date(a.date));

fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 2));
console.log(`posts-index.json generiert — ${index.length} Beiträge`);
