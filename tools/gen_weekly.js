/* Generates weekly-<slug>.html pages from the premium template (weekly-bo.html)
   using readings from script.js and original commentary from torah_content.js. */
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const template = fs.readFileSync(path.join(PUB, 'weekly-bo.html'), 'utf8');
const content = require('./torah_content.js');

// --- pull the torahPortions array out of script.js ---
const js = fs.readFileSync(path.join(PUB, 'script.js'), 'utf8');
const a = js.indexOf('const torahPortions =');
const arr = eval(js.slice(js.indexOf('[', a), js.indexOf('];', a) + 1));
const alias = { vaera: 'va-era', 'vayakhel-pekudei': 'vayakhel' };
const slugify = (w) => { const s = w.toLowerCase().replace(/'/g, '').replace(/\s+/g, '-'); return alias[s] || s; };
const bySlug = {};
arr.forEach((p, i) => { bySlug[slugify(p.week)] = { ...p, num: i + 1, total: arr.length }; });

// book/reference splitter: "2 Corinthians 9:1-15" -> ["2 Corinthians","9:1-15"]
function splitRef(s) {
  const m = s.match(/^(.*?)\s(\d[\s\S]*)$/);
  return m ? [m[1], m[2]] : [s, ''];
}
const esc = (s) => s; // content is trusted/local

function replaceBetween(src, startAnchor, endAnchor, inner) {
  const i = src.indexOf(startAnchor);
  const j = src.indexOf(endAnchor, i + startAnchor.length);
  if (i === -1 || j === -1) throw new Error(`anchors not found: ${startAnchor}`);
  return src.slice(0, i + startAnchor.length) + '\n' + inner + '\n    ' + src.slice(j);
}

function card(icon, label, ref) {
  const [book, r] = splitRef(ref);
  return `            <div class="reading-card">
                <div class="reading-icon"><i class="fas ${icon}"></i></div>
                <div class="reading-label">${label}</div>
                <div class="reading-text">${book}</div>
                <div class="reading-ref">${r}</div>
            </div>`;
}

const ACTION_COLORS = ['var(--color-gold)', 'var(--color-purple-rich)', 'var(--color-soft-blue)', 'var(--color-gold)'];

function buildPage(slug) {
  const p = bySlug[slug];
  const c = content[slug];
  if (!p) throw new Error(`no schedule entry for ${slug}`);
  if (!c) throw new Error(`no content for ${slug}`);

  let out = template;

  // title
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>Weekly Study | ${p.week} — Messianic Mandate</title>`);

  // hero
  const hero =
`    <section class="study-hero">
        <div class="hero-bg">
            <img src="${c.img}" alt="${p.week} — ${c.alt}" class="hero-image">
        </div>

        <div class="hero-content">
            <div class="hero-meta">
                <span class="meta-badge">
                    <i class="fas fa-scroll"></i>
                    Parashah
                </span>
                <div class="meta-divider"></div>
                <span class="meta-date">Week ${p.num} • ${p.date}</span>
            </div>

            <div class="hero-hebrew">${p.hebrew}</div>
            <h1 class="hero-title">${p.week}</h1>
            <p class="hero-subtitle">${c.subtitle}</p>
        </div>

        <div class="scroll-indicator">
            <span>Explore</span>
            <div class="scroll-line"></div>
        </div>
    </section>
`;
  out = replaceBetween(out, '<!-- Hero Section -->', '<!-- Readings Bar -->', hero);

  // readings
  const readings =
`    <div class="readings-bar">
        <div class="readings-inner">
${card('fa-book', 'Torah', p.torah)}

${card('fa-fire', 'Haftarah', p.prophets)}

${card('fa-cross', 'Gospel', p.gospel)}
        </div>
    </div>
`;
  out = replaceBetween(out, '<!-- Readings Bar -->', '<!-- Main Content -->', readings);

  // main content
  const para = (xs) => xs.map((t) => `                <p>${t}</p>`).join('\n');
  const actions = c.actions.map((a, i) =>
`                    <div class="action-card">
                        <h4><i class="fas ${a.i}" style="color: ${ACTION_COLORS[i % 4]};"></i> ${a.t}</h4>
                        <p>${a.p}</p>
                    </div>`).join('\n\n');

  const main =
`    <main class="study-content">

        <section class="content-section">
            <div class="section-header">
                <span class="section-number">01</span>
                <h2 class="section-title">Messianic Insights</h2>
            </div>
            <div class="section-body">
${para(c.s1.slice(0, 1))}

                <div class="scripture-quote">
                    ${c.quote.t}
                    <cite>${c.quote.c}</cite>
                </div>

${para(c.s1.slice(1))}
            </div>
        </section>

        <section class="content-section">
            <div class="section-header">
                <span class="section-number">02</span>
                <h2 class="section-title">Gospel Insights</h2>
            </div>
            <div class="section-body">
${para(c.s2)}

                <div class="highlight-box">
                    <h3>${c.box.t}</h3>
                    <p>${c.box.p}</p>
                </div>
            </div>
        </section>

        <section class="content-section">
            <div class="section-header">
                <span class="section-number">03</span>
                <h2 class="section-title">Thematic Focus</h2>
            </div>
            <div class="section-body">
                <h3 style="font-size: 1.75rem; color: var(--color-gold); margin-bottom: 1.5rem;">${c.s3title}</h3>

${para(c.s3)}

                <div class="action-grid">
${actions}
                </div>
            </div>
        </section>

    </main>
`;
  out = replaceBetween(out, '<!-- Main Content -->', '<!-- CTA Section -->', main);

  // footer line
  out = out.replace(/Torah Portions • Bo • Week 15 of 54/, `Torah Portions • ${p.week} • Week ${p.num} of ${p.total}`);

  return out;
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(content);
let n = 0;
for (const slug of targets) {
  const html = buildPage(slug);
  fs.writeFileSync(path.join(PUB, `weekly-${slug}.html`), html, 'utf8');
  console.log(`wrote weekly-${slug}.html (${html.length} bytes)`);
  n++;
}
console.log(`\nDone: ${n} page(s).`);
