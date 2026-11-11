// Sonde : un Chromium headless lance depuis un runner GitHub (IP datacenter)
// arrive-t-il a lire Leboncoin et PAP ? C'est LA question qui decide si la collecte
// peut tourner sans le PC.
import { chromium } from 'playwright';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const CIBLES = [
  [
    'LBC recherche',
    'https://www.leboncoin.fr/recherche?category=10&real_estate_type=2&rooms=3-6&price=min-1200&locations=Palaiseau_91120&sort=time',
  ],
  [
    'PAP recherche',
    'https://www.pap.fr/annonce/locations-appartement-3-pieces-jusqu-a-1200-euros',
  ],
];

function analyse(nom, html, status) {
  const nd = /id="__NEXT_DATA__"/.test(html);
  const cartes = (html.match(/class="search-list-item-alt"/g) || []).length;
  const bloque = /datadome|captcha-delivery|Just a moment|Access Denied|unusual traffic/i.test(html);
  const mots = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

  console.log(
    `${nom.padEnd(14)} http=${String(status).padEnd(4)} taille=${String(html.length).padStart(7)} ` +
      `next_data=${nd ? 'oui' : 'non '} cartes_pap=${String(cartes).padStart(3)} blocage=${bloque ? 'OUI' : 'non'}`,
  );
  if (!nd && cartes === 0) console.log(`   debut: ${mots}`);
  return nd || cartes > 0;
}

const args = [
  '--no-sandbox',
  '--disable-blink-features=AutomationControlled',
  '--disable-dev-shm-usage',
];

const browser = await chromium.launch({ headless: true, args });
const ctx = await browser.newContext({
  userAgent: UA,
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' },
});
// masque le plus gros signal headless
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
});

let ok = 0;
for (const [nom, url] of CIBLES) {
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000); // laisse passer le challenge JS
    const html = await page.content();
    const liens = await page.evaluate(
      `document.querySelectorAll('a[href*="/ad/"], a[href*="/annonces/"]').length`,
    );
    if (analyse(nom, html, resp ? resp.status() : 0)) ok++;
    console.log(`   annonces cliquables: ${liens} | titre: ${(await page.title()).slice(0, 50)}`);
  } catch (e) {
    console.log(`${nom.padEnd(14)} erreur ${String(e.message).slice(0, 90)}`);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(ok ? `RESULTAT: ${ok}/${CIBLES.length} sources lisibles depuis le runner` : 'RESULTAT: aucune source lisible');
process.exit(0);
