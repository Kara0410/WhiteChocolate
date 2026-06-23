const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#DFA536",
  "mapTint": "#D7E6E9",
  "surfaceWarmth": "#F7F0E4",
  "density": 1
}/*EDITMODE-END*/;

const zones = [
  { id: "haidhausen", name: "Haidhausen Nord", pct: 72, price: "€2.60/hr", age: "3 min", reports: 4, freshness: "fresh", rule: "Max 2h · resident permit after 19:00", ev: true, x: 62, y: 34, w: 23, h: 16 },
  { id: "glockenbach", name: "Glockenbachviertel", pct: 43, price: "€3.20/hr", age: "18 min", reports: 2, freshness: "aging", rule: "Paid until 23:00 · high turnover", ev: false, x: 30, y: 54, w: 26, h: 18 },
  { id: "maxvorstadt", name: "Maxvorstadt", pct: null, price: "€2.90/hr", age: "no reports", reports: 0, freshness: "none", rule: "Not enough data for this hour bucket", ev: true, x: 36, y: 22, w: 28, h: 18 },
  { id: "sendling", name: "Sendling Tor", pct: 61, price: "€2.80/hr", age: "7 min", reports: 3, freshness: "fresh", rule: "EV bays on Lindwurmstraße", ev: true, x: 47, y: 72, w: 24, h: 15 }
];

const screens = [
  { key: "map", label: "Map Home" },
  { key: "detail", label: "Zone Detail" },
  { key: "list", label: "List View" },
  { key: "check", label: "Fresh Check" },
  { key: "consent", label: "Consent" },
  { key: "billing", label: "Subscribe" },
  { key: "account", label: "Account" }
];

function confidenceTone(pct) {
  if (pct === null) return "var(--unknown)";
  if (pct >= 68) return "var(--high)";
  if (pct >= 52) return "var(--mid)";
  return "var(--low)";
}

function App() {
  const [active, setActive] = React.useState("all");
  const visibleScreens = active === "all" ? screens : screens.filter((screen) => screen.key === active);

  return (
    <main className="app-shell">
      <style>{styles}</style>
      <header className="board-header">
        <div>
          <p className="eyebrow">Munich Parking Discovery MVP</p>
          <h1>Every core app page, map-first.</h1>
          <p className="header-copy">A production-minded screen set for confidence-weighted parking discovery: calibrated availability, freshness, pricing, EV eligibility, contribution feedback, consent, and hosted billing handoff.</p>
        </div>
        <div className="status-card" aria-label="Pilot readiness summary">
          <span className="status-dot"></span>
          <strong>Pilot district</strong>
          <span>Haidhausen · Glockenbach · Maxvorstadt · Sendling</span>
        </div>
      </header>

      <nav className="screen-switcher" aria-label="Prototype pages">
        <button className={active === "all" ? "active" : ""} onClick={() => setActive("all")}>All pages</button>
        {screens.map((screen) => (
          <button key={screen.key} className={active === screen.key ? "active" : ""} onClick={() => setActive(screen.key)}>{screen.label}</button>
        ))}
      </nav>

      <section className={active === "all" ? "screen-grid" : "screen-grid single"} aria-label="App page previews">
        {visibleScreens.map((screen) => <PhoneScreen key={screen.key} type={screen.key} />)}
      </section>
    </main>
  );
}

function PhoneScreen({ type }) {
  const titles = {
    map: "Map Home",
    detail: "Zone Detail Sheet",
    list: "Accessible List",
    check: "I'm Leaving Now",
    consent: "Location Consent",
    billing: "Subscribe Flow",
    account: "Account & Billing"
  };
  return (
    <article className="phone-card" aria-label={titles[type]}>
      <div className="phone-label"><span>{titles[type]}</span><small>390 × 844</small></div>
      <div className="screen">
        <TopBar />
        {type === "map" && <MapHome />}
        {type === "detail" && <ZoneDetail />}
        {type === "list" && <ListView />}
        {type === "check" && <FreshCheck />}
        {type === "consent" && <Consent />}
        {type === "billing" && <Billing />}
        {type === "account" && <Account />}
      </div>
    </article>
  );
}

function TopBar() {
  return (
    <div className="top-bar">
      <span>09:41</span>
      <div className="top-icons" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>
  );
}

function MapHome() {
  return (
    <div className="screen-content map-page">
      <div className="map-toolbar">
        <div>
          <p className="micro">Near you</p>
          <h2>Where should I park?</h2>
        </div>
        <button className="icon-button" aria-label="Filter EV only">EV</button>
      </div>
      <MapCanvas selected="haidhausen" />
      <button className="leaving-fab">I’m leaving now</button>
      <div className="peek-sheet">
        <div className="grabber"></div>
        <div className="sheet-head">
          <strong>Best nearby</strong>
          <span>Updated just now</span>
        </div>
        {zones.slice(0, 3).map((zone) => <ZoneRow key={zone.id} zone={zone} compact />)}
      </div>
    </div>
  );
}

function MapCanvas({ selected }) {
  return (
    <div className="map-canvas" role="img" aria-label="Stylized Munich pilot district map with parking confidence zones">
      <svg viewBox="0 0 390 465" className="street-map" aria-hidden="true">
        <path d="M37 92 C111 70 144 116 212 86 C280 56 306 84 356 62" />
        <path d="M28 220 C80 198 132 232 184 204 C243 172 296 207 364 174" />
        <path d="M58 392 C116 322 139 279 202 258 C266 238 315 268 366 236" />
        <path d="M86 26 C94 120 110 214 94 312 C87 353 101 402 122 445" />
        <path d="M202 20 C190 112 211 173 204 246 C197 314 234 376 220 448" />
        <path d="M318 31 C300 118 326 182 305 256 C292 305 314 367 298 438" />
      </svg>
      {zones.map((zone) => (
        <button
          key={zone.id}
          className={`zone-chip ${selected === zone.id ? "selected" : ""} ${zone.freshness}`}
          style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%`, background: confidenceTone(zone.pct) }}
          aria-label={`${zone.name}, ${zone.pct === null ? "not enough data" : zone.pct + "% likely"}, ${zone.age}`}
        >
          <span>{zone.pct === null ? "—" : `${zone.pct}%`}</span>
          <small>{zone.age}</small>
        </button>
      ))}
      <div className="coverage-note">Pilot coverage boundary</div>
    </div>
  );
}

function ZoneDetail() {
  const zone = zones[0];
  return (
    <div className="screen-content map-page">
      <MapCanvas selected="haidhausen" />
      <section className="bottom-sheet full" aria-label="Haidhausen Nord details">
        <div className="grabber"></div>
        <div className="detail-title">
          <div>
            <p className="micro">Best bet right now</p>
            <h2>{zone.name}</h2>
          </div>
          <div className="score-pill" style={{ background: confidenceTone(zone.pct) }}>{zone.pct}%</div>
        </div>
        <p className="trust-copy">Likely to find a spot because 4 fresh reports agree with the Tuesday 18:00 pattern.</p>
        <div className="facts-grid">
          <Fact label="Freshness" value="3 min ago" />
          <Fact label="Crowd reports" value="4 nearby" />
          <Fact label="Price" value="€2.60/hr" />
          <Fact label="EV" value="2 bays" />
        </div>
        <div className="explain-box">
          <strong>Why this color?</strong>
          <span>Amber means higher availability. Solid opacity means recent reports; faded zones are older estimates.</span>
        </div>
        <div className="report-actions" aria-label="Submit parking report">
          <button className="secondary">No spots</button>
          <button className="primary">Found one</button>
        </div>
        <button className="wide-button">Navigate to zone</button>
      </section>
    </div>
  );
}

function ListView() {
  return (
    <div className="screen-content list-page">
      <div className="map-toolbar list-head">
        <div>
          <p className="micro">List fallback</p>
          <h2>Parking zones</h2>
        </div>
        <button className="filter-chip">EV only</button>
      </div>
      <div className="error-banner" role="status">Map tiles are slow. List remains available.</div>
      <div className="zone-list">
        {zones.map((zone) => <ZoneRow key={zone.id} zone={zone} />)}
      </div>
      <button className="leaving-bottom">I’m leaving now</button>
    </div>
  );
}

function FreshCheck() {
  return (
    <div className="screen-content check-page">
      <MapCanvas selected="glockenbach" />
      <div className="overlay-panel" role="status" aria-live="polite">
        <div className="pulse-ring"><span></span></div>
        <p className="micro">Fresh occupancy check</p>
        <h2>Checking nearby drivers…</h2>
        <p>We’ll wait up to 75 seconds for a fresh report near Glockenbachviertel, then fall back to the best standing prediction.</p>
        <div className="progress-wrap" aria-label="42 seconds remaining"><span style={{ width: "44%" }}></span></div>
        <div className="timer-row"><strong>33s elapsed</strong><span>Fallback estimate ready</span></div>
        <button className="secondary wide">Cancel check</button>
      </div>
    </div>
  );
}

function Consent() {
  return (
    <div className="screen-content consent-page">
      <MapCanvas selected="sendling" />
      <div className="consent-card" role="dialog" aria-labelledby="consent-title">
        <p className="micro">Before location access</p>
        <h2 id="consent-title">Use your location only to rank nearby zones.</h2>
        <p>Munich Parking can show the map without your location. If you allow it, we use coarse position for nearby predictions and fresh-check requests.</p>
        <ul>
          <li>No account required to browse or report.</li>
          <li>Reports are device-attributed for rate limiting.</li>
          <li>You can revoke permission at any time.</li>
        </ul>
        <button className="primary wide">Continue to OS prompt</button>
        <button className="ghost wide">Not now</button>
      </div>
    </div>
  );
}

function Billing() {
  return (
    <div className="screen-content billing-page">
      <button className="back-button">← Back to map</button>
      <p className="micro">Pilot subscription</p>
      <h2>Unlock full prediction confidence.</h2>
      <p className="billing-copy">Subscribe after the pre-payment gate passes. Checkout stays hosted by Stripe; cancellations are managed in the Stripe portal.</p>
      <div className="price-card">
        <span>Munich pilot</span>
        <strong>€6</strong>
        <small>per month · refund policy shown before payment</small>
      </div>
      <div className="included-list">
        <span>✓ confidence-weighted availability by hour</span>
        <span>✓ price, max-stay, EV and resident rules</span>
        <span>✓ one-tap fresh occupancy checks</span>
      </div>
      <button className="primary wide">Sign in and continue to Stripe</button>
      <p className="fine-print">Cancelling sign-in returns silently to the map. Declines are handled inside Stripe Checkout.</p>
    </div>
  );
}

function Account() {
  return (
    <div className="screen-content account-page">
      <div className="avatar-mark" aria-hidden="true">M</div>
      <h2>Account</h2>
      <p className="billing-copy">Anonymous reporting remains available. Subscription management opens Stripe’s hosted Customer Portal.</p>
      <section className="account-section">
        <strong>Subscription</strong>
        <div className="subscription-row"><span>Munich pilot</span><em>Active</em></div>
        <button className="wide-button">Manage subscription</button>
      </section>
      <section className="account-section">
        <strong>Privacy</strong>
        <button className="settings-row">Location permission <span>Allowed</span></button>
        <button className="settings-row">Data and consent <span>Review</span></button>
      </section>
      <section className="account-section muted-section">
        <strong>Contributions today</strong>
        <p>3 reports sent in Haidhausen. Thanks — this is the pilot health metric that matters.</p>
      </section>
    </div>
  );
}

function ZoneRow({ zone, compact }) {
  return (
    <button className={`zone-row ${compact ? "compact" : ""}`}>
      <span className="mini-swatch" style={{ background: confidenceTone(zone.pct), opacity: zone.freshness === "aging" ? 0.58 : 1 }}></span>
      <span className="row-main"><strong>{zone.name}</strong><small>{zone.rule}</small></span>
      <span className="row-meta"><strong>{zone.pct === null ? "No data" : `${zone.pct}%`}</strong><small>{zone.price}</small></span>
    </button>
  );
}

function Fact({ label, value }) {
  return <div className="fact"><span>{label}</span><strong>{value}</strong></div>;
}

const styles = `
:root {
  --accent: var(--ocd-tweak-accent-color, ${TWEAK_DEFAULTS.accentColor});
  --map-tint: var(--ocd-tweak-map-tint, ${TWEAK_DEFAULTS.mapTint});
  --surface-warmth: var(--ocd-tweak-surface-warmth, ${TWEAK_DEFAULTS.surfaceWarmth});
  --density: var(--ocd-tweak-density, ${TWEAK_DEFAULTS.density});
  --ink: #172126;
  --muted: #69767A;
  --line: rgba(23, 33, 38, 0.14);
  --surface: #FFFCF5;
  --deep: #203842;
  --low: #78AFC8;
  --mid: #B7B068;
  --high: var(--accent);
  --unknown: #C9C4B8;
  --danger-soft: #F1D9CA;
  --radius-xl: 28px;
  --radius-lg: 20px;
  --shadow: 0 28px 80px rgba(25, 42, 47, .20);
}
* { box-sizing: border-box; }
body { margin: 0; background: #E9E1D3; color: var(--ink); font-family: "Trebuchet MS", "Gill Sans", sans-serif; }
button { font: inherit; }
.app-shell { min-height: 100vh; padding: clamp(18px, 3vw, 40px); background: radial-gradient(circle at 16% 8%, rgba(223,165,54,.30), transparent 30%), radial-gradient(circle at 90% 18%, rgba(120,175,200,.30), transparent 28%), linear-gradient(135deg, var(--surface-warmth), #DDE7E2); }
.board-header { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 24px; align-items: end; max-width: 1440px; margin: 0 auto 18px; }
.eyebrow, .micro { margin: 0 0 6px; text-transform: uppercase; letter-spacing: .11em; font-size: 12px; font-weight: 800; color: #7C5F1E; }
h1 { max-width: 850px; margin: 0; font-family: Georgia, serif; font-size: clamp(38px, 6vw, 76px); line-height: .94; letter-spacing: -.05em; }
h2 { margin: 0; font-family: Georgia, serif; font-size: 27px; line-height: 1.02; letter-spacing: -.035em; }
.header-copy { max-width: 760px; color: #4E5D61; font-size: 17px; line-height: 1.55; }
.status-card { border: 1px solid var(--line); border-radius: 22px; padding: 18px; background: rgba(255,252,245,.72); backdrop-filter: blur(16px); box-shadow: 0 14px 40px rgba(32,56,66,.10); display: grid; gap: 4px; }
.status-card span:last-child { color: var(--muted); font-size: 13px; line-height: 1.35; }
.status-dot { width: 10px; height: 10px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 0 6px rgba(223,165,54,.18); }
.screen-switcher { max-width: 1440px; margin: 0 auto 22px; display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.screen-switcher button { min-height: 44px; white-space: nowrap; border: 1px solid var(--line); border-radius: 999px; background: rgba(255,252,245,.68); color: var(--deep); padding: 0 15px; cursor: pointer; }
.screen-switcher button.active { background: var(--deep); color: #fff; border-color: var(--deep); }
.screen-grid { max-width: 1440px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 22px; align-items: start; }
.screen-grid.single { grid-template-columns: minmax(330px, 390px); justify-content: center; }
.phone-card { min-width: 0; }
.phone-label { display: flex; justify-content: space-between; align-items: center; padding: 0 6px 8px; color: #31454C; font-weight: 800; }
.phone-label small { color: var(--muted); font-weight: 600; }
.screen { width: min(100%, 390px); height: 844px; margin: 0 auto; overflow: hidden; position: relative; border: 1px solid rgba(23,33,38,.18); border-radius: 34px; background: var(--surface); box-shadow: var(--shadow); }
.top-bar { height: 44px; display: flex; justify-content: space-between; align-items: center; padding: 0 22px; font-weight: 800; font-size: 13px; background: rgba(255,252,245,.86); }
.top-icons { display: flex; gap: 5px; align-items: center; }
.top-icons span { display: block; width: 14px; height: 8px; border-radius: 2px; border: 1.5px solid var(--ink); }
.top-icons span:first-child { width: 4px; height: 10px; border-radius: 999px; background: var(--ink); }
.top-icons span:nth-child(2) { width: 12px; height: 12px; border-radius: 50%; }
.screen-content { height: calc(100% - 44px); position: relative; padding: calc(18px * var(--density)); }
.map-page { padding: 0; background: var(--map-tint); }
.map-toolbar { position: absolute; z-index: 3; top: 16px; left: 16px; right: 16px; min-height: 66px; border-radius: 22px; padding: 12px 12px 12px 15px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,252,245,.82); backdrop-filter: blur(18px); border: 1px solid rgba(255,255,255,.55); box-shadow: 0 12px 32px rgba(32,56,66,.10); }
.icon-button, .filter-chip { min-width: 48px; min-height: 44px; border: 0; border-radius: 16px; background: var(--deep); color: #fff; font-weight: 900; }
.map-canvas { position: absolute; inset: 0; background: linear-gradient(160deg, var(--map-tint), #EEF0E5 58%, #DAD7CA); overflow: hidden; }
.map-canvas:after { content: ""; position: absolute; inset: 0; background-image: radial-gradient(rgba(23,33,38,.13) 1px, transparent 1px); background-size: 18px 18px; opacity: .24; }
.street-map { position: absolute; inset: 0; width: 100%; height: 100%; fill: none; stroke: rgba(255,252,245,.88); stroke-width: 17; stroke-linecap: round; filter: drop-shadow(0 1px 0 rgba(23,33,38,.12)); }
.zone-chip { position: absolute; z-index: 2; min-width: 44px; min-height: 44px; transform: translate(-50%, -50%) rotate(-8deg); border: 2px solid rgba(23,33,38,.45); border-radius: 999px 999px 999px 18px; display: grid; place-items: center; align-content: center; color: #172126; box-shadow: 0 10px 20px rgba(23,33,38,.20); cursor: pointer; }
.zone-chip span { font-size: 16px; font-weight: 950; line-height: 1; }
.zone-chip small { font-size: 11px; font-weight: 800; }
.zone-chip.aging { opacity: .62; }
.zone-chip.none { opacity: .75; border-style: dashed; }
.zone-chip.selected { outline: 4px solid rgba(255,252,245,.84); }
.coverage-note { position: absolute; z-index: 1; right: 18px; bottom: 226px; color: rgba(23,33,38,.56); font-size: 12px; font-weight: 800; transform: rotate(-8deg); }
.leaving-fab, .leaving-bottom { position: absolute; z-index: 4; left: 28px; right: 28px; bottom: 198px; min-height: 54px; border: 0; border-radius: 20px; background: var(--deep); color: #fff; font-weight: 900; box-shadow: 0 16px 40px rgba(32,56,66,.24); }
.peek-sheet, .bottom-sheet { position: absolute; z-index: 5; left: 0; right: 0; bottom: 0; background: rgba(255,252,245,.94); border-radius: 30px 30px 0 0; padding: 10px 16px 24px; box-shadow: 0 -18px 44px rgba(32,56,66,.16); }
.peek-sheet { min-height: 184px; }
.bottom-sheet.full { min-height: 460px; }
.grabber { width: 46px; height: 5px; border-radius: 999px; background: rgba(23,33,38,.18); margin: 0 auto 14px; }
.sheet-head { display: flex; justify-content: space-between; color: var(--muted); margin-bottom: 8px; }
.sheet-head strong { color: var(--ink); }
.zone-row { width: 100%; min-height: 66px; display: grid; grid-template-columns: 15px 1fr auto; gap: 10px; align-items: center; text-align: left; border: 0; border-bottom: 1px solid var(--line); background: transparent; padding: 8px 0; color: var(--ink); }
.zone-row.compact { min-height: 48px; }
.mini-swatch { width: 15px; height: 36px; border-radius: 999px; border: 1px solid rgba(23,33,38,.18); }
.row-main, .row-meta { display: grid; gap: 3px; }
.row-main small, .row-meta small { color: var(--muted); font-size: 12px; line-height: 1.25; }
.row-meta { text-align: right; }
.detail-title { display: flex; justify-content: space-between; align-items: start; gap: 14px; }
.score-pill { min-width: 76px; height: 76px; border-radius: 22px; display: grid; place-items: center; font-size: 26px; font-weight: 950; border: 2px solid rgba(23,33,38,.28); }
.trust-copy { color: #46575C; line-height: 1.45; margin: 12px 0; }
.facts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.fact, .explain-box, .price-card, .account-section { border: 1px solid var(--line); border-radius: 18px; padding: 12px; background: #fff8ec; }
.fact span { display:block; color: var(--muted); font-size: 12px; margin-bottom: 3px; }
.explain-box { margin: 10px 0; display: grid; gap: 4px; color: #46575C; line-height: 1.35; }
.report-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.primary, .secondary, .wide-button, .ghost, .back-button { min-height: 48px; border-radius: 16px; padding: 0 16px; font-weight: 900; cursor: pointer; }
.primary { border: 0; background: var(--deep); color: #fff; }
.secondary, .wide-button, .back-button { border: 1px solid var(--line); background: #fffaf0; color: var(--deep); }
.ghost { border: 0; background: transparent; color: var(--deep); }
.wide, .wide-button { width: 100%; }
.list-page, .billing-page, .account-page { background: var(--surface); overflow: auto; padding-bottom: 96px; }
.list-head { position: static; margin-bottom: 12px; }
.error-banner { border-radius: 16px; background: var(--danger-soft); color: #69462E; padding: 12px; font-size: 13px; font-weight: 800; margin-bottom: 10px; }
.zone-list { border-top: 1px solid var(--line); }
.leaving-bottom { bottom: 24px; }
.check-page, .consent-page { padding: 0; background: var(--map-tint); }
.overlay-panel, .consent-card { position: absolute; z-index: 7; left: 18px; right: 18px; bottom: 24px; border-radius: 28px; padding: 18px; background: rgba(255,252,245,.95); box-shadow: var(--shadow); border: 1px solid rgba(255,255,255,.7); }
.pulse-ring { width: 82px; height: 82px; border-radius: 50%; background: rgba(223,165,54,.18); display: grid; place-items: center; margin-bottom: 14px; }
.pulse-ring span { width: 46px; height: 46px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 12px rgba(223,165,54,.18); }
.overlay-panel p, .consent-card p, .billing-copy, .fine-print, .account-section p { color: #536368; line-height: 1.45; }
.progress-wrap { height: 10px; border-radius: 999px; overflow: hidden; background: rgba(32,56,66,.14); margin: 14px 0 9px; }
.progress-wrap span { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
.timer-row { display: flex; justify-content: space-between; color: var(--muted); font-size: 13px; margin-bottom: 14px; }
.timer-row strong { color: var(--ink); }
.consent-card ul { padding-left: 20px; color: #46575C; line-height: 1.5; }
.billing-page { display: flex; flex-direction: column; gap: 14px; }
.back-button { width: max-content; }
.price-card { display: grid; gap: 4px; }
.price-card strong { font-family: Georgia, serif; font-size: 58px; letter-spacing: -.05em; }
.price-card small { color: var(--muted); }
.included-list { display: grid; gap: 10px; color: #31454C; font-weight: 800; }
.fine-print { font-size: 12px; }
.account-page { display: flex; flex-direction: column; gap: 14px; }
.avatar-mark { width: 66px; height: 66px; border-radius: 24px; background: var(--deep); color: var(--accent); display: grid; place-items: center; font-family: Georgia, serif; font-size: 35px; font-weight: 900; }
.subscription-row, .settings-row { min-height: 48px; display: flex; justify-content: space-between; align-items: center; width: 100%; border: 0; border-top: 1px solid var(--line); background: transparent; padding: 12px 0; color: var(--ink); }
.subscription-row em { color: #7C5F1E; font-style: normal; font-weight: 900; }
.settings-row span { color: var(--muted); }
.muted-section { background: #F0E7D8; }
@media (max-width: 760px) {
  .board-header { grid-template-columns: 1fr; }
  .status-card { max-width: 390px; }
  .screen-grid { grid-template-columns: 1fr; }
  .screen { border-radius: 26px; }
}
@media (prefers-reduced-motion: no-preference) {
  .phone-card { animation: rise .5s ease both; }
  .phone-card:nth-child(2) { animation-delay: .04s; }
  .phone-card:nth-child(3) { animation-delay: .08s; }
  .pulse-ring { animation: breathe 1.6s ease-in-out infinite; }
  @keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes breathe { 50% { transform: scale(1.05); } }
}
`;

ReactDOM.createRoot(document.getElementById('root')).render(<App />);