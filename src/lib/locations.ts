// Client-safe: Tamil Nadu's 25 city corporations and their popular areas, for the city and
// area pages (lib/areaPages.ts), the header's city picker and vendors' "Based in".
//
// Two zones (owner's spec, 2026-10-29): in the **direct** zone (Chennai, Tambaram, Avadi,
// Kanchipuram) Zenfest's own team runs events and is pinned first on every page; in the
// **market** zone enquiries go to local partner vendors. Areas are "around" a city, not
// strictly inside its corporation limits (Guduvanchery, Kovilpatti).
//
// Map points: OpenStreetMap (Nominatim), 2026-10-29. Lines marked `// ~` weren't found or
// matched a namesake elsewhere, so they're estimates within ~2 km of the right spot; correct
// them if a vendor's matches look off. Slugs are unique across cities *and* areas (same-name
// areas and generic roads carry their city), and are URLs: never rename one that is live.

export type Zone = 'direct' | 'market'
export type Area = { slug: string; name: string; lat: number; lng: number }
export type City = { slug: string; name: string; zone: Zone; lat: number; lng: number; areas: Area[] }
export type Place =
  | { kind: 'city'; slug: string; city: City }
  | { kind: 'area'; slug: string; city: City; area: Area }

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function city(
  slug: string,
  name: string,
  zone: Zone,
  lat: number,
  lng: number,
  areas: [name: string, lat: number, lng: number, slug?: string][],
): City {
  return { slug, name, zone, lat, lng, areas: areas.map(([n, la, ln, s]) => ({ slug: s ?? slugify(n), name: n, lat: la, lng: ln })) }
}

export const CITIES: City[] = [
  city('chennai', 'Chennai', 'direct', 13.0801, 80.2808, [
    ['Adyar', 13.0064, 80.2578],
    ['Anna Nagar', 13.0882, 80.2073],
    ['T Nagar', 13.0386, 80.2336],
    ['Mylapore', 13.0316, 80.27],
    ['OMR', 12.8935, 80.2321],
    ['Velachery', 12.9773, 80.2209],
    ['Nungambakkam', 13.0621, 80.2405],
    ['Madipakkam', 12.9611, 80.2001],
    ['ECR', 12.9455, 80.2575],
    ['Porur', 13.0325, 80.1583],
    ['Guindy', 13.0087, 80.2126],
  ]),
  city('tambaram', 'Tambaram', 'direct', 12.9258, 80.1179, [
    ['Guduvanchery', 12.8452, 80.0577],
    ['Perungalathur', 12.9145, 80.088],
    ['Chromepet', 12.9522, 80.1412],
    ['Pallavaram', 12.9655, 80.1451],
    ['Medavakkam', 12.9202, 80.1872],
    ['Mudichur', 12.915, 80.0688],
    ['Selaiyur', 12.9178, 80.138],
    ['Urapakkam', 12.8637, 80.0722],
    ['Vandalur', 12.8953, 80.0988],
  ]),
  city('avadi', 'Avadi', 'direct', 13.119, 80.0936, [
    ['Poonamallee', 13.0417, 80.1007],
    ['Ambattur', 13.1059, 80.1434],
    ['Thirumullaivoyal', 13.1302, 80.1324],
    ['Pattabiram', 13.1187, 80.065],
    ['Thiruverkadu', 13.0883, 80.1241],
    ['Mangadu', 13.0314, 80.1097],
  ]),
  city('kanchipuram', 'Kanchipuram', 'direct', 12.8342, 79.7036, [
    ['Sriperumbudur', 12.9666, 79.9458],
    ['Oragadam', 12.8386, 79.9452],
    ['Walajabad', 12.7918, 79.8284],
    ['Sunguvarchatram', 12.9256, 79.879],
    ['Enathur', 12.863, 79.7373],
  ]),
  city('coimbatore', 'Coimbatore', 'market', 11.0018, 76.9628, [
    ['Peelamedu', 11.0278, 76.9986],
    ['RS Puram', 11.008, 76.9502],
    ['Ganapathy', 11.0383, 76.9781],
    ['Saravanampatti', 11.073, 77.017],
    ['Singanallur', 11.0125, 77.0391],
    ['Vadavalli', 11.0253, 76.9051],
    ['Kovaipudur', 10.9454, 76.9393],
    ['Ramanathapuram', 10.9948, 76.9921, 'ramanathapuram-coimbatore'],
  ]),
  city('madurai', 'Madurai', 'market', 9.9261, 78.1141, [
    ['Anna Nagar', 9.9217, 78.1481, 'anna-nagar-madurai'],
    ['K K Nagar', 9.931, 78.142, 'k-k-nagar-madurai'],
    ['SS Colony', 9.9228, 78.0971],
    ['Tallakulam', 9.9335, 78.1389],
    ['Thirunagar', 9.8855, 78.061],
    ['Kalavasal', 9.9301, 78.0957],
    ['Bypass Road', 9.922, 78.099, 'bypass-road-madurai'], // ~
    ['Mattuthavani', 9.9477, 78.1569],
  ]),
  city('tiruchirappalli', 'Tiruchirappalli', 'market', 10.8071, 78.6881, [
    ['Srirangam', 10.8573, 78.6931],
    ['Thillai Nagar', 10.8222, 78.6834],
    ['K K Nagar', 10.7564, 78.6911, 'k-k-nagar-trichy'],
    ['Cantonment', 10.8005, 78.6787, 'cantonment-trichy'],
    ['Woraiyur', 10.8281, 78.6731],
    ['Tennur', 10.8174, 78.6862],
    ['Kattur', 10.8002, 78.7484],
  ]),
  city('salem', 'Salem', 'market', 11.6643, 78.146, [
    ['Fairlands', 11.6758, 78.1433],
    ['Alagapuram', 11.6862, 78.1484],
    ['Hasthampatti', 11.6764, 78.1581],
    ['Suramangalam', 11.6754, 78.1193],
    ['Ammapet', 11.6588, 78.1809],
    ['Meyyanur', 11.6722, 78.133],
    ['Gorimedu', 11.6953, 78.1637],
  ]),
  city('erode', 'Erode', 'market', 11.341, 77.7172, [
    ['Thindal', 11.3197, 77.6759],
    ['Perundurai Road', 11.333, 77.7, 'perundurai-road-erode'], // ~
    ['Bhavani', 11.4456, 77.6826],
    ['Surampatti', 11.3278, 77.7107],
    ['Kollampalayam', 11.3271, 77.7309],
    ['Solar', 11.3194, 77.752, 'solar-erode'],
  ]),
  city('tiruppur', 'Tiruppur', 'market', 11.1085, 77.3411, [
    ['Avinashi Road', 11.124, 77.35, 'avinashi-road-tiruppur'], // ~
    ['PN Road', 11.1124, 77.3383, 'pn-road-tiruppur'],
    ['Dharapuram Road', 11.09, 77.346, 'dharapuram-road-tiruppur'], // ~
    ['Kangeyam Road', 11.1018, 77.3531, 'kangeyam-road-tiruppur'],
    ['Mangalam Road', 11.0978, 77.3297, 'mangalam-road-tiruppur'],
    ['Velampalayam', 11.136, 77.3114],
  ]),
  city('vellore', 'Vellore', 'market', 12.9165, 79.1325, [
    ['Katpadi', 12.969, 79.144],
    ['Sathuvachari', 12.9361, 79.1558],
    ['Gandhi Nagar', 12.9542, 79.1412, 'gandhi-nagar-vellore'],
    ['CMC area', 12.9246, 79.1352, 'cmc-area-vellore'],
    ['Bagayam', 12.8818, 79.1353],
    ['Shenbakkam', 12.9285, 79.118],
  ]),
  city('tirunelveli', 'Tirunelveli', 'market', 8.7139, 77.7567, [
    ['Palayamkottai', 8.7197, 77.7644],
    ['Vannarpettai', 8.7289, 77.7215],
    ['Thachanallur', 8.7469, 77.7026],
    ['Melapalayam', 8.7009, 77.716],
    ['Tirunelveli Town', 8.7275, 77.687],
    ['Maharaja Nagar', 8.7076, 77.753],
  ]),
  city('thoothukudi', 'Thoothukudi', 'market', 8.7642, 78.1348, [
    ['Kovilpatti', 9.1756, 77.8687],
    ['Muthammal Colony', 8.796, 78.137], // ~
    ['Chidambara Nagar', 8.7973, 78.1323],
    ['Millerpuram', 8.8032, 78.1272],
    ['Bryant Nagar', 8.7911, 78.1276],
  ]),
  city('dindigul', 'Dindigul', 'market', 10.3673, 77.9803, [
    ['Palani Road', 10.3735, 77.95, 'palani-road-dindigul'], // ~
    ['RM Colony', 10.379, 77.969, 'rm-colony-dindigul'], // ~
    ['YMR Patti', 10.356, 77.972], // ~
    ['Nagal Nagar', 10.358, 77.976], // ~
    ['Begampur', 10.37, 77.961], // ~
  ]),
  city('thanjavur', 'Thanjavur', 'market', 10.787, 79.1378, [
    ['Medical College Road', 10.7631, 79.1066, 'medical-college-road-thanjavur'],
    ['Srinivasapuram', 10.778, 79.124, 'srinivasapuram-thanjavur'], // ~
    ['Membalam', 10.7785, 79.1301],
    ['Ramanathan Junction', 10.7726, 79.1324],
    ['New Bus Stand', 10.7516, 79.11, 'new-bus-stand-thanjavur'],
  ]),
  city('nagercoil', 'Nagercoil', 'market', 8.184, 77.4315, [
    ['Vadasery', 8.192, 77.4326],
    ['Kottar', 8.174, 77.4393],
    ['Parvathipuram', 8.1892, 77.4015],
    ['Krishnancoil', 8.1955, 77.4254],
    ['Meenakshipuram', 8.1833, 77.4351, 'meenakshipuram-nagercoil'],
  ]),
  city('hosur', 'Hosur', 'market', 12.7409, 77.8253, [
    ['Bagalur Road', 12.7509, 77.8859, 'bagalur-road-hosur'],
    ['Rayakottai Road', 12.712, 77.7923, 'rayakottai-road-hosur'],
    ['Mathigiri', 12.6928, 77.8063],
    ['SIPCOT', 12.7588, 77.8039, 'sipcot-hosur'],
    ['TVS Nagar', 12.7209, 77.8079],
    ['Mookandapalli', 12.7464, 77.8032],
  ]),
  city('kumbakonam', 'Kumbakonam', 'market', 10.9604, 79.3821, [
    ['Srinagar Colony', 10.97, 79.395, 'srinagar-colony-kumbakonam'], // ~
    ['Darasuram', 10.9446, 79.3563],
    ['Palakarai', 10.965, 79.39], // ~
    ['Town Hall Road', 10.959, 79.377, 'town-hall-road-kumbakonam'], // ~
    ['SR Nagar', 10.95, 79.395, 'sr-nagar-kumbakonam'], // ~
  ]),
  city('cuddalore', 'Cuddalore', 'market', 11.748, 79.7714, [
    ['Manjakuppam', 11.7616, 79.7635],
    ['Thirupapuliyur', 11.755, 79.752], // ~
    ['Semmandalam', 11.7648, 79.7499],
    ['Vandipalayam', 11.7309, 79.7493],
    ['Pudupalayam', 11.747, 79.7651],
  ]),
  city('karur', 'Karur', 'market', 10.9601, 78.0766, [
    ['Vengamedu', 10.97, 78.065], // ~
    ['Gandhigramam', 10.956, 78.092], // ~
    ['Sengunthapuram', 10.962, 78.085], // ~
    ['Rayanur', 10.938, 78.07], // ~
    ['Thanthonimalai', 10.942, 78.083], // ~
  ]),
  city('sivakasi', 'Sivakasi', 'market', 9.4533, 77.8024, [
    ['Thiruthangal', 9.4776, 77.8062],
    ['Reserve Line', 9.462, 77.81, 'reserve-line-sivakasi'], // ~
    ['Palaniandavarpuram', 9.448, 77.798], // ~
    ['Coronation Colony', 9.455, 77.806], // ~
    ['NRK Rajarathinam Nagar', 9.46, 77.795], // ~
  ]),
  city('karaikudi', 'Karaikudi', 'market', 10.0728, 78.7795, [
    ['Sekkalai', 10.0824, 78.7763],
    ['Kottaiyur', 10.1129, 78.7865],
    ['Alagappapuram', 10.0789, 78.7929],
    ['College Road', 10.0787, 78.7903, 'college-road-karaikudi'],
    ['Senjai', 10.065, 78.785], // ~
  ]),
  city('namakkal', 'Namakkal', 'market', 11.2189, 78.1674, [
    ['Paramathi Road', 11.216, 78.152, 'paramathi-road-namakkal'], // ~
    ['Trichy Road', 11.199, 78.1864, 'trichy-road-namakkal'],
    ['Mohanur Road', 11.2, 78.17, 'mohanur-road-namakkal'], // ~
    ['Salem Road', 11.24, 78.165, 'salem-road-namakkal'], // ~
    ['SP Pudur', 11.225, 78.16, 'sp-pudur-namakkal'], // ~
  ]),
  city('pudukkottai', 'Pudukkottai', 'market', 10.3833, 78.8001, [
    ['Thirugokarnam', 10.3796, 78.8209],
    ['Machuvadi', 10.3954, 78.8278],
    ['Rajagopalapuram', 10.3752, 78.8129],
    ['Santhanathapuram', 10.38, 78.815], // ~
    ['TVS Corner', 10.387, 78.805, 'tvs-corner-pudukkottai'], // ~
  ]),
  city('tiruvannamalai', 'Tiruvannamalai', 'market', 12.2253, 79.0747, [
    ['Girivalam Path', 12.231, 79.058], // ~
    ['Ramana Ashram area', 12.2219, 79.0622],
    ['Vengikkal', 12.242, 79.072], // ~
    ['Tindivanam Road', 12.2375, 79.1011, 'tindivanam-road-tiruvannamalai'],
    ['Polur Road', 12.24, 79.06, 'polur-road-tiruvannamalai'], // ~
  ]),
]

/** A vendor's "How far you travel" choices, in km. */
export const TRAVEL_KM = [
  [5, 'Up to 5 km'],
  [10, 'Up to 10 km'],
  [15, 'Up to 15 km'],
  [25, 'Up to 25 km'],
  [40, 'Up to 40 km'],
  [60, 'Up to 60 km'],
  [100, 'Up to 100 km'],
  [200, 'Up to 200 km'],
  [1000, 'Anywhere in Tamil Nadu'],
] as const

const PLACES = new Map<string, Place>()
for (const c of CITIES) {
  PLACES.set(c.slug, { kind: 'city', slug: c.slug, city: c })
  for (const a of c.areas) PLACES.set(a.slug, { kind: 'area', slug: a.slug, city: c, area: a })
}

export function findPlace(slug: unknown): Place | null {
  return typeof slug === 'string' ? (PLACES.get(slug) ?? null) : null
}

/** The city itself, then its areas. */
export const placesOf = (c: City): Place[] => [PLACES.get(c.slug)!, ...c.areas.map((a) => PLACES.get(a.slug)!)]

export const placeName = (p: Place) => (p.kind === 'city' ? p.city.name : p.area.name)

/** "Guduvanchery, Tambaram" or "Tambaram". */
export const placeTitle = (p: Place) => (p.kind === 'city' ? p.city.name : `${p.area.name}, ${p.city.name}`)

export function placeLabel(slug: unknown) {
  const p = findPlace(slug)
  return p ? placeTitle(p) : ''
}

const point = (p: Place) => (p.kind === 'city' ? p.city : p.area)

/** Straight-line distance in km (haversine). */
export function distanceKm(a: Place, b: Place) {
  const [p, q] = [point(a), point(b)]
  const r = Math.PI / 180
  const h =
    Math.sin(((q.lat - p.lat) * r) / 2) ** 2 +
    Math.cos(p.lat * r) * Math.cos(q.lat * r) * Math.sin(((q.lng - p.lng) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/** The `n` nearest areas to `p` in any city, nearest first. */
export function nearestPlaces(p: Place, n: number): Place[] {
  return [...PLACES.values()]
    .filter((q) => q.kind === 'area' && q.slug !== p.slug)
    .map((q) => ({ q, km: distanceKm(p, q) }))
    .sort((x, y) => x.km - y.km)
    .slice(0, n)
    .map(({ q }) => q)
}

/** Zenfest's own branches (Site Settings → Branches), spelled as on the Google listing. */
const ZENFEST_BASES = [
  { slug: 'guduvanchery', name: 'Guduvancheri' },
  { slug: 'thiruverkadu', name: 'Thiruverkadu' },
]

/** The Zenfest branch nearest to `p`, with its distance in whole km. */
export function nearestBase(p: Place) {
  return ZENFEST_BASES.map((b) => ({ name: b.name, km: Math.round(distanceKm(PLACES.get(b.slug)!, p)) })).sort(
    (a, b) => a.km - b.km,
  )[0]
}
