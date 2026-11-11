// Sonde runner : bien'ici repond-il depuis une IP datacenter (GitHub Actions) ?
// Si oui, la collecte entiere peut tourner sans le PC.
const z = await fetch('https://res.bienici.com/zones.json?name=Palaiseau&type=city&postalCodes%5B%5D=91120', {
  headers: { accept: 'application/json' },
});
const zj = await z.json();
console.log('zones.json', z.status, JSON.stringify(zj).slice(0, 120));

const filters = {
  size: 60, from: 0, filterType: 'rent', propertyType: ['flat'],
  onTheMarket: [true], maxPrice: 1200, minRooms: 3, page: 1,
  sortBy: 'publicationDate', sortOrder: 'desc',
  zoneIdsByTypes: { zoneIds: ['-33504', '-33505', '-29251', '-57750'] },
};
const u = `https://www.bienici.com/realEstateAds.json?filters=${encodeURIComponent(JSON.stringify(filters))}&extensionType=extended`;
const r = await fetch(u);
const t = await r.text();
let j = null;
try { j = JSON.parse(t); } catch {}
console.log('realEstateAds', r.status, String(r.headers.get('content-type')).split(';')[0], t.length, 'octets');
if (j) {
  console.log('total =', j.total, '| annonces =', (j.realEstateAds || []).length);
  console.log('exemples :', (j.realEstateAds || []).slice(0, 5).map((a) => `${a.postalCode} ${a.price}EUR ${a.roomsQuantity}p/${a.bedroomsQuantity}ch ${a.publicationDate}`).join(' | '));
} else {
  console.log('non-JSON :', t.replace(/\s+/g, ' ').slice(0, 200));
}

// et une annonce bien'ici se lit-elle ?
const ad = (j?.realEstateAds?.[0])?.id;
if (ad) {
  const ar = await fetch(`https://www.bienici.com/annonce/${ad}`, { redirect: 'follow' });
  const at = await ar.text();
  console.log('annonce', ar.status, at.length, 'octets |', (at.match(/<title>([^<]*)</) || [])[1]?.slice(0, 70));
}
