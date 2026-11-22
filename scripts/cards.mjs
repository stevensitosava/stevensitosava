// cards.mjs — draws the animated cards of the profile README from the live, public status of www.stevensawarin.com:
//   cards/videos.svg   views and followers of my videos (rolling counters), the total views day by day, the views per platform
//   cards/cloud.svg    my home server right now: health checks, containers, uptime, power, last backup, scheduled jobs
//   cards/clients.svg  the client sites' Google impressions since launch day, as shapes only (no numbers), drawn in
// No dependencies (Node 18+). Run by .github/workflows/cards.yml every 6 hours; writes the files only when they change.
// The animations are CSS inside the SVG, so they play in the README image as well.
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';

const SRC = process.env.STATUS_URL || 'https://www.stevensawarin.com/status.json';
const S = JSON.parse(process.argv[2] ? readFileSync(process.argv[2], 'utf8') : await (await fetch(SRC + '?t=' + Date.now(), { headers: { 'User-Agent': 'profile-cards' } })).text());
mkdirSync('cards', { recursive: true });

const C = { bg: '#0d1117', card: '#161b22', line: '#30363d', text: '#e6edf3', muted: '#8b949e', blue: '#58a6ff', green: '#3fb950', gold: '#f2cc60', pink: '#f778ba' };
const FONT = `-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`, MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const day = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const when = (epoch) => new Date(epoch * 1000).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
const ago = (epoch) => { const h = (Date.now() / 1000 - epoch) / 3600; return h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`; };
function write(name, svg) { const p = `cards/${name}.svg`; if (existsSync(p) && readFileSync(p, 'utf8') === svg) return console.log(p, 'unchanged'); writeFileSync(p, svg); console.log(p, 'written'); }
const frame = (w, h, title, body, style = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<style>
text{font-family:${FONT};fill:${C.text}}
.t{font-size:15px;font-weight:600}.m{fill:${C.muted};font-size:12px}.mono{font-family:${MONO}}
.in{opacity:0;animation:in .6s ease-out forwards}
@keyframes in{to{opacity:1}}
${style}
</style>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="10" fill="${C.card}" stroke="${C.line}"/>
${body}
</svg>`;

// a number that rolls up like an odometer: every digit is a column 0-9 that slides to its value, the left digits last
function roll(value, x, y, size, color, delay = 0) {
  const s = fmt(value), cw = size * 0.62, out = [];
  let dx = 0, k = 0;
  for (const ch of s) {
    if (ch === ',') { out.push(`<text x="${x + dx}" y="${y}" class="mono" font-size="${size}" font-weight="700" fill="${color}">,</text>`); dx += cw * 0.6; continue; }
    const d = +ch, col = Array.from({ length: 10 }, (_, i) => `<tspan x="${x + dx}" dy="${i ? size : 0}">${i}</tspan>`).join('');
    out.push(`<g clip-path="url(#clip${Math.round(size)})"><text y="${y}" class="mono" font-size="${size}" font-weight="700" fill="${color}" style="transform:translateY(${-d * size}px);animation:r${d}s${Math.round(size)} ${1.6 + (s.length - k) * 0.08}s cubic-bezier(.2,.8,.2,1) ${delay}s both">${col}</text></g>`);
    dx += cw; k++;
  }
  return { svg: out.join(''), width: dx, clip: `<clipPath id="clip${Math.round(size)}"><rect x="0" y="${y - size * 0.82}" width="2000" height="${size * 1.02}"/></clipPath>` };
}
// the keyframes of the rolling digits, in pixels (a percentage would be of the whole picture in SVG)
const rollKeys = (size) => Array.from({ length: 10 }, (_, d) => `@keyframes r${d}s${Math.round(size)}{from{transform:translateY(0)}to{transform:translateY(${-d * size}px)}}`).join('');

// ---- videos
{
  const c = S.content, W = 495, H = 300;
  const v = roll(c.views, 24, 82, 34, C.text, 0.1), f = roll(c.followers, 290, 82, 34, C.text, 0.3);
  const series = c.series || [], mx = Math.max(...series.map((p) => p.v), 1), gx = 24, gw = 250, gy = 128, gh = 110;
  const pts = series.map((p, i) => [gx + (i / Math.max(1, series.length - 1)) * gw, gy + gh - (p.v / mx) * gh]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const area = `${line}L${gx + gw} ${gy + gh}L${gx} ${gy + gh}Z`, [ex, ey] = pts[pts.length - 1] || [gx, gy];
  const plats = [...c.platforms].sort((a, b) => b.views - a.views), top = plats[0].views;
  const bars = plats.map((p, i) => { const y = 140 + i * 30, w = Math.max(4, (p.views / top) * 96);
    return `<text x="292" y="${y}" class="m in" style="animation-delay:${0.6 + i * 0.12}s">${esc(p.name)}</text><rect x="292" y="${y + 6}" width="96" height="7" rx="3.5" fill="${C.line}"/><rect x="292" y="${y + 6}" width="${w.toFixed(1)}" height="7" rx="3.5" fill="${C.blue}" style="transform-origin:292px 0;transform:scaleX(0);animation:grow 1.2s cubic-bezier(.2,.8,.2,1) ${0.7 + i * 0.12}s forwards"/><text x="${W - 24}" y="${y + 13}" text-anchor="end" class="m mono in" style="animation-delay:${0.9 + i * 0.12}s">${fmt(p.views)}</text>`; }).join('');
  const body = `<defs>${v.clip}<linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.blue}" stop-opacity=".35"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/></linearGradient></defs>
<text x="24" y="32" class="t">My videos, in numbers</text><text x="${W - 24}" y="32" text-anchor="end" class="m">Instagram · TikTok · YouTube · Facebook</text>
${v.svg}<text x="24" y="104" class="m">views</text>${f.svg}<text x="290" y="104" class="m">followers</text>
<line x1="${gx}" y1="${gy + gh}" x2="${gx + gw}" y2="${gy + gh}" stroke="${C.line}"/>
<path d="${area}" fill="url(#ga)" class="in" style="animation-delay:1.6s"/>
<path d="${line}" fill="none" stroke="${C.blue}" stroke-width="2.5" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" style="animation:draw 2.2s ease-in-out .4s forwards"/>
<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="9" fill="${C.blue}" opacity="0" style="animation:pulse 2s ease-out 2.6s infinite"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="4" fill="${C.blue}" class="in" style="animation-delay:2.5s"/>
<text x="${gx}" y="${gy + gh + 18}" class="m">${series.length ? day(series[0].d) : ''}</text><text x="${gx + gw}" y="${gy + gh + 18}" text-anchor="end" class="m">${day(c.date)}</text>
${bars}
<text x="24" y="${H - 16}" class="m">My own pipeline, posted by my own server · read ${when(c.at)}</text>`;
  write('videos', frame(W, H, `My videos: ${fmt(c.views)} views and ${fmt(c.followers)} followers`, body, `${rollKeys(34)}@keyframes draw{to{stroke-dashoffset:0}}@keyframes grow{to{transform:scaleX(1)}}@keyframes pulse{0%{opacity:.5;r:4}100%{opacity:0;r:16}}`));
}

// ---- cloud
{
  const W = 495, H = 300, up = (S.generated - S.boot) / 86400, jobs = S.jobs || [];
  const tiles = [[`${S.health.ok}/${S.health.total}`, 'health checks passing'], [`${S.containers.running}/${S.containers.total}`, 'containers running'], [`${Math.floor(up)} days`, 'up without a restart'], [`${S.power_w.toFixed(1)} W`, 'at the wall (estimate)']];
  const tl = tiles.map(([big, small], i) => { const x = 24 + (i % 2) * 230, y = 52 + Math.floor(i / 2) * 60;
    return `<g class="in" style="animation-delay:${0.15 + i * 0.12}s"><text x="${x}" y="${y + 22}" class="mono" font-size="26" font-weight="700" fill="${i < 2 ? C.green : C.text}">${esc(big)}</text><text x="${x}" y="${y + 42}" class="m">${esc(small)}</text></g>`; }).join('');
  const jl = jobs.slice(0, 4).map((j, i) => `<g class="in" style="animation-delay:${0.7 + i * 0.1}s"><circle cx="30" cy="${210 + i * 16}" r="3.5" fill="${j.ok ? C.green : C.pink}"/><text x="42" y="${214 + i * 16}" class="m" style="fill:${C.text}">${esc(j.label)}</text><text x="${W - 24}" y="${214 + i * 16}" text-anchor="end" class="m">${when(j.last)}</text></g>`).join('');
  const body = `<text x="24" y="32" class="t">My cloud, live</text>
<circle cx="${W - 120}" cy="27" r="5" fill="${C.green}"/><circle cx="${W - 120}" cy="27" r="5" fill="${C.green}" style="animation:pulse 1.8s ease-out infinite"/><text x="${W - 24}" y="32" text-anchor="end" class="m" style="fill:${C.green}">all systems ok</text>
${tl}<text x="24" y="196" class="m">Last runs of the scheduled jobs (Amsterdam time)</text>${jl}
<text x="24" y="${H - 10}" class="m">Last encrypted backup ${when(S.backup.last)} · drawn ${when(S.generated)}</text>`;
  write('cloud', frame(W, H, `My cloud: ${S.health.ok}/${S.health.total} checks, ${S.containers.running} containers`, body, `@keyframes pulse{0%{opacity:.6;r:5}100%{opacity:0;r:14}}`));
}

// ---- clients (shapes only: no impressions or clicks are shown)
{
  const W = 1000, H = 190, names = { budares: "Budare's", 'oerlemans-fietsen': 'Oerlemans Fietsen', 'pasta-fresca-013': 'Pasta Fresca 013', 'mr-society': 'MR Society', robuzt: 'ROBUZT' };
  const sites = Object.entries(S.growth.sites), cw = (W - 48 - 16 * (sites.length - 1)) / sites.length;
  const cards = sites.map(([id, g], i) => { const x0 = 24 + i * (cw + 16), y0 = 58, h = 80, pts = g.points, mx = Math.max(...pts, 1);
    const line = pts.map((p, k) => `${k ? 'L' : 'M'}${(x0 + (k / Math.max(1, pts.length - 1)) * cw).toFixed(1)} ${(y0 + h - (p / mx) * h).toFixed(1)}`).join('');
    return `<text x="${x0}" y="48" class="m" style="fill:${C.text}">${esc(names[id] || id)}</text><line x1="${x0}" y1="${y0 + h}" x2="${x0 + cw}" y2="${y0 + h}" stroke="${C.line}"/><path d="${line}" fill="none" stroke="${C.green}" stroke-width="2.2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" style="animation:draw 2.4s ease-in-out ${0.2 + i * 0.25}s forwards"/><text x="${x0}" y="${y0 + h + 18}" class="m">${day(g.from)}</text><text x="${x0 + cw}" y="${y0 + h + 18}" text-anchor="end" class="m">${day(g.to)}</text>`; }).join('');
  const body = `<text x="24" y="28" class="t">Client sites I built, found on Google since launch day</text>${cards}<text x="24" y="${H - 12}" class="m">Running total of the times each site appeared in Google, from its own Search Console. Each chart has its own scale.</text>`;
  write('clients', frame(W, H, 'Client sites: growth in Google since launch', body, `@keyframes draw{to{stroke-dashoffset:0}}`));
}
