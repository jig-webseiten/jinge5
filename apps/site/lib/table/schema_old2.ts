// apps/site/lib/table/schema.ts

export type TableSchema = {
  /** Roh-Keys (PA-API, Heuristiken, Übersetzungen) => kanonische Keys (ascii, lower) */
  keyAliases: Record<string, string>;

  /** Kanonische Keys, die überhaupt in die Tabelle dürfen */
  allowKeys: readonly string[];

  /** Default-Labels (z. B. für DE); i18n optional */
  labels: {
    de: Record<string, string>;
    i18n?: Record<string, Record<string, string>>; // { en: { weight: "Weight" }, ... }
  };

  /** Priorisierung: baseline + keyword-basierte boosts */
  priority: {
    buyerCore: readonly string[];
    boosts: Record<string, readonly string[]>;
  };

  /** Physische Standard-Keys (übergreifend sinnvoll) */
  physicalSpec: readonly { key: string; priority: number }[];

  /** Leitplanken/Limits */
  limits: {
    maxColumns: number; // exkl. "Modell"
    maxCellChars: number; // UX: Zellen kürzen
  };

  /** Policy: Gewicht nur echtes Produktgewicht (nie Verpackung) */
  policies: {
    weight: {
      canonicalKey: "weight";
      // Keys, die NIEMALS auf weight gemappt werden dürfen:
      forbiddenSourceKeys: readonly string[]; // e.g. packageweight
    };
  };
};

/** ======== Deklaratives Schema (site-agnostisch) ======== */
export const TABLE_SCHEMA: TableSchema = {
keyAliases: {
  // --- meta ---
  brand: "brand",
  marke: "brand",
  title: "title",
  titel: "title",

  // --- weight (NUR echtes Produktgewicht) ---
  weight: "weight",
  gewicht: "weight",
  itemweight: "weight",
  productweight: "weight",
  // NICHT mappen:
  packageweight: "packageweight",
  shippingweight: "shippingweight",

  // --- dimensions ---
  dimensions: "dimensions",
  dimensionen: "dimensions",
  abmessungen: "dimensions",
  groesse: "dimensions",
  größe: "dimensions",
  masse: "dimensions",
  maß: "dimensions",

  // --- material ---
  material: "material",
  materialtype: "material",
  materials: "material",

  // --- color ---
  farbe: "farbe",
  color: "farbe",
  colours: "farbe",
  colors: "farbe",

  // --- quantity ---
  menge: "menge",
  quantity: "menge",
  packagequantity: "menge",
  anzahl: "anzahl",
  count: "anzahl",
  pcs: "anzahl",

  // --- power supply / cut width ---
  energieversorgung: "energieversorgung",
  akku: "energieversorgung",
  batterie: "energieversorgung",
  battery: "energieversorgung",
  powersource: "energieversorgung",
  stromversorgung: "energieversorgung",
  netzanschluss: "energieversorgung",
  solar: "energieversorgung",

  schnittbreite: "schnittbreite",
  cutwidth: "schnittbreite",
  cut_width: "schnittbreite",

  // --- usp/features ---
  usp: "besonderheit",
  besonderheit: "besonderheit",
  specialfeatures: "besonderheit",
  features: "besonderheit",

  // --- devices/pumps etc. (optional) ---
  spannung: "spannung",
  voltage: "spannung",
  leistung: "leistung",
  power: "leistung",
  powerwatts: "leistung",
  druck: "druck",
  pressurebar: "druck",
  durchfluss: "durchfluss",
  flowratelh: "durchfluss",
  anschluss: "anschluss",

  // --- furniture ---
  sitzplaetze: "sitzplaetze",
  sitzplätze: "sitzplaetze",
  seats: "sitzplaetze",
  traglast: "traglast",
  maxload: "traglast",

  // --- seeds (optional) ---
  aussaat: "aussaat",
  bluetezeit: "bluetezeit",
  blütezeit: "bluetezeit",
  keimung: "keimung",
  bio: "bio",

  // --- camping: shelter / sleep ---
  personen: "personen",
  personenzahl: "personen",
  schlafplaetze: "personen",
  sleepingcapacity: "personen",

  saison: "saison",
  season: "saison",
  jahreszeit: "saison",

  wassersaeule: "wassersaeule_aussenzelt", // default -> Außenzelt, falls nicht spezifiziert
  wassersäule: "wassersaeule_aussenzelt",
  wassersaeuleaussenzelt: "wassersaeule_aussenzelt",
  rainfly: "wassersaeule_aussenzelt",

  bodenwassersaeule: "wassersaeule_boden",
  bodenwassersäule: "wassersaeule_boden",
  wassersaeuleboden: "wassersaeule_boden",
  floor: "wassersaeule_boden",

  packmass: "packmass",
  packmaß: "packmass",
  packedsize: "packmass",
  packsize: "packmass",

  aufbau: "aufbauart",
  aufbauart: "aufbauart",
  aufblasbar: "aufbauart",
  inflatable: "aufbauart",
  popup: "aufbauart",
  "pop-up": "aufbauart",
  wurfzelt: "aufbauart",

  zelttyp: "zelttyp",
  kuppelzelt: "zelttyp",
  tunnelzelt: "zelttyp",
  dachzelt: "zelttyp",
  buszelt: "zelttyp",
  vorzelt: "zelttyp",
  tarp: "zelttyp",

  freistehend: "freistehend",
  freestanding: "freistehend",

  komfort: "komforttemperatur",
  komforttemperatur: "komforttemperatur",
  comfort: "komforttemperatur",

  limit: "limittemperatur",
  limittemperatur: "limittemperatur",

  fuellung: "fuellung",
  füllung: "fuellung",
  fuellmaterial: "fuellung",
  daune: "fuellung",
  kunstfaser: "fuellung",
  fill: "fuellung",
  down: "fuellung",
  synthetic: "fuellung",

  schlafsackform: "schlafsackform",
  mumie: "schlafsackform",
  mummy: "schlafsackform",
  deckenschlafsack: "schlafsackform",
  decke: "schlafsackform",
  doppelschlafsack: "schlafsackform",

  rwert: "r_wert",
  "r-wert": "r_wert",
  rvalue: "r_wert",
  "r-value": "r_wert",

  dicke: "dicke",
  thickness: "dicke",

  // --- camping: furniture ---
  sitzhoehe: "sitzhoehe",
  sitzhöhe: "sitzhoehe",

  // --- camping: cooking ---
  brennstoff: "brennstoff",
  fuel: "brennstoff",
  gas: "brennstoff",
  kartusche: "brennstoff",
  butan: "brennstoff",
  propan: "brennstoff",
  holzkohle: "brennstoff",
  charcoal: "brennstoff",

  brenner: "brenneranzahl",
  burners: "brenneranzahl",
  flammen: "brenneranzahl",
  zweiflammig: "brenneranzahl",
  mehrflammig: "brenneranzahl",

  zuendung: "zuendung",
  zündung: "zuendung",
  piezo: "zuendung",
  piezozuendung: "zuendung",
  piezozündung: "zuendung",

  // --- camping: cooling / power ---
  kuehlbox: "kuehlbox_typ",
  kühlbox: "kuehlbox_typ",
  kuehlbox_typ: "kuehlbox_typ",
  kompressor: "kuehlbox_typ",
  compressor: "kuehlbox_typ",
  passiv: "kuehlbox_typ",
  thermo: "kuehlbox_typ",
  elektrisch: "kuehlbox_typ",
  "12v": "kuehlbox_typ",

  volumen: "volumen",
  inhalt: "volumen",
  liter: "volumen",
  capacity: "volumen",

  kapazitaet: "kapazitaet_wh",
  kapazität: "kapazitaet_wh",
  kapazitaetwh: "kapazitaet_wh",
  capacitywh: "kapazitaet_wh",
  wh: "kapazitaet_wh",
  energie: "kapazitaet_wh",

  // --- camping: light ---
  helligkeit: "helligkeit_lm",
  lumen: "helligkeit_lm",
  lm: "helligkeit_lm",
  brightness: "helligkeit_lm",

  laufzeit: "laufzeit_h",
  runtime: "laufzeit_h",
  stunden: "laufzeit_h",

  schutzart: "schutzart_ip",
  ip: "schutzart_ip",
  ipx: "schutzart_ip",

  // --- camping: water / hygiene ---
  tankvolumen: "tankvolumen_l",
  wassertank: "tankvolumen_l",
  kanister: "tankvolumen_l",
  tank: "tankvolumen_l",

  toilettentyp: "toilettentyp",
  campingtoilette: "toilettentyp",
  trenntoilette: "toilettentyp",
  chemietoilette: "toilettentyp",
  chemical: "toilettentyp",
  separating: "toilettentyp",

  spuelung: "spuelung",
  spülung: "spuelung",
  flush: "spuelung",

  schlauchlaenge: "schlauchlaenge_m",
  schlauchlänge: "schlauchlaenge_m",
  hose: "schlauchlaenge_m",

  mikron: "porengroesse_um",
  "µm": "porengroesse_um",
  poren: "porengroesse_um",
  pores: "porengroesse_um",

  // =========================
  // baby/kids
  // =========================

  // --- age ---
  age: "age_min_months",
  agerange: "age_min_months",
  age_range: "age_min_months",
  alter: "age_min_months",
  altersempfehlung: "age_min_months",
  recommendedage: "age_min_months",
  recommended_age: "age_min_months",
  agefrom: "age_min_months",
  ab: "age_min_months",

  agemax: "age_max_months",
  ageto: "age_max_months",
  bis: "age_max_months",

  months: "age_min_months",
  monate: "age_min_months",
  years: "age_min_months",
  jahre: "age_min_months",

  // --- food-contact / safety ---
  bpafree: "bpa_free",
  bpa_free: "bpa_free",
  bpa: "bpa_free",
  lfgb: "bpa_free",
  foodgrade: "bpa_free",
  lebensmittelecht: "bpa_free",

  dishwashersafe: "dishwasher_safe",
  dishwasher_safe: "dishwasher_safe",
  spuelmaschinenfest: "dishwasher_safe",
  spülmaschinenfest: "dishwasher_safe",

  // --- set size ---
  set: "set_size",
  setsize: "set_size",
  set_size: "set_size",
  pieces: "set_size",
  teile: "set_size",
  anzahlteile: "set_size",

  // --- power (baby/kids electronics) ---
  power_source: "power_source",
  powersupply: "power_source",
  mains: "power_source",
  netzbetrieb: "power_source",
  usb: "power_source",
  usbc: "power_source",
  "usb-c": "power_source",

  batterytype: "battery_type",
  battery_type: "battery_type",
  batterietyp: "battery_type",
  aa: "battery_type",
  aaa: "battery_type",
  buttoncell: "battery_type",
  coin_cell: "battery_type",

  // --- sound/light ---
  sound: "sound",
  soundmode: "sound",
  musik: "sound",
  melodien: "sound",
  soundbuch: "sound",

  light: "light_mode",
  lightmode: "light_mode",
  nachtlicht: "light_mode",
  projektor: "light_mode",
  sternenprojektor: "light_mode",
  dimmbar: "light_mode",
  farbwechsel: "light_mode",

  // --- mounting / installation ---
  mounting: "mounting_type",
  mountingtype: "mounting_type",
  befestigung: "mounting_type",
  befestigungsart: "mounting_type",
  klemme: "mounting_type",
  klemm: "mounting_type",
  haken: "mounting_type",
  aufhaengen: "mounting_type",
  aufhängen: "mounting_type",
  kleben: "mounting_type",
  saugnapf: "mounting_type",
  magnet: "mounting_type",

  installation: "mounting_method",
  installmethod: "mounting_method",
  montage: "mounting_method",
  klemmmontage: "mounting_method",
  druckmontage: "mounting_method",
  schraubmontage: "mounting_method",
  bohren: "mounting_method",
  ohnebohren: "mounting_method",

  // --- gates dimensions ---
  widthmin: "gate_width_min_cm",
  minwidth: "gate_width_min_cm",
  min_width: "gate_width_min_cm",
  minbreite: "gate_width_min_cm",

  widthmax: "gate_width_max_cm",
  maxwidth: "gate_width_max_cm",
  max_width: "gate_width_max_cm",
  maxbreite: "gate_width_max_cm",

  gateheight: "gate_height_cm",
  height: "gate_height_cm",
  hoehe: "gate_height_cm",
  höhe: "gate_height_cm",

  // --- car seats ---
  group: "car_seat_group",
  carseatgroup: "car_seat_group",
  kindersitzgruppe: "car_seat_group",
  i_size: "car_seat_group",
  isize: "car_seat_group",

  rear_facing: "rear_facing",
  reboard: "rear_facing",
  reboarder: "rear_facing",
  rueckwaerts: "rear_facing",
  rückwärts: "rear_facing",

  isofix: "isofix",
  top_tether: "isofix",
  latch: "isofix",

  // --- feeding capacity ---
  capacity_ml: "capacity_ml",
  capacityml: "capacity_ml",
  ml: "capacity_ml",
  fuellmenge: "capacity_ml",
  füllmenge: "capacity_ml",
  volumeml: "capacity_ml",

  insulated: "insulated",
  isoliert: "insulated",

  // --- sleep/textile ---
  tog: "tog_rating",
  tog_rating: "tog_rating",
  togwirt: "tog_rating", // toleranter Typo-Fänger

  washable: "washable",
  waschbar: "washable",
  machinewashable: "washable",
  maschinenwaschbar: "washable",

  textile: "textile_material",
  textilematerial: "textile_material",
  stoff: "textile_material",
  baumwolle: "textile_material",
  cotton: "textile_material",
  silikon: "textile_material",
  silicone: "textile_material",
  holz: "material",
  wood: "material",
  
  // =========================
	// pets (dogs/cats/small animals/birds/terrarium)
	// =========================

	// --- size ---
	size: "groesse",
	groesse: "groesse",
	größe: "groesse",
	petsize: "groesse",
	harnesssize: "groesse",
	collarsize: "groesse",

	// --- length (leash/collar) ---
	laenge: "laenge_cm",
	länge: "laenge_cm",
	length: "laenge_cm",
	leashlength: "laenge_cm",
	collarlength: "laenge_cm",
	girth: "laenge_cm",
	umfang: "laenge_cm",
	neck: "laenge_cm",
	// =========================
	// hobbyfarmer / self-supply
	// =========================

	// --- tool construction ---
	stielmaterial: "stielmaterial",
	griffmaterial: "stielmaterial",
	handlematerial: "stielmaterial",
	holzstiel: "stielmaterial",
	fiberglasstiel: "stielmaterial",
	metallstiel: "stielmaterial",

	kopfmaterial: "kopfmaterial",
	blattmaterial: "kopfmaterial",
	klingenmaterial: "kopfmaterial",
	edelstahlkopf: "kopfmaterial",
	stahlkopf: "kopfmaterial",

	arbeitsbreite: "arbeitsbreite_cm",
	arbeitsbreitecm: "arbeitsbreite_cm",
	workingwidth: "arbeitsbreite_cm",
	breite: "arbeitsbreite_cm",

	klingenlaenge: "klingenlaenge_cm",
	klingenlänge: "klingenlaenge_cm",
	bladelen: "klingenlaenge_cm",
	bladlength: "klingenlaenge_cm",

	// --- irrigation / water ---
	rohrdurchmesser: "rohrdurchmesser_mm",
	rohrdurchmessermm: "rohrdurchmesser_mm",
	pipediameter: "rohrdurchmesser_mm",
	pe16: "rohrdurchmesser_mm",
	pe20: "rohrdurchmesser_mm",
	pe25: "rohrdurchmesser_mm",

	gewinde: "gewinde",
	thread: "gewinde",
	anschlussgewinde: "gewinde",

	filterfeinheit: "filterfeinheit_um",
	filtermicron: "filterfeinheit_um",
	filtersize: "filterfeinheit_um",

	// --- electric fence ---
	impulsenergie: "impulsenergie_j",
	joule: "impulsenergie_j",
	outputenergy: "impulsenergie_j",

	zaunlaenge: "zaunlaenge_km",
	fencelength: "zaunlaenge_km",
	reichweite: "zaunlaenge_km",

	ausgangsspannung: "ausgangsspannung_v",
	outputvoltage: "ausgangsspannung_v",

	// --- livestock ---
	tierart: "tierart",
	animaltype: "tierart",

	fassungsvermoegen: "fassungsvermoegen_l",
	fassungsvermoegenl: "fassungsvermoegen_l",
	capacity_l: "fassungsvermoegen_l",

	automatik: "automatik",
	automatic: "automatik",

	// --- processing / preservation ---
	temperaturbereich: "temperaturbereich_c",
	temperature_range: "temperaturbereich_c",


  // =========================
  // party / events
  // =========================

  // --- occasion / theme ---
  anlass: "occasion",
  occasion: "occasion",
  event: "occasion",
  eventtype: "occasion",
  feier: "occasion",

  thema: "theme",
  theme: "theme",
  motto: "theme",
  motiv: "theme",
  design: "theme",

  // --- set size / pieces ---
  set: "set_size",
  setsize: "set_size",
  set_size: "set_size",
  teile: "set_size",
  pieces: "set_size",
  anzahlteile: "set_size",
  packungsinhalt: "set_size",
  inhalt: "set_size", // (party-spezifisch sinnvoll; wenn du "inhalt" global schon als volumen nutzt, dann diese Zeile weglassen)

  // --- personalization ---
  gravur: "personalization",
  graviert: "personalization",
  personalisiert: "personalization",
  personalization: "personalization",
  engraving: "personalization",
  wunschtext: "personalization",

  // --- reusable ---
  wiederverwendbar: "reusable",
  reusable: "reusable",
  mehrweg: "reusable",

  // --- size (clothing / wearables / props) ---
  size: "size",
  konfektionsgroesse: "size",
  konfektionsgröße: "size",
  one_size: "size",

  // --- lights / power (party LEDs, Lichterketten, Projektor etc.) ---
  power_source: "power_source",
  powersource: "power_source",
  stromversorgung: "power_source",
  netzbetrieb: "power_source",
  usb: "power_source",
  usbc: "power_source",
  "usb-c": "power_source",

  battery_type: "battery_type",
  batterietyp: "battery_type",
  batterytype: "battery_type",

  led: "light_mode",
  lichterkette: "light_mode",
  rgb: "light_mode",
  warmweiss: "light_mode",
  warmweiß: "light_mode",
  dimmbar: "light_mode",

  // --- capacity for drinkware (ml) ---
  capacity_ml: "capacity_ml",
  volumeml: "capacity_ml",
  füllmenge: "capacity_ml",
  fuellmenge: "capacity_ml",
  ml: "capacity_ml",

  // --- insulated (thermo) ---
  insulated: "insulated",
  isoliert: "insulated",
  thermo: "insulated",
  
    // =========================
  // cleaning / organization
  // =========================

  // --- type/category (optional but useful for grouping) ---
  category: "category",
  kategorie: "category",
  typ: "category",
  producttype: "category",

  // --- use-case / surface ---
  surface: "surface",
  oberflaeche: "surface",
  oberfläche: "surface",
  anwendung: "surface",
  einsatzbereich: "surface",

  // --- volume / capacity (liquids, bins, tanks) ---
  volumen: "volumen",
  volume: "volumen",
  liter: "volumen",
  l: "volumen",
  capacity: "volumen",

  capacity_ml: "capacity_ml",
  volumeml: "capacity_ml",
  ml: "capacity_ml",
  fuellmenge: "capacity_ml",
  füllmenge: "capacity_ml",

  // --- compatible / accessories ---
  kompatibel: "compatible_with",
  kompatibilitaet: "compatible_with",
  kompatibilität: "compatible_with",
  compatible: "compatible_with",
  compatiblewith: "compatible_with",
  passendfuer: "compatible_with",
  passendfür: "compatible_with",

  // --- filter (air purifier, vacuum, robot) ---
  filter: "filter_type",
  filtertyp: "filter_type",
  filter_type: "filter_type",
  hepa: "filter_type",
  "hepa-filter": "filter_type",

  // --- noise ---
  lautstaerke: "noise_db",
  lautstärke: "noise_db",
  noise: "noise_db",
  geraeusch: "noise_db",
  geräusch: "noise_db",
  db: "noise_db",
  "db(a)": "noise_db",

  // --- runtime (robots, cordless, air devices) ---
  laufzeit: "runtime_min",
  runtime: "runtime_min",
  minuten: "runtime_min",
  min: "runtime_min",

  // --- suction (vacuums) ---
  saugleistung: "suction_pa",
  suction: "suction_pa",
  suctionpower: "suction_pa",
  pa: "suction_pa",

  // --- cord / radius ---
  kabellaenge: "cable_length_m",
  kabellänge: "cable_length_m",
  cablelength: "cable_length_m",
  cable_length: "cable_length_m",
  m: "cable_length_m", // wenn das bei dir zu aggressiv ist: diese Zeile löschen

  // --- stackable / airtight (storage) ---
  stapelbar: "stackable",
  stackable: "stackable",
  luftdicht: "airtight",
  airtight: "airtight",

  // --- sensor (bins, devices) ---
  sensor: "sensor",
  sensorgesteuert: "sensor",
  beruehrungslos: "sensor",
  berührungslos: "sensor",

  // =========================
  // auto accessories
  // =========================

  // --- camera / dashcam ---
  dashcam: "device_type",
  rueckfahrkamera: "device_type",
  rückfahrkamera: "device_type",
  innenraumkamera: "device_type",
  frontkamera: "device_type",
  360: "device_type",
  "360-grad": "device_type",
  ueberwachungskamera: "device_type",
  überwachungskamera: "device_type",

  aufloesung: "video_resolution",
  auflösung: "video_resolution",
  resolution: "video_resolution",
  "4k": "video_resolution",
  "2k": "video_resolution",
  "1080p": "video_resolution",
  "1440p": "video_resolution",

  dual: "camera_channels",
  dualkamera: "camera_channels",
  frontundheck: "camera_channels",
  channels: "camera_channels",
  kanal: "camera_channels",

  gps: "gps",
  gpsmodul: "gps",
  gps_tracker: "gps",

  wlan: "wifi",
  wifi: "wifi",
  app: "app_control",
  appsteuerung: "app_control",
  bluetooth: "bluetooth",

  parkmodus: "parking_mode",
  parkingmode: "parking_mode",
  nachtsicht: "night_vision",
  nightvision: "night_vision",

  display: "display_size_in",
  monitor: "display_size_in",
  zoll: "display_size_in",
  inch: "display_size_in",
  displaysize: "display_size_in",

  speicher: "storage_gb",
  speicherkarte: "storage_gb",
  sd: "storage_gb",
  microsd: "storage_gb",
  gb: "storage_gb",

  // --- OBD / diagnostics ---
  obd: "obd",
  obd2: "obd",
  diagnose: "obd",
  diagnosetool: "obd",
  fehlerspeicher: "obd_functions",
  dtc: "obd_functions",
  reset: "obd_functions",
  "servicere:set": "obd_functions", // toleranter typo-fänger
 // toleranter typo-fänger

  // --- TPMS / tire ---
  tpms: "tpms",
  reifendruck: "tpms",
  reifendruckkontrolle: "tpms",
  sensor: "sensor", // bereits vorhanden global; hier ok als alias
  frequenz: "tpms_frequency_mhz",
  mhz: "tpms_frequency_mhz",

  // --- security ---
  alarmanlage: "security_type",
  wegfahrsperre: "security_type",
  lenkradsperre: "security_type",
  pedalsperre: "security_type",
  radkralle: "security_type",
  faraday: "security_type",
  keyless: "security_type",
  blocker: "security_type",
  obdsperre: "security_type",
  obdportschloss: "security_type",

  // --- power / charging / inverter ---
  wechselrichter: "inverter",
  spannungswandler: "inverter",
  inverter: "inverter",
  "12v": "input_voltage_v",
  "24v": "input_voltage_v",
  "230v": "output_voltage_v",

  ausgangsleistung: "output_power_w",
  leistungw: "output_power_w",
  outputpower: "output_power_w",
  peak: "peak_power_w",
  spitzenleistung: "peak_power_w",

  usbports: "usb_ports",
  usb: "usb_ports",
  steckdosen: "ac_outlets",
  ac: "ac_outlets",

  // --- jump starter / battery ---
  starthilfe: "jump_starter",
  booster: "jump_starter",
  startstrom: "jump_current_a",
  startcurrent: "jump_current_a",
  kapazitaet: "capacity_mah", // nur wenn eindeutig (Powerbank/Starthilfe) – sonst leer lassen
  mah: "capacity_mah",
  wh: "kapazitaet_wh", // existiert bereits global
  ladeleistung: "charge_power_w",
  ladestrom: "charge_current_a",
  ladegeraet: "charger_type",
  ladegerät: "charger_type",

  // --- compressor / pressure ---
  kompressor: "compressor",
  luftkompressor: "compressor",
  reifenfueller: "compressor",
  reifenfüller: "compressor",
  maxdruck: "druck",
  bar: "druck",

  // --- towing / roof / carriers ---
  dachbox: "roof_cargo",
  dachtraeger: "roof_cargo",
  dachträger: "roof_cargo",
  grundtraeger: "roof_cargo",
  grundträger: "roof_cargo",
  fahrradtraeger: "roof_cargo",
  fahrradträger: "roof_cargo",
  hecktraeger: "roof_cargo",
  heckträger: "roof_cargo",
  skihalter: "roof_cargo",
  dachzelt: "roof_cargo",
  markise: "roof_cargo",

  traglast: "traglast", // existiert global
  zuladung: "traglast",

  // --- mats / covers / fit ---
  passform: "vehicle_fit",
  fahrzeugspezifisch: "vehicle_fit",
  modell: "vehicle_fit",
  universal: "vehicle_fit",

  set: "set_size", // existiert global
  setsize: "set_size",

  // --- EV charging ---
  wallbox: "ev_charger",
  ladekabel: "ev_connector_type",
  typ2: "ev_connector_type",
  "type-2": "ev_connector_type",
  ccs: "ev_connector_type",
  schuko: "ev_connector_type",
  cee: "ev_connector_type",
  rfid: "rfid",
  mid: "mid_meter",
  lastmanagement: "load_management",
  appwallbox: "app_control",
  kw: "charging_power_kw",

  // --- lighting (auto) ---
  led: "light_type",
  xenon: "light_type",
  farbtemperatur: "color_temp_k",
  kelvin: "color_temp_k",

  // --- audio ---
  endstufe: "audio_type",
  subwoofer: "audio_type",
  lautsprecher: "audio_type",
  rms: "audio_rms_w",
  impedanz: "impedance_ohm",
  ohm: "impedance_ohm",

  // =========================
  // fashion / apparel
  // =========================

  // --- product meta / grouping ---
  kategorie: "product_type",
  producttype: "product_type",
  typ: "product_type",

  damen: "gender",
  herren: "gender",
  kinder: "age_group",
  women: "gender",
  men: "gender",
  unisex: "gender",
  kids: "age_group",

  // --- sizing ---
  groesse: "size",
  größe: "size",
  size: "size",
  konfektionsgroesse: "size",
  konfektionsgröße: "size",
  eu: "size_system",
  us: "size_system",
  uk: "size_system",

  schuhgroesse: "shoe_size",
  schuhgröße: "shoe_size",
  shoesize: "shoe_size",
  weite: "shoe_width",
  shoe_width: "shoe_width",

  // --- fit / cut ---
  passform: "fit",
  fit: "fit",
  slim: "fit",
  regular: "fit",
  oversized: "fit",
  oversize: "fit",

  bundhoehe: "waist_rise",
  bundhöhe: "waist_rise",
  highwaist: "waist_rise",
  high_waist: "waist_rise",
  lowwaist: "waist_rise",
  midwaist: "waist_rise",

  beinform: "leg_fit",
  straight: "leg_fit",
  wideleg: "leg_fit",
  "wide-leg": "leg_fit",
  skinny: "leg_fit",
  mom: "leg_fit",
  cargo: "leg_fit",

  // --- color / material already exist globally ---
  farbe: "farbe",
  color: "farbe",
  material: "material",
  stoff: "material",
  obermaterial: "upper_material",
  lining: "lining",
  futter: "lining",

  // --- fabric properties ---
  stretch: "stretch",
  elastisch: "stretch",
  elasthan: "stretch",
  atmungsaktiv: "breathability",
  breathability: "breathability",
  wasserdicht: "waterproof",
  waterproof: "waterproof",
  winddicht: "windproof",
  windproof: "windproof",
  isolierung: "insulation",
  insulation: "insulation",

  // --- garment details ---
  aermellaenge: "sleeve_length",
  ärmellänge: "sleeve_length",
  sleeve: "sleeve_length",
  kurzarm: "sleeve_length",
  langarm: "sleeve_length",
  tanktop: "sleeve_length",

  ausschnitt: "neckline",
  neckline: "neckline",
  v_ausschnitt: "neckline",
  rundhals: "neckline",
  rollkragen: "neckline",
  hood: "hood",
  kapuze: "hood",

  verschluss: "closure",
  verschlussart: "closure",
  closure: "closure",
  zipper: "closure",
  reissverschluss: "closure",
  reißverschluss: "closure",
  knopf: "closure",
  button: "closure",
  schnuerung: "closure",
  schnürung: "closure",
  lace: "closure",

  laenge: "length",
  länge: "length",
  beinlaenge: "inseam",
  beinlänge: "inseam",

  taschen: "pockets",
  pockets: "pockets",

  // --- season / use ---
  saison: "season",
  season: "season",
  sommer: "season",
  winter: "season",
  ubergang: "season",
  übergang: "season",

  // --- shoes specifics ---
  absatzhoehe: "heel_height_cm",
  absatzhöhe: "heel_height_cm",
  heelheight: "heel_height_cm",
  cm: "heel_height_cm", // nur wenn es wirklich Absatz-Kontext ist
  sohle: "sole_material",
  sol: "sole_material",
  sole: "sole_material",
  zehenform: "toe_shape",
  toes: "toe_shape",
  schaft: "boot_shaft_height",
  schaftumfang: "shaft_circumference_cm",

  // --- accessories / bags ---
  volumen: "bag_volume_l",
  capacity: "bag_volume_l",
  liter: "bag_volume_l",
  riemen: "strap_type",
  strap: "strap_type",
  verschluss: "closure", // ok doppelt, canonical bleibt closure

  // --- jewelry / watches / eyewear ---
  schmuckmaterial: "jewelry_material",
  edelstahl: "jewelry_material",
  silber: "jewelry_material",
  gold: "jewelry_material",
  leder: "band_material",
  uhrwerk: "watch_movement",
  quartz: "watch_movement",
  automatik: "watch_movement",
  gehausegroesse: "case_size_mm",
  gehäusegröße: "case_size_mm",
  mm: "case_size_mm",

  polarisiert: "polarized",
  polarized: "polarized",
  uv400: "uv_protection",
  uvschutz: "uv_protection",

  // --- care ---
  waschbar: "wash_instructions",
  waschanleitung: "wash_instructions",
  pflegehinweis: "care_instructions",
  care: "care_instructions",
  // --- Power tools / workshop ---
  "voltage": "voltage",
  "spannung": "voltage",
  "nennspannung": "voltage",
  "betriebsspannung": "voltage",
  "inputvoltage": "voltage",
  "outputvoltage": "voltage",
  "volt": "voltage",

  "wattage": "wattage",
  "leistung": "wattage",
  "nennleistung": "wattage",
  "power": "wattage",
  "power(w)": "wattage",
  "leistungsaufnahme": "wattage",
  "motorleistung": "wattage",
  "watt": "wattage",

  "amperage": "amperage",
  "stromaufnahme": "amperage",
  "ampere": "amperage",
  "a": "amperage",

  "batterytype": "battery_type",
  "batterietyp": "battery_type",
  "akkutyp": "battery_type",
  "batterychemistry": "battery_type",
  "lithiumion": "battery_type",
  "li-ion": "battery_type",
  "nimh": "battery_type",

  "batterycapacity": "battery_capacity",
  "kapazität": "battery_capacity",
  "akkukapazität": "battery_capacity",
  "capacity": "battery_capacity",
  "mah": "battery_capacity",
  "ah": "battery_capacity",
  "wh": "battery_capacity",

  "batteriesincluded": "battery_included",
  "akkuinklusive": "battery_included",
  "akkuenthalten": "battery_included",
  "batterieninklusive": "battery_included",

  "chargerincluded": "charger_included",
  "ladegerätinklusive": "charger_included",
  "ladegerätenthalten": "charger_included",

  "chargertime": "charge_time",
  "ladezeit": "charge_time",

  "torque": "torque",
  "drehmoment": "torque",
  "maxdrehmoment": "torque",
  "drehmoment(nm)": "torque",

  "noloadspeed": "no_load_speed",
  "leerlaufdrehzahl": "no_load_speed",
  "rpm": "no_load_speed",
  "u/min": "no_load_speed",

  "impactrate": "impact_rate",
  "schlagzahl": "impact_rate",
  "schläge/min": "impact_rate",
  "bpm": "impact_rate",

  "chucksize": "chuck_size",
  "bohrfutter": "chuck_size",
  "bohrfutterspannweite": "chuck_size",

  "maxdrillingdiameter": "max_drilling_diameter",
  "bohrdurchmesser": "max_drilling_diameter",
  "maxbohrdurchmesser": "max_drilling_diameter",

  "cuttingdepth": "cutting_depth",
  "schnitttiefe": "cutting_depth",
  "maxschnitttiefe": "cutting_depth",

  "bladediameter": "blade_diameter",
  "sägeblattdurchmesser": "blade_diameter",
  "scheibendurchmesser": "blade_diameter",
  "trennscheibendurchmesser": "blade_diameter",

  "strokelen": "stroke_length",
  "hub": "stroke_length",
  "hubhöhe": "stroke_length",
  "hubweg": "stroke_length",

  "orbit": "pendelhub",
  "pendelhub": "pendelhub",

  "cablelength": "cable_length",
  "kabellänge": "cable_length",
  "kabel": "cable_length",

  "airflow": "air_flow",
  "luftdurchsatz": "air_flow",
  "l/min": "air_flow",

  "pressure": "pressure",
  "druck": "pressure",
  "maxdruck": "pressure",
  "bar": "pressure",
  "psi": "pressure",

  "tankvolume": "tank_volume",
  "tankvolumen": "tank_volume",
  "behältervolumen": "tank_volume",
  "l": "tank_volume",

  "suctionpower": "suction_power",
  "saugleistung": "suction_power",
  "unterdruck": "suction_power",

  "hose_length": "hose_length",
  "schlauchlänge": "hose_length",

  "noiselevel": "noise_level",
  "schalldruckpegel": "noise_level",
  "schallleistungspegel": "noise_level",
  "db": "noise_level",
  "db(a)": "noise_level",

  // --- Office / paper / stationery ---
  "papersize": "paper_size",
  "papierformat": "paper_size",
  "format": "paper_size",
  "a4": "paper_size",
  "a5": "paper_size",
  "a3": "paper_size",

  "paperweight": "paper_gsm",
  "grammage": "paper_gsm",
  "papiergewicht": "paper_gsm",
  "g/m²": "paper_gsm",
  "gsm": "paper_gsm",

  "sheets": "sheet_count",
  "blatt": "sheet_count",
  "blätter": "sheet_count",
  "sheetcount": "sheet_count",
  "pages": "page_count",
  "seiten": "page_count",

  "bindtype": "binding_type",
  "bindung": "binding_type",
  "heftung": "binding_type",

  "inktype": "ink_type",
  "tinte": "ink_type",
  "toner": "ink_type",

  // --- Appliances / kitchen devices ---
  "capacity": "capacity",
  "fassungsvermögen": "capacity",
  "volumen": "capacity",
  "litrage": "capacity",

  "temperature_range": "temperature_range",
  "temperaturbereich": "temperature_range",
  "max_temperature": "max_temperature",
  "maxtemperatur": "max_temperature",

  "energyclass": "energy_class",
  "energieeffizienzklasse": "energy_class",

  "powerconsumption": "power_consumption",
  "stromverbrauch": "power_consumption",

  // --- Bikes / e-bikes ---
  "framesize": "frame_size",
  "rahmengröße": "frame_size",
  "frame size": "frame_size",

  "wheelsize": "wheel_size",
  "laufradgröße": "wheel_size",
  "reifengröße": "wheel_size",
  "wheel size": "wheel_size",

  "gears": "gear_count",
  "gänge": "gear_count",
  "gangzahl": "gear_count",
  "schaltung": "gear_count",

  "braketype": "brake_type",
  "bremse": "brake_type",
  "bremsen": "brake_type",

  "suspension": "suspension",
  "federung": "suspension",
  "federgabel": "suspension",

  "motorpower": "motor_power",
  "motorleistung": "motor_power",
  "nenndauerleistung": "motor_power",

  "range": "range",
  "reichweite": "range",

  // --- General packaging / sets ---
  "set": "set_includes",
  "lieferumfang": "set_includes",
  "umfang": "set_includes",
  "packaging": "set_includes",
  
    "max. temperatur": "max_temperature_c",
  "maximale temperatur": "max_temperature_c",
  "max. temp.": "max_temperature_c",

  "cocktailrezepte": "cocktail_recipes",
  "rezepte": "cocktail_recipes",
  "kreative rezepte": "cocktail_recipes",
  "mix-ideen": "cocktail_recipes",
  "ideen": "cocktail_recipes",

  // ---- "frei von / ohne" (Chemiefreiheit / Haushalt / Pflege) ----
  "ohne fluorid": "fluoride_free",
  "fluoridfrei": "fluoride_free",
  "fluoride free": "fluoride_free",
  "fluoride-free": "fluoride_free",

  "ohne aluminium": "aluminum_free",
  "aluminiumfrei": "aluminum_free",
  "aluminum free": "aluminum_free",
  "aluminum-free": "aluminum_free",

  "ohne duftstoffe": "fragrance_free",
  "duftstofffrei": "fragrance_free",
  "fragrance free": "fragrance_free",
  "fragrance-free": "fragrance_free",

  "ohne mikroplastik": "microplastic_free",
  "mikroplastikfrei": "microplastic_free",
  "microplastic free": "microplastic_free",
  "microplastic-free": "microplastic_free",

  "ohne parabene": "paraben_free",
  "parabenfrei": "paraben_free",
  "paraben free": "paraben_free",
  "paraben-free": "paraben_free",

  "ohne silikone": "silicone_free",
  "silikonfrei": "silicone_free",
  "silicone free": "silicone_free",
  "silicone-free": "silicone_free",

  "ohne mineralöl": "mineral_oil_free",
  "mineralölfrei": "mineral_oil_free",
  "mineral oil free": "mineral_oil_free",
  "mineral-oil-free": "mineral_oil_free",

  "plastikfrei": "plastic_free",
  "kunststofffrei": "plastic_free",
  "plastic free": "plastic_free",
  "plastic-free": "plastic_free",

  "weichmacherfrei": "phthalate_free",
  "ohne weichmacher": "phthalate_free",
  "phthalate free": "phthalate_free",
  "phthalate-free": "phthalate_free",

  // ---- Fitness / Geräte ----
  "max. geschwindigkeit": "max_speed_kmh",
  "maximale geschwindigkeit": "max_speed_kmh",
  "max speed": "max_speed_kmh",
  "speed (km/h)": "max_speed_kmh",

  "steigung": "incline_percent",
  "incline": "incline_percent",

  "max. benutzergewicht": "max_user_weight_kg",
  "max user weight": "max_user_weight_kg",
  "maximalgewicht": "max_user_weight_kg",

  "widerstandssystem": "resistance_system",
  "resistance system": "resistance_system",

  "schwungmasse": "flywheel_mass_kg",
  "flywheel": "flywheel_mass_kg",

  // ---- Lighting ----
  "fassung": "socket_type",
  "sockel": "socket_type",
  "socket": "socket_type",

  "abstrahlwinkel": "beam_angle_deg",
  "beam angle": "beam_angle_deg",

  "streifenlänge": "strip_length_m",
  "strip length": "strip_length_m",

  "anzahl leds": "led_count",
  "leds": "led_count",

  "lebensdauer": "lifetime_hours",
  "life time": "lifetime_hours",
  "lifetime": "lifetime_hours",

  // ---- PV / Notstrom ----
  "kapazität (ah)": "capacity_ah",
  "kapazität ah": "capacity_ah",
  "capacity (ah)": "capacity_ah",

  "mppt": "mppt",
  "reiner sinus": "pure_sine_wave",
  "pure sine": "pure_sine_wave",

  "geräuschpegel": "noise_db",
  "lautstärke (db)": "noise_db",
  "noise (db)": "noise_db",




  // Beauty / Pflege / Make-up
  lsf: "spf",
  lichtschutzfaktor: "spf",
  sun_protection_factor: "spf",
  skin_type: "hauttyp",
  hautsorte: "hauttyp",
  skin_condition: "hautzustand",
  skin_concern: "hautproblem",
  concern: "hautproblem",
  active_ingredients: "wirkstoffe",
  active_ingredient: "wirkstoff",
  wirkstoffgehalt: "aktivstoff_konzentration",
  concentration: "aktivstoff_konzentration",
  texture: "textur",
  finish_effect: "finish",
  finish_type: "finish",
  coverage: "deckkraft",
  opacity: "deckkraft",
  shade: "farbton",
  tone: "farbton",
  nuance_name: "nuance",
  palette_colors: "farbpalette_farben_anzahl",
  colors_count: "farbpalette_farben_anzahl",
  applicator: "applikator_typ",
  applicator_type: "applikator_typ",
  non_comedogenic: "nicht_komedogen",
  dermatologically_tested: "dermatologisch_getestet",
  ph: "pH_wert",

  // Tools / Geräte
  magnification: "vergroesserung",
  luminous_flux_lm: "lumen",
  lumens: "lumen",
  illuminance_lux: "lux",
  color_temperature_k: "farbtemperatur_k",
  timer_minutes: "timer_min",
  timer_levels: "timer_stufen",
  attachments: "aufsaetze_anzahl",
  attachments_count: "aufsaetze_anzahl",
  attachment_type: "aufsatz_typ",
  tweezers_count: "pinzetten_anzahl",
  pulses: "impulse_anzahl",
  pulse_count: "impulse_anzahl",
  needle_length_mm: "nadellaenge_mm",
  needle_material: "nadeln_material",
  wavelength_nm: "wellenlaengen_nm",
  led_colors: "led_farben",
  heat_function: "waermefunktion",
  vibration_levels: "vibrationsstufen",
  speed_levels: "geschwindigkeitsstufen",
  brush_heads_count: "aufsatz_anzahl",
  pressure_sensor: "drucksensor",
  modes: "reinigungsmodi",
  water_tank_ml: "wassertank_ml",

  // Supplements
  dosage_mg: "dosis_mg",
  dosage_ug: "dosis_ug",
  dosage_iu: "dosis_iu",
  daily_dose: "einnahme_pro_tag",
  servings_per_day: "einnahme_pro_tag",
  capsules: "kapseln_anzahl",
  capsules_count: "kapseln_anzahl",
  tablets_count: "tabletten_anzahl",
  form: "supplement_form",
  dosage_form: "supplement_form",
  bioavailability: "bioverfuegbarkeit",
  gmo_free: "ohne_gentechnik",
  sugar_free: "zuckerfrei",
  gluten_free: "glutenfrei",
  lactose_free: "laktosefrei",
  additive_free: "zusatzstoffe_frei",
  flavor: "geschmack",
  active: "wirkstoff",
  active_amount: "wirkstoff_menge",

  // Reise
  tsa: "tsa_schloss",
  tsa_lock: "tsa_schloss",
  wheels: "rollen_anzahl",
  wheel_count: "rollen_anzahl",
  cabin_size: "handgepaeck_tauglich",
  carry_on: "handgepaeck_tauglich",
  weight_kg: "gewicht_kg",
  volume_l: "volumen_l",
  dimensions_cm: "abmessungen_cm",
  water_resistance: "wasserfestigkeit",
  ports: "anschluesse",
  usb_ports_count: "usb_ports",
  rfid_protection: "rfid_schutz",

  // Möbel
  width_cm: "breite_cm",
  height_cm: "hoehe_cm",
  depth_cm: "tiefe_cm",
  seat_height_cm: "sitzhoehe_cm",
  seat_width_cm: "sitzbreite_cm",
  seat_depth_cm: "sitztiefe_cm",
  sleeping_area_cm: "liegeflaeche_cm",
  extendable: "ausziehbar",
  sofa_bed: "bettfunktion",
  storage: "stauraum",
  upholstery_material: "polster_material",
  frame_material: "gestell_material",
  cover_material: "bezug_material",

  // Renovierung / Handwerk
  grit: "korn",
  grain: "korn",
  consumption_m2_l: "verbrauch_m2_l",
  drying_time_min: "trocknungszeit_min",
  overpaintable_min: "ueberstreichbar_min",
  application_area: "anwendungsbereich",
  indoor_outdoor: "innen_aussen",
  compatible_materials: "material_kompatibilitaet",
  adhesive_type: "klebstoff_typ",
  sealant_type: "dichtstoff_typ",
  curing: "haertung",
},


  // Whitelist der kanonischen Keys (Tabellen-Daten dürfen nur daraus kommen)
 allowKeys: [
  "brand",
  "title",

  "weight",
  "dimensions",
  "material",
  "farbe",

  "energieversorgung",
  "schnittbreite",

  "menge",
  "anzahl",

  "besonderheit",

  // optional (wenn extrahiert)
  "leistung",
  "spannung",
  "druck",
  "durchfluss",
  "anschluss",

  "sitzplaetze",
  "traglast",

  // seeds optional
  "aussaat",
  "bluetezeit",
  "keimung",
  "bio",

  // --- camping: shelter / sleep ---
  "personen",
  "saison",
  "wassersaeule_aussenzelt",
  "wassersaeule_boden",
  "packmass",
  "aufbauart",
  "zelttyp",
  "freistehend",

  "komforttemperatur",
  "limittemperatur",
  "fuellung",
  "schlafsackform",

  "r_wert",
  "dicke",

  // --- camping: furniture ---
  "sitzhoehe",

  // --- camping: cooking ---
  "brennstoff",
  "brenneranzahl",
  "zuendung",

  // --- camping: cooling / power ---
  "kuehlbox_typ",
  "volumen",
  "kapazitaet_wh",

  // --- camping: light ---
  "helligkeit_lm",
  "laufzeit_h",
  "schutzart_ip",

  // --- camping: water / hygiene ---
  "tankvolumen_l",
  "toilettentyp",
  "spuelung",
  "schlauchlaenge_m",
  "porengroesse_um",

  // --- baby/kids ---
  "age_min_months",
  "age_max_months",
  "bpa_free",
  "dishwasher_safe",
  "set_size",
  "power_source",
  "battery_type",
  "sound",
  "light_mode",
  "mounting_type",
  "mounting_method",
  "gate_width_min_cm",
  "gate_width_max_cm",
  "gate_height_cm",
  "car_seat_group",
  "rear_facing",
  "isofix",
  "capacity_ml",
  "insulated",
  "tog_rating",
  "washable",
  "textile_material",
  
  // --- pets ---
	"groesse",
	"laenge_cm",

	"stielmaterial",
	"kopfmaterial",
	"arbeitsbreite_cm",
	"klingenlaenge_cm",

	"rohrdurchmesser_mm",
	"gewinde",
	"filterfeinheit_um",

	"impulsenergie_j",
	"zaunlaenge_km",
	"ausgangsspannung_v",

	"tierart",
	"fassungsvermoegen_l",
	"automatik",

	"temperaturbereich_c",

	  // --- party/events ---
	  "occasion",
	  "theme",
	  "set_size",
	  "personalization",
	  "reusable",
	  "size",
	  "power_source",
	  "battery_type",
	  "light_mode",
	  "capacity_ml",
	  "insulated",
	  
	    // --- cleaning/organization ---
	  "category",
	  "surface",
	  "volumen",
	  "capacity_ml",
	  "compatible_with",
	  "filter_type",
	  "noise_db",
	  "runtime_min",
	  "suction_pa",
	  "cable_length_m",
	  "stackable",
	  "airtight",
	  "sensor",

  // --- auto accessories ---
  "device_type",
  "video_resolution",
  "camera_channels",
  "gps",
  "wifi",
  "bluetooth",
  "app_control",
  "parking_mode",
  "night_vision",
  "display_size_in",
  "storage_gb",

  "obd",
  "obd_functions",

  "tpms",
  "tpms_frequency_mhz",

  "security_type",

  "inverter",
  "input_voltage_v",
  "output_voltage_v",
  "output_power_w",
  "peak_power_w",
  "usb_ports",
  "ac_outlets",
  "charge_power_w",
  "charge_current_a",
  "jump_starter",
  "jump_current_a",
  "capacity_mah",
  "charger_type",

  "compressor",

  "roof_cargo",
  "vehicle_fit",

  "ev_charger",
  "ev_connector_type",
  "charging_power_kw",
  "rfid",
  "mid_meter",
  "load_management",

  "light_type",
  "color_temp_k",

  "audio_type",
  "audio_rms_w",
  "impedance_ohm",
  // --- fashion / apparel ---
  "product_type",
  "gender",
  "age_group",

  "size",
  "size_system",
  "shoe_size",
  "shoe_width",

  "fit",
  "waist_rise",
  "leg_fit",

  "upper_material",
  "lining",
  "stretch",
  "breathability",
  "waterproof",
  "windproof",
  "insulation",

  "sleeve_length",
  "neckline",
  "hood",
  "closure",
  "length",
  "inseam",
  "pockets",
  "season",

  "heel_height_cm",
  "sole_material",
  "toe_shape",
  "boot_shaft_height",
  "shaft_circumference_cm",

  "bag_volume_l",
  "strap_type",

  "jewelry_material",
  "watch_movement",
  "case_size_mm",
  "band_material",
  "polarized",
  "uv_protection",

  "wash_instructions",
  "care_instructions",
 "air_flow",
  "amperage",
  "battery_capacity",
  "battery_included",
  "binding_type",
  "blade_diameter",
  "brake_type",
  "cable_length",
  "capacity",
  "charge_time",
  "charger_included",
  "chuck_size",
  "cutting_depth",
  "energy_class",
  "frame_size",
  "gear_count",
  "hose_length",
  "impact_rate",
  "ink_type",
  "max_drilling_diameter",
  "max_temperature",
  "motor_power",
  "no_load_speed",
  "noise_level",
  "page_count",
  "paper_gsm",
  "paper_size",
  "pendelhub",
  "pressure",
  "range",
  "set_includes",
  "sheet_count",
  "stroke_length",
  "suction_power",
  "suspension",
  "tank_volume",
  "temperature_range",
  "torque",
  "voltage",
  "wattage",
  "battery_type",
  "power_consumption",
    "leak_proof",
  "air_tight",
  "reusable",
  "refillable",
  "dishwasher_safe",
  "bpa_free",

  // "frei von / ohne" (Chemiefreiheit / Haushalt / Pflege)
  "plastic_free",
  "fluoride_free",
  "aluminum_free",
  "fragrance_free",
  "microplastic_free",
  "paraben_free",
  "silicone_free",
  "mineral_oil_free",
  "phthalate_free",

  // Fitness / Geräte
  "max_speed_kmh",
  "incline_percent",
  "max_user_weight_kg",
  "resistance_system",
  "flywheel_mass_kg",

  // Lighting
  "socket_type",
  "beam_angle_deg",
  "strip_length_m",
  "led_count",
  "lifetime_hours",

  // PV / Notstrom
  "capacity_ah",
  "mppt",
  "pure_sine_wave",
  "noise_db",

  "heat_resistant",
  "cold_resistant",
  "uv_resistant",
  "weatherproof",
  "rustproof",
  "corrosion_resistant",


    // Beauty / Pflege / Make-up
    "spf",
    "hauttyp",
    "hautzustand",
    "hautproblem",
    "wirkstoffe",
    "aktivstoff_konzentration",
    "textur",
    "finish",
    "deckkraft",
    "farbton",
    "nuance",
    "farbpalette_farben_anzahl",
    "applikator_typ",
    "wasserfest",
    "nicht_komedogen",
    "dermatologisch_getestet",
    "alcohol_free",
    "sulfate_free",
    "cruelty_free",
    "komedogenitaet",
    "pH_wert",

    // Tools / Geräte
    "vergroesserung",
    "lumen",
    "lux",
    "farbtemperatur_k",
    "timer",
    "timer_min",
    "timer_stufen",
    "aufsaetze_anzahl",
    "aufsatz_typ",
    "pinzetten_anzahl",
    "impulse_anzahl",
    "nadellaenge_mm",
    "nadeln_material",
    "wellenlaengen_nm",
    "led_farben",
    "waermefunktion",
    "vibrationsstufen",
    "geschwindigkeitsstufen",
    "drehzahl_rpm",
    "aufsatz_anzahl",
    "drucksensor",
    "reinigungsmodi",
    "wassertank_ml",

    // Supplements
    "supplement_form",
    "wirkstoff",
    "wirkstoff_menge",
    "dosis_mg",
    "dosis_ug",
    "dosis_iu",
    "portionen",
    "kapseln_anzahl",
    "tabletten_anzahl",
    "servings",
    "einnahme_pro_tag",
    "geschmack",
    "glutenfrei",
    "laktosefrei",
    "zuckerfrei",
    "ohne_gentechnik",
    "bioverfuegbarkeit",
    "zusatzstoffe_frei",

    // Reise
    "tsa_schloss",
    "rollen_anzahl",
    "handgepaeck_tauglich",
    "gewicht_kg",
    "volumen_l",
    "abmessungen_cm",
    "wasserfestigkeit",
    "ipx_rating",
    "anschluesse",
    "rfid_schutz",

    // Möbel
    "breite_cm",
    "hoehe_cm",
    "tiefe_cm",
    "sitzhoehe_cm",
    "sitzbreite_cm",
    "sitztiefe_cm",
    "liegeflaeche_cm",
    "ausziehbar",
    "bettfunktion",
    "stauraum",
    "polster_material",
    "gestell_material",
    "bezug_material",

    // Renovierung / Handwerk
    "korn",
    "koernung",
    "verbrauch_m2_l",
    "trocknungszeit_min",
    "ueberstreichbar_min",
    "anwendungsbereich",
    "innen_aussen",
    "material_kompatibilitaet",
    "klebstoff_typ",
    "dichtstoff_typ",
    "haertung",
],

labels: {
  de: {
    brand: "Marke",
    title: "Titel",
    weight: "Gewicht",
    dimensions: "Maße",
    material: "Material",
    farbe: "Farbe",

    energieversorgung: "Energieversorgung",
    schnittbreite: "Schnittbreite",

    menge: "Menge",
    anzahl: "Anzahl",

    besonderheit: "Besonderheit",

    leistung: "Leistung",
    spannung: "Spannung",
    druck: "Druck",
    durchfluss: "Durchfluss / Fördermenge",
    anschluss: "Anschluss",

    sitzplaetze: "Sitzplätze",
    traglast: "Belastbarkeit",

    aussaat: "Aussaat",
    bluetezeit: "Blütezeit",
    keimung: "Keimung",
    bio: "Bio",

    // --- camping: shelter / sleep ---
    personen: "Personen",
    saison: "Saison",
    wassersaeule_aussenzelt: "Wassersäule Außenzelt",
    wassersaeule_boden: "Wassersäule Boden",
    packmass: "Packmaß",
    aufbauart: "Aufbauart",
    zelttyp: "Zelttyp",
    freistehend: "Freistehend",

    komforttemperatur: "Komfort (°C)",
    limittemperatur: "Limit (°C)",
    fuellung: "Füllung",
    schlafsackform: "Form",

    r_wert: "R-Wert",
    dicke: "Dicke",

    // --- camping: furniture ---
    sitzhoehe: "Sitzhöhe",

    // --- camping: cooking ---
    brennstoff: "Brennstoff",
    brenneranzahl: "Flammen",
    zuendung: "Zündung",

    // --- camping: cooling / power ---
    kuehlbox_typ: "Kühlbox-Typ",
    volumen: "Volumen (l)",
    kapazitaet_wh: "Kapazität (Wh)",

    // --- camping: light ---
    helligkeit_lm: "Helligkeit (lm)",
    laufzeit_h: "Laufzeit (h)",
    schutzart_ip: "Schutzart (IP)",

    // --- camping: water / hygiene ---
    tankvolumen_l: "Tank/Behälter (l)",
    toilettentyp: "Toiletten-Typ",
    spuelung: "Spülung",
    schlauchlaenge_m: "Schlauch (m)",
    porengroesse_um: "Poren (µm)",

    // --- baby/kids ---
    age_min_months: "Alter ab (Monate)",
    age_max_months: "Alter bis (Monate)",
    bpa_free: "BPA-frei / Lebensmittelecht",
    dishwasher_safe: "Spülmaschinenfest",
    set_size: "Setgröße (Teile)",
    power_source: "Stromversorgung",
    battery_type: "Batterietyp",
    sound: "Sound/Musik",
    light_mode: "Lichtmodus",
    mounting_type: "Befestigung (Art)",
    mounting_method: "Montage (Methode)",
    gate_width_min_cm: "Breite min (cm)",
    gate_width_max_cm: "Breite max (cm)",
    gate_height_cm: "Höhe (cm)",
    car_seat_group: "Sitzklasse (i-Size/Gruppe)",
    rear_facing: "Rückwärtsgerichtet (Reboard)",
    isofix: "ISOFIX",
    capacity_ml: "Füllmenge (ml)",
    insulated: "Isoliert",
    tog_rating: "TOG-Wert",
    washable: "Waschbar",
    textile_material: "Material (Textil)",
	
		// --- pets ---
	groesse: "Größe",
	laenge_cm: "Länge (cm)",
	
	
	stielmaterial: "Stielmaterial",
	kopfmaterial: "Kopf-/Klingenmaterial",
	arbeitsbreite_cm: "Arbeitsbreite (cm)",
	klingenlaenge_cm: "Klingenlänge (cm)",

	rohrdurchmesser_mm: "Rohrdurchmesser (mm)",
	gewinde: "Gewinde",
	filterfeinheit_um: "Filterfeinheit (µm)",

	impulsenergie_j: "Impulsenergie (J)",
	zaunlaenge_km: "Zaunlänge (km)",
	ausgangsspannung_v: "Ausgangsspannung (V)",

	tierart: "Tierart",
	fassungsvermoegen_l: "Fassungsvermögen (l)",
	automatik: "Automatik",

	temperaturbereich_c: "Temperaturbereich (°C)",
    // --- party/events ---
    occasion: "Anlass",
    theme: "Thema/Motto",
    set_size: "Setgröße (Teile)",
    personalization: "Personalisierung",
    reusable: "Wiederverwendbar",
    size: "Größe",
    power_source: "Stromversorgung",
    battery_type: "Batterietyp",
    light_mode: "Lichtmodus",
    capacity_ml: "Füllmenge (ml)",
    insulated: "Isoliert",

    // --- cleaning/organization ---
    category: "Kategorie",
    surface: "Einsatzbereich",
    volumen: "Volumen (l)",
    capacity_ml: "Füllmenge (ml)",
    compatible_with: "Kompatibel mit",
    filter_type: "Filtertyp",
    noise_db: "Lautstärke (dB)",
    runtime_min: "Laufzeit (min)",
    suction_pa: "Saugleistung (Pa)",
    cable_length_m: "Kabellänge (m)",
    stackable: "Stapelbar",
    airtight: "Luftdicht",
    sensor: "Sensor/Touchless",


    // --- auto accessories ---
    device_type: "Gerätetyp",
    video_resolution: "Videoauflösung",
    camera_channels: "Kamera-Kanäle",
    gps: "GPS",
    wifi: "WLAN",
    bluetooth: "Bluetooth",
    app_control: "App-Steuerung",
    parking_mode: "Parkmodus",
    night_vision: "Nachtsicht",
    display_size_in: "Display (Zoll)",
    storage_gb: "Speicher (GB)",

    obd: "OBD/Diagnose",
    obd_functions: "OBD-Funktionen",

    tpms: "Reifendruck (TPMS)",
    tpms_frequency_mhz: "TPMS-Frequenz (MHz)",

    security_type: "Diebstahlschutz",

    inverter: "Wechselrichter",
    input_voltage_v: "Eingang (V)",
    output_voltage_v: "Ausgang (V)",
    output_power_w: "Leistung (W)",
    peak_power_w: "Spitze (W)",
    usb_ports: "USB-Ports",
    ac_outlets: "230V-Steckdosen",
    charge_power_w: "Ladeleistung (W)",
    charge_current_a: "Ladestrom (A)",
    jump_starter: "Starthilfe",
    jump_current_a: "Startstrom (A)",
    capacity_mah: "Kapazität (mAh)",
    charger_type: "Ladegerät-Typ",

    compressor: "Kompressor",

    roof_cargo: "Dach/Gepäck",
    vehicle_fit: "Passform",

    ev_charger: "Wallbox/Lader",
    ev_connector_type: "Stecker/Typ",
    charging_power_kw: "Ladeleistung (kW)",
    rfid: "RFID",
    mid_meter: "MID-Zähler",
    load_management: "Lastmanagement",

    light_type: "Leuchtmittel",
    color_temp_k: "Farbtemp. (K)",

    audio_type: "Car-Audio",
    audio_rms_w: "RMS (W)",
    impedance_ohm: "Impedanz (Ohm)",
      // --- fashion / apparel ---
      product_type: "Produkttyp",
      gender: "Zielgruppe",
      age_group: "Altersgruppe",

      size: "Größe",
      size_system: "Größensystem",
      shoe_size: "Schuhgröße",
      shoe_width: "Schuhweite",

      fit: "Passform",
      waist_rise: "Bundhöhe",
      leg_fit: "Schnitt",

      upper_material: "Obermaterial",
      lining: "Futter",
      stretch: "Stretch",
      breathability: "Atmungsaktiv",
      waterproof: "Wasserdicht",
      windproof: "Winddicht",
      insulation: "Isolierung/Wärme",

      sleeve_length: "Ärmellänge",
      neckline: "Ausschnitt/Kragen",
      hood: "Kapuze",
      closure: "Verschluss",
      length: "Länge",
      inseam: "Innenbeinlänge",
      pockets: "Taschen",
      season: "Saison",

      heel_height_cm: "Absatz (cm)",
      sole_material: "Sohle",
      toe_shape: "Zehenform",
      boot_shaft_height: "Schaftlänge",
      shaft_circumference_cm: "Schaftumfang (cm)",

      bag_volume_l: "Volumen (l)",
      strap_type: "Trageart",

      jewelry_material: "Schmuckmaterial",
      watch_movement: "Uhrwerk",
      case_size_mm: "Gehäuse (mm)",
      band_material: "Bandmaterial",
      polarized: "Polarisiert",
      uv_protection: "UV-Schutz",

      wash_instructions: "Waschbar/Pflege",
      care_instructions: "Pflegehinweise",
  "power_consumption": "Stromverbrauch",
  "voltage": "Spannung",
  "amperage": "Stromstärke",
  "wattage": "Leistung",
  "torque": "Drehmoment",
  "capacity": "Kapazität",
  "battery_capacity": "Akkukapazität",
  "battery_type": "Akkutyp",
  "battery_included": "Akku enthalten",
  "charger_included": "Ladegerät enthalten",
  "charge_time": "Ladezeit",
  "range": "Reichweite",
  "motor_power": "Motorleistung",
  "noise_level": "Lautstärke",
  "energy_class": "Energieeffizienzklasse",
  "blade_diameter": "Sägeblattdurchmesser",
  "cutting_depth": "Schnitttiefe",
  "no_load_speed": "Leerlaufdrehzahl",
  "impact_rate": "Schlagzahl",
  "max_drilling_diameter": "Max. Bohrdurchmesser",
  "chuck_size": "Bohrfutter",
  "stroke_length": "Hubhöhe",
  "pendelhub": "Pendelhub",
  "air_flow": "Luftleistung",
  "pressure": "Druck",
  "tank_volume": "Tankvolumen",
  "suction_power": "Saugkraft",
  "hose_length": "Schlauchlänge",
  "cable_length": "Kabellänge",
  "set_includes": "Lieferumfang",
  "wheel_size": "Radgröße",
  "frame_size": "Rahmengröße",
  "gear_count": "Gänge",
  "brake_type": "Bremstyp",
  "suspension": "Federung",
  "paper_size": "Papierformat",
  "paper_gsm": "Papiergewicht",
  "sheet_count": "Blattanzahl",
  "page_count": "Seitenanzahl",
  "binding_type": "Bindung",
  "ink_type": "Tintentyp",
  "max_temperature": "Max. Temperatur",
  "temperature_range": "Temperaturbereich",
  bpa_free: "BPA-frei",

	plastic_free: "Kunststofffrei",
	fluoride_free: "Fluoridfrei",
	aluminum_free: "Aluminiumfrei",
	fragrance_free: "Ohne Duftstoffe",
	microplastic_free: "Ohne Mikroplastik",
	paraben_free: "Ohne Parabene",
	silicone_free: "Ohne Silikone",
	mineral_oil_free: "Ohne Mineralöl",
	phthalate_free: "Weichmacherfrei",

	max_speed_kmh: "Max. Geschwindigkeit",
	incline_percent: "Steigung",
	max_user_weight_kg: "Max. Benutzergewicht",
	resistance_system: "Widerstandssystem",
	flywheel_mass_kg: "Schwungmasse",

	socket_type: "Fassung",
	beam_angle_deg: "Abstrahlwinkel",
	strip_length_m: "Streifenlänge",
	led_count: "Anzahl LEDs",
	lifetime_hours: "Lebensdauer",

	capacity_ah: "Kapazität (Ah)",
	mppt: "MPPT",
	pure_sine_wave: "Reiner Sinus",
	noise_db: "Geräuschpegel",

	heat_resistant: "Hitzebeständig",
	cold_resistant: "Kältebeständig",
  

    // Beauty / Pflege / Supplements / Reise / Möbel / Renovierung
    spf: "LSF / SPF",
    hauttyp: "Hauttyp",
    hautzustand: "Hautzustand",
    hautproblem: "Hautproblem / Ziel",
    wirkstoffe: "Wirkstoffe",
    aktivstoff_konzentration: "Wirkstoff-Konzentration",
    textur: "Textur",
    finish: "Finish",
    deckkraft: "Deckkraft",
    farbton: "Farbton",
    nuance: "Nuance",
    farbpalette_farben_anzahl: "Farbenanzahl (Palette)",
    applikator_typ: "Applikator",
    wasserfest: "Wasserfest",
    nicht_komedogen: "Nicht komedogen",
    dermatologisch_getestet: "Dermatologisch getestet",
    komedogenitaet: "Komedogenität",
    pH_wert: "pH-Wert",
    vergroesserung: "Vergrößerung",
    lumen: "Lichtstrom (Lumen)",
    lux: "Beleuchtungsstärke (Lux)",
    farbtemperatur_k: "Farbtemperatur (K)",
    timer: "Timer",
    timer_min: "Timer (Minuten)",
    timer_stufen: "Timer-Stufen",
    aufsaetze_anzahl: "Aufsätze (Anzahl)",
    aufsatz_typ: "Aufsatz-Typ",
    pinzetten_anzahl: "Pinzetten (Anzahl)",
    impulse_anzahl: "Impulse (Anzahl)",
    nadellaenge_mm: "Nadellänge (mm)",
    nadeln_material: "Nadelmaterial",
    wellenlaengen_nm: "Wellenlängen (nm)",
    led_farben: "LED-Farben",
    waermefunktion: "Wärmefunktion",
    vibrationsstufen: "Vibrationsstufen",
    geschwindigkeitsstufen: "Geschwindigkeitsstufen",
    drehzahl_rpm: "Drehzahl (rpm)",
    aufsatz_anzahl: "Aufsatz (Anzahl)",
    drucksensor: "Drucksensor",
    reinigungsmodi: "Reinigungsmodi",
    wassertank_ml: "Wassertank (ml)",
    supplement_form: "Darreichungsform",
    wirkstoff: "Wirkstoff",
    wirkstoff_menge: "Wirkstoffmenge",
    dosis_mg: "Dosierung (mg)",
    dosis_ug: "Dosierung (µg)",
    dosis_iu: "Dosierung (I.E.)",
    portionen: "Portionen",
    kapseln_anzahl: "Kapseln (Anzahl)",
    tabletten_anzahl: "Tabletten (Anzahl)",
    servings: "Portionen (Servings)",
    einnahme_pro_tag: "Einnahme pro Tag",
    geschmack: "Geschmack",
    glutenfrei: "Glutenfrei",
    laktosefrei: "Laktosefrei",
    zuckerfrei: "Zuckerfrei",
    ohne_gentechnik: "Ohne Gentechnik",
    bioverfuegbarkeit: "Bioverfügbarkeit",
    zusatzstoffe_frei: "Ohne Zusatzstoffe",
    tsa_schloss: "TSA-Schloss",
    rollen_anzahl: "Rollen (Anzahl)",
    handgepaeck_tauglich: "Handgepäck-tauglich",
    gewicht_kg: "Gewicht (kg)",
    volumen_l: "Volumen (L)",
    abmessungen_cm: "Abmessungen (cm)",
    wasserfestigkeit: "Wasserfestigkeit",
    ipx_rating: "IPX-Schutzklasse",
    anschluesse: "Anschlüsse",
    rfid_schutz: "RFID-Schutz",
    breite_cm: "Breite (cm)",
    hoehe_cm: "Höhe (cm)",
    tiefe_cm: "Tiefe (cm)",
    sitzhoehe_cm: "Sitzhöhe (cm)",
    sitzbreite_cm: "Sitzbreite (cm)",
    sitztiefe_cm: "Sitztiefe (cm)",
    liegeflaeche_cm: "Liegefläche (cm)",
    ausziehbar: "Ausziehbar",
    bettfunktion: "Bettfunktion",
    stauraum: "Stauraum",
    polster_material: "Polster-Material",
    gestell_material: "Gestell-Material",
    bezug_material: "Bezug-Material",
    korn: "Körnung (Korn)",
    koernung: "Körnung",
    verbrauch_m2_l: "Verbrauch (m²/L)",
    trocknungszeit_min: "Trocknungszeit (Min)",
    ueberstreichbar_min: "Überstreichbar nach (Min)",
    anwendungsbereich: "Anwendungsbereich",
    innen_aussen: "Innen / Außen",
    material_kompatibilitaet: "Material-Kompatibilität",
    klebstoff_typ: "Klebstoff-Typ",
    dichtstoff_typ: "Dichtstoff-Typ",
    haertung: "Härtung",
},

fr: {
  brand: "Marque",
  title: "Titre",
  weight: "Poids",
  dimensions: "Dimensions",
  material: "Matériau",
  farbe: "Couleur",

  energieversorgung: "Alimentation",
  schnittbreite: "Largeur de coupe",

  menge: "Quantité",
  anzahl: "Nombre",

  besonderheit: "Caractéristiques",

  leistung: "Puissance",
  spannung: "Tension",
  druck: "Pression",
  durchfluss: "Débit",
  anschluss: "Raccordement",

  sitzplaetze: "Places assises",
  traglast: "Charge maximale",

  aussaat: "Semis",
  bluetezeit: "Période de floraison",
  keimung: "Germination",
  bio: "Bio",

  // --- camping: shelter / sleep ---
  personen: "Personnes",
  saison: "Saison",
  wassersaeule_aussenzelt: "Colonne d’eau (double-toit)",
  wassersaeule_boden: "Colonne d’eau (sol)",
  packmass: "Dimensions pliées",
  aufbauart: "Type de montage",
  zelttyp: "Type de tente",
  freistehend: "Autoportante",

  komforttemperatur: "Température de confort (°C)",
  limittemperatur: "Température limite (°C)",
  fuellung: "Garnissage",
  schlafsackform: "Forme",

  r_wert: "Valeur R",
  dicke: "Épaisseur",

  // --- camping: furniture ---
  sitzhoehe: "Hauteur d’assise",

  // --- camping: cooking ---
  brennstoff: "Carburant",
  brenneranzahl: "Nombre de brûleurs",
  zuendung: "Allumage",

  // --- camping: cooling / power ---
  kuehlbox_typ: "Type de glacière",
  volumen: "Volume (l)",
  kapazitaet_wh: "Capacité (Wh)",

  // --- camping: light ---
  helligkeit_lm: "Luminosité (lm)",
  laufzeit_h: "Autonomie (h)",
  schutzart_ip: "Indice de protection (IP)",

  // --- camping: water / hygiene ---
  tankvolumen_l: "Réservoir (l)",
  toilettentyp: "Type de toilettes",
  spuelung: "Chasse d’eau",
  schlauchlaenge_m: "Longueur du tuyau (m)",
  porengroesse_um: "Taille des pores (µm)",

  // --- baby/kids ---
  age_min_months: "Âge minimum (mois)",
  age_max_months: "Âge maximum (mois)",
  bpa_free: "Sans BPA / Contact alimentaire",
  dishwasher_safe: "Compatible lave-vaisselle",
  set_size: "Taille du lot (pièces)",
  power_source: "Source d’alimentation",
  battery_type: "Type de batterie",
  sound: "Son / Musique",
  light_mode: "Mode d’éclairage",
  mounting_type: "Type de fixation",
  mounting_method: "Méthode de montage",
  gate_width_min_cm: "Largeur min. (cm)",
  gate_width_max_cm: "Largeur max. (cm)",
  gate_height_cm: "Hauteur (cm)",
  car_seat_group: "Groupe siège auto (i-Size)",
  rear_facing: "Dos à la route",
  isofix: "ISOFIX",
  capacity_ml: "Contenance (ml)",
  insulated: "Isolé",
  tog_rating: "Indice TOG",
  washable: "Lavable",
  textile_material: "Matériau textile",

  // --- pets ---
  groesse: "Taille",
  laenge_cm: "Longueur (cm)",

  stielmaterial: "Matériau du manche",
  kopfmaterial: "Matériau de la tête / lame",
  arbeitsbreite_cm: "Largeur de travail (cm)",
  klingenlaenge_cm: "Longueur de lame (cm)",

  rohrdurchmesser_mm: "Diamètre du tube (mm)",
  gewinde: "Filetage",
  filterfeinheit_um: "Finesse du filtre (µm)",

  impulsenergie_j: "Énergie d’impact (J)",
  zaunlaenge_km: "Longueur de clôture (km)",
  ausgangsspannung_v: "Tension de sortie (V)",

  tierart: "Type d’animal",
  fassungsvermoegen_l: "Capacité (l)",
  automatik: "Automatique",

  temperaturbereich_c: "Plage de température (°C)",

  // --- party/events ---
  occasion: "Occasion",
  theme: "Thème",
  personalization: "Personnalisation",
  reusable: "Réutilisable",
  size: "Taille",

  // --- cleaning/organization ---
  category: "Catégorie",
  surface: "Surface d’utilisation",
  compatible_with: "Compatible avec",
  filter_type: "Type de filtre",
  noise_db: "Niveau sonore (dB)",
  runtime_min: "Autonomie (min)",
  suction_pa: "Puissance d’aspiration (Pa)",
  cable_length_m: "Longueur du câble (m)",
  stackable: "Empilable",
  airtight: "Hermétique",
  sensor: "Capteur / Sans contact",

  // --- auto accessories ---
  device_type: "Type d’appareil",
  video_resolution: "Résolution vidéo",
  camera_channels: "Canaux caméra",
  gps: "GPS",
  wifi: "Wi-Fi",
  bluetooth: "Bluetooth",
  app_control: "Contrôle par application",
  parking_mode: "Mode parking",
  night_vision: "Vision nocturne",
  display_size_in: "Écran (pouces)",
  storage_gb: "Stockage (Go)",

  obd: "OBD / Diagnostic",
  obd_functions: "Fonctions OBD",

  tpms: "Pression des pneus (TPMS)",
  tpms_frequency_mhz: "Fréquence TPMS (MHz)",

  security_type: "Protection antivol",

  inverter: "Convertisseur",
  input_voltage_v: "Tension d’entrée (V)",
  output_voltage_v: "Tension de sortie (V)",
  output_power_w: "Puissance (W)",
  peak_power_w: "Puissance de crête (W)",
  usb_ports: "Ports USB",
  ac_outlets: "Prises 230V",
  charge_power_w: "Puissance de charge (W)",
  charge_current_a: "Courant de charge (A)",
  jump_starter: "Démarreur de secours",
  jump_current_a: "Courant de démarrage (A)",
  capacity_mah: "Capacité (mAh)",
  charger_type: "Type de chargeur",

  compressor: "Compresseur",

  roof_cargo: "Chargement de toit",
  vehicle_fit: "Compatibilité véhicule",

  ev_charger: "Borne de recharge",
  ev_connector_type: "Type de connecteur",
  charging_power_kw: "Puissance de charge (kW)",
  rfid: "RFID",
  mid_meter: "Compteur MID",
  load_management: "Gestion de charge",

  light_type: "Type d’éclairage",
  color_temp_k: "Température de couleur (K)",

  audio_type: "Audio voiture",
  audio_rms_w: "RMS (W)",
  impedance_ohm: "Impédance (Ohm)",

  // --- fashion / apparel ---
  product_type: "Type de produit",
  gender: "Public cible",
  age_group: "Groupe d’âge",

  size_system: "Système de tailles",
  shoe_size: "Pointure",
  shoe_width: "Largeur de chaussure",

  fit: "Coupe",
  waist_rise: "Hauteur de taille",
  leg_fit: "Coupe des jambes",

  upper_material: "Matériau extérieur",
  lining: "Doublure",
  stretch: "Extensible",
  breathability: "Respirant",
  waterproof: "Imperméable",
  windproof: "Coupe-vent",
  insulation: "Isolation thermique",

  sleeve_length: "Longueur des manches",
  neckline: "Encolure / col",
  hood: "Capuche",
  closure: "Fermeture",
  length: "Longueur",
  inseam: "Entrejambe",
  pockets: "Poches",
  season: "Saison",

  heel_height_cm: "Hauteur du talon (cm)",
  sole_material: "Semelle",
  toe_shape: "Forme des orteils",
  boot_shaft_height: "Hauteur de tige",
  shaft_circumference_cm: "Tour de tige (cm)",

  bag_volume_l: "Volume du sac (l)",
  strap_type: "Type de sangle",

  jewelry_material: "Matériau du bijou",
  watch_movement: "Mouvement de la montre",
  case_size_mm: "Boîtier (mm)",
  band_material: "Matériau du bracelet",
  polarized: "Polarisé",
  uv_protection: "Protection UV",

  wash_instructions: "Instructions de lavage",
  care_instructions: "Conseils d’entretien",

  power_consumption: "Consommation électrique",
  voltage: "Tension",
  amperage: "Intensité",
  wattage: "Puissance",
  torque: "Couple",
  capacity: "Capacité",
  battery_capacity: "Capacité de la batterie",
  battery_included: "Batterie incluse",
  charger_included: "Chargeur inclus",
  charge_time: "Temps de charge",
  range: "Autonomie",
  motor_power: "Puissance du moteur",
  noise_level: "Niveau sonore",
  energy_class: "Classe énergétique",
  blade_diameter: "Diamètre de lame",
  cutting_depth: "Profondeur de coupe",
  no_load_speed: "Vitesse à vide",
  impact_rate: "Cadence de frappe",
  max_drilling_diameter: "Diamètre de perçage max.",
  chuck_size: "Mandrin",
  stroke_length: "Course",
  pendelhub: "Mouvement pendulaire",
  air_flow: "Débit d’air",
  pressure: "Pression",
  tank_volume: "Volume du réservoir",
  suction_power: "Puissance d’aspiration",
  hose_length: "Longueur du tuyau",
  cable_length: "Longueur du câble",
  set_includes: "Contenu du coffret",
  wheel_size: "Taille des roues",
  frame_size: "Taille du cadre",
  gear_count: "Nombre de vitesses",
  brake_type: "Type de frein",
  suspension: "Suspension",
  paper_size: "Format papier",
  paper_gsm: "Grammage",
  sheet_count: "Nombre de feuilles",
  page_count: "Nombre de pages",
  binding_type: "Type de reliure",
  ink_type: "Type d’encre",
  max_temperature: "Température max.",
  temperature_range: "Plage de température",
  plastic_free: "Sans plastique",
fluoride_free: "Sans fluor",
aluminum_free: "Sans aluminium",
fragrance_free: "Sans parfum",
microplastic_free: "Sans microplastiques",
paraben_free: "Sans parabènes",
silicone_free: "Sans silicones",
mineral_oil_free: "Sans huile minérale",
phthalate_free: "Sans phtalates",

max_speed_kmh: "Vitesse max.",
incline_percent: "Inclinaison",
max_user_weight_kg: "Poids utilisateur max.",
resistance_system: "Système de résistance",
flywheel_mass_kg: "Masse d’inertie",

socket_type: "Culot",
beam_angle_deg: "Angle de faisceau",
strip_length_m: "Longueur du ruban",
led_count: "Nombre de LED",
lifetime_hours: "Durée de vie",

capacity_ah: "Capacité (Ah)",
mppt: "MPPT",
pure_sine_wave: "Sinusoïde pure",
noise_db: "Niveau sonore",


    // Beauty / Soin / Compléments / Voyage / Meubles / Rénovation
    spf: "SPF",
    hauttyp: "Type de peau",
    hautzustand: "État de la peau",
    hautproblem: "Préoccupation",
    wirkstoffe: "Actifs",
    aktivstoff_konzentration: "Concentration d'actif",
    textur: "Texture",
    finish: "Fini",
    deckkraft: "Couvrance",
    farbton: "Teinte",
    nuance: "Nuance",
    farbpalette_farben_anzahl: "Nombre de couleurs (palette)",
    applikator_typ: "Applicateur",
    wasserfest: "Résistant à l'eau",
    nicht_komedogen: "Non comédogène",
    dermatologisch_getestet: "Testé dermatologiquement",
    komedogenitaet: "Comédogénicité",
    pH_wert: "pH",
    vergroesserung: "Grossissement",
    lumen: "Flux lumineux (lm)",
    lux: "Éclairement (lux)",
    farbtemperatur_k: "Température de couleur (K)",
    timer: "Minuteur",
    timer_min: "Minuteur (min)",
    timer_stufen: "Niveaux de minuteur",
    aufsaetze_anzahl: "Embouts (nombre)",
    aufsatz_typ: "Type d'embout",
    pinzetten_anzahl: "Pinces (nombre)",
    impulse_anzahl: "Impulsions (nombre)",
    nadellaenge_mm: "Longueur d'aiguille (mm)",
    nadeln_material: "Matériau des aiguilles",
    wellenlaengen_nm: "Longueurs d'onde (nm)",
    led_farben: "Couleurs LED",
    waermefunktion: "Fonction chaleur",
    vibrationsstufen: "Niveaux de vibration",
    geschwindigkeitsstufen: "Niveaux de vitesse",
    drehzahl_rpm: "Vitesse (rpm)",
    aufsatz_anzahl: "Embout (nombre)",
    drucksensor: "Capteur de pression",
    reinigungsmodi: "Modes de nettoyage",
    wassertank_ml: "Réservoir (ml)",
    supplement_form: "Forme",
    wirkstoff: "Actif",
    wirkstoff_menge: "Quantité d'actif",
    dosis_mg: "Dosage (mg)",
    dosis_ug: "Dosage (µg)",
    dosis_iu: "Dosage (UI)",
    portionen: "Portions",
    kapseln_anzahl: "Gélules (nombre)",
    tabletten_anzahl: "Comprimés (nombre)",
    servings: "Portions (servings)",
    einnahme_pro_tag: "Prise par jour",
    geschmack: "Goût",
    glutenfrei: "Sans gluten",
    laktosefrei: "Sans lactose",
    zuckerfrei: "Sans sucre",
    ohne_gentechnik: "Sans OGM",
    bioverfuegbarkeit: "Biodisponibilité",
    zusatzstoffe_frei: "Sans additifs",
    tsa_schloss: "Serrure TSA",
    rollen_anzahl: "Roulettes (nombre)",
    handgepaeck_tauglich: "Cabine (compatible)",
    gewicht_kg: "Poids (kg)",
    volumen_l: "Volume (L)",
    abmessungen_cm: "Dimensions (cm)",
    wasserfestigkeit: "Résistance à l'eau",
    ipx_rating: "Indice IPX",
    anschluesse: "Connectiques",
    rfid_schutz: "Protection RFID",
    breite_cm: "Largeur (cm)",
    hoehe_cm: "Hauteur (cm)",
    tiefe_cm: "Profondeur (cm)",
    sitzhoehe_cm: "Hauteur d'assise (cm)",
    sitzbreite_cm: "Largeur d'assise (cm)",
    sitztiefe_cm: "Profondeur d'assise (cm)",
    liegeflaeche_cm: "Surface couchage (cm)",
    ausziehbar: "Extensible",
    bettfunktion: "Convertible",
    stauraum: "Rangement",
    polster_material: "Matériau rembourrage",
    gestell_material: "Matériau structure",
    bezug_material: "Matériau housse",
    korn: "Granulométrie",
    koernung: "Granulométrie",
    verbrauch_m2_l: "Rendement (m²/L)",
    trocknungszeit_min: "Temps de séchage (min)",
    ueberstreichbar_min: "Recouvrable après (min)",
    anwendungsbereich: "Domaine d'application",
    innen_aussen: "Intérieur / extérieur",
    material_kompatibilitaet: "Compatibilité matériaux",
    klebstoff_typ: "Type de colle",
    dichtstoff_typ: "Type de mastic",
    haertung: "Polymérisation",
},

  // optional: nur wenn du Step V wirklich nutzt
  i18n: {
    en: {
      weight: "Weight",
      dimensions: "Dimensions",
      material: "Material",
      farbe: "Color",
      besonderheit: "Features",
      energieversorgung: "Power supply",
      schnittbreite: "Cutting width",
      menge: "Quantity",
      anzahl: "Count",
      leistung: "Power",
      spannung: "Voltage",
      druck: "Pressure",
      durchfluss: "Flow rate",
      anschluss: "Connection",
      sitzplaetze: "Seats",
      traglast: "Max load",
      aussaat: "Sowing",
      bluetezeit: "Blooming period",
      keimung: "Germination",
      bio: "Organic",

      personen: "Persons",
      saison: "Season rating",
      wassersaeule_aussenzelt: "Rainfly (mm)",
      wassersaeule_boden: "Floor (mm)",
      packmass: "Packed size",
      aufbauart: "Setup type",
      zelttyp: "Tent type",
      freistehend: "Freestanding",

      komforttemperatur: "Comfort (°C)",
      limittemperatur: "Limit (°C)",
      fuellung: "Fill",
      schlafsackform: "Shape",

      r_wert: "R-value",
      dicke: "Thickness",

      sitzhoehe: "Seat height",

      brennstoff: "Fuel",
      brenneranzahl: "Burners",
      zuendung: "Ignition",

      kuehlbox_typ: "Cooler type",
      volumen: "Volume (L)",
      kapazitaet_wh: "Capacity (Wh)",

      helligkeit_lm: "Brightness (lm)",
      laufzeit_h: "Runtime (h)",
      schutzart_ip: "IP rating",

      tankvolumen_l: "Tank (L)",
      toilettentyp: "Toilet type",
      spuelung: "Flush",
      schlauchlaenge_m: "Hose (m)",
      porengroesse_um: "Pore (µm)",

      // --- baby/kids ---
      age_min_months: "Age from (months)",
      age_max_months: "Age to (months)",
      bpa_free: "BPA-free / Food grade",
      dishwasher_safe: "Dishwasher safe",
      set_size: "Set size (pcs)",
      power_source: "Power source",
      battery_type: "Battery type",
      sound: "Sound/Music",
      light_mode: "Light mode",
      mounting_type: "Mounting type",
      mounting_method: "Mounting method",
      gate_width_min_cm: "Width min (cm)",
      gate_width_max_cm: "Width max (cm)",
      gate_height_cm: "Height (cm)",
      car_seat_group: "Seat class (i-Size/group)",
      rear_facing: "Rear-facing",
      isofix: "ISOFIX",
      capacity_ml: "Capacity (ml)",
      insulated: "Insulated",
      tog_rating: "TOG rating",
      washable: "Washable",
      textile_material: "Material (textile)",
    },
  },
},

  priority: {
  buyerCore: [
    // baseline (site-agnostisch)
    "dimensions",
    "weight",
    "material",
    "besonderheit",
  "volumen",

  ],

  boosts: {
    // mowing
    rasen: ["energieversorgung", "schnittbreite", "weight", "besonderheit"],
    trimmer: ["energieversorgung", "schnittbreite", "weight", "besonderheit"],
    mäher: ["schnittbreite", "energieversorgung", "weight", "besonderheit"],

    // chainsaw
    kette: ["spannung", "weight", "leistung", "besonderheit"],

    // watering/pumps
    bewässer: ["durchfluss", "druck", "leistung", "anschluss"],
    pumpe: ["durchfluss", "druck", "leistung", "anschluss"],
    druck: ["druck", "durchfluss", "leistung", "anschluss"],

    // furniture
    stuhl: ["material", "dimensions", "weight", "besonderheit"],
    tisch: ["material", "dimensions", "weight", "besonderheit"],

    // grill
    grill: ["leistung", "dimensions", "material", "weight"],

    // seeds
    samen: ["menge", "aussaat", "keimung", "bluetezeit", "bio"],
    rasensamen: ["menge", "aussaat", "keimung", "bio"],
    dünger: ["menge", "bio", "material"],
    unkraut: ["menge", "material", "besonderheit"],

    // --- camping: tents / tarps / awnings ---
    camping: ["weight", "dimensions", "material", "besonderheit"],
    zelt: [
      "personen",
      "saison",
      "wassersaeule_aussenzelt",
      "wassersaeule_boden",
      "packmass",
      "aufbauart",
      "zelttyp",
      "freistehend",
      "weight",
    ],
    vorzelt: ["personen", "wassersaeule_aussenzelt", "packmass", "aufbauart", "zelttyp", "weight"],
    tarp: ["wassersaeule_aussenzelt", "packmass", "material", "weight"],
    dachzelt: ["personen", "saison", "packmass", "weight", "besonderheit"],
    buszelt: ["personen", "wassersaeule_aussenzelt", "packmass", "weight"],

    // --- camping: sleeping ---
    schlafsack: ["komforttemperatur", "limittemperatur", "fuellung", "schlafsackform", "packmass", "weight"],
    deckenschlafsack: ["komforttemperatur", "limittemperatur", "fuellung", "schlafsackform", "packmass", "weight"],
    winterschlafsack: ["komforttemperatur", "limittemperatur", "fuellung", "packmass", "weight"],
    sommerschlafsack: ["komforttemperatur", "limittemperatur", "fuellung", "packmass", "weight"],
    isomatte: ["r_wert", "dicke", "packmass", "weight", "material"],
    thermomatte: ["r_wert", "dicke", "packmass", "weight", "material"],
    luftmatratze: ["dicke", "packmass", "weight", "material"],

    // --- camping: furniture ---
    campingstuhl: ["traglast", "sitzhoehe", "material", "weight", "dimensions"],
    faltstuhl: ["traglast", "sitzhoehe", "material", "weight", "dimensions"],
    regiestuhl: ["traglast", "sitzhoehe", "material", "weight", "dimensions"],
    anglerstuhl: ["traglast", "sitzhoehe", "material", "weight", "dimensions"],
    campingtisch: ["material", "dimensions", "weight", "besonderheit"],

    // --- camping: cooking ---
    kocher: ["brennstoff", "brenneranzahl", "zuendung", "leistung", "weight"],
    campingkocher: ["brennstoff", "brenneranzahl", "zuendung", "leistung", "weight"],
    gaskocher: ["brennstoff", "brenneranzahl", "zuendung", "leistung", "weight"],
    kartuschenkocher: ["brennstoff", "brenneranzahl", "zuendung", "leistung", "weight"],
    grillrost: ["material", "dimensions", "weight", "besonderheit"],

    // --- camping: cooling ---
    kuehlbox: ["kuehlbox_typ", "volumen", "energieversorgung", "leistung", "weight"],
    kühlbox: ["kuehlbox_typ", "volumen", "energieversorgung", "leistung", "weight"],
    kuehltasche: ["volumen", "material", "weight", "besonderheit"],
    kompressorkuehlbox: ["kuehlbox_typ", "volumen", "energieversorgung", "leistung", "weight"],

    // --- camping: power / solar ---
    powerstation: ["kapazitaet_wh", "leistung", "energieversorgung", "anschluss", "weight"],
    solarladegeraet: ["leistung", "anschluss", "weight", "besonderheit"],
    powerbank: ["kapazitaet_wh", "leistung", "anschluss", "weight"],

    // --- camping: light ---
    campinglampe: ["helligkeit_lm", "laufzeit_h", "schutzart_ip", "energieversorgung", "weight"],
    laterne: ["helligkeit_lm", "laufzeit_h", "schutzart_ip", "energieversorgung", "weight"],
    stirnlampe: ["helligkeit_lm", "laufzeit_h", "schutzart_ip", "energieversorgung", "weight"],
    taschenlampe: ["helligkeit_lm", "laufzeit_h", "schutzart_ip", "energieversorgung", "weight"],

    // --- camping: water / hygiene ---
    dusche: ["tankvolumen_l", "schlauchlaenge_m", "durchfluss", "druck", "weight"],
    solardusche: ["tankvolumen_l", "schlauchlaenge_m", "weight", "besonderheit"],
    wasserfilter: ["porengroesse_um", "durchfluss", "weight", "besonderheit"],
    wasserschlauch: ["schlauchlaenge_m", "material", "weight", "besonderheit"],

    // --- camping: toilet ---
    campingtoilette: ["toilettentyp", "tankvolumen_l", "spuelung", "weight", "dimensions"],
    trenntoilette: ["toilettentyp", "tankvolumen_l", "spuelung", "weight", "dimensions"],
    chemietoilette: ["toilettentyp", "tankvolumen_l", "spuelung", "weight", "dimensions"],

    // --- baby/kids: play & sleep ---
    baby: ["age_min_months", "age_max_months", "material", "besonderheit"],
    babyspielzeug: ["age_min_months", "material", "set_size", "besonderheit"],
    greifling: ["age_min_months", "material", "bpa_free", "dishwasher_safe"],
    rassel: ["age_min_months", "material", "sound", "bpa_free"],
    kontrastkarten: ["age_min_months", "set_size", "washable"],
    spielbogen: ["age_min_months", "dimensions", "material", "washable"],
    krabbeldecke: ["age_min_months", "dimensions", "material", "washable"],
    babyschlafsack: ["age_min_months", "tog_rating", "textile_material", "washable"],
    pucktuch: ["age_min_months", "textile_material", "washable"],

    // --- baby/kids: feeding ---
    laetzchen: ["age_min_months", "material", "bpa_free", "dishwasher_safe"],
    teller: ["bpa_free", "dishwasher_safe", "material"],
    besteck: ["bpa_free", "dishwasher_safe", "material", "set_size"],
    becher: ["capacity_ml", "insulated", "bpa_free", "dishwasher_safe"],
    babyflasche: ["capacity_ml", "bpa_free", "dishwasher_safe", "material"],

    // --- baby/kids: night & monitor ---
    nachtlicht: ["power_source", "battery_type", "light_mode", "laufzeit_h"],
    babyphone: ["power_source", "battery_type", "sound", "mounting_type"],

    // --- baby/kids: safety ---
    schutzgitter: ["gate_width_min_cm", "gate_width_max_cm", "gate_height_cm", "mounting_method"],
    treppenschutzgitter: ["gate_width_min_cm", "gate_width_max_cm", "gate_height_cm", "mounting_method"],
    tuerschutzgitter: ["gate_width_min_cm", "gate_width_max_cm", "gate_height_cm", "mounting_method"],

    // --- baby/kids: car seat ---
    kindersitz: ["car_seat_group", "rear_facing", "isofix", "weight"],
    reboarder: ["car_seat_group", "rear_facing", "isofix", "weight"],
    sitzerhoehung: ["car_seat_group", "isofix", "weight"],
	
	// --- pets: generic ---
	hund: ["groesse", "material", "dimensions", "weight", "besonderheit"],
	hunde: ["groesse", "material", "dimensions", "weight", "besonderheit"],
	katze: ["groesse", "material", "dimensions", "weight", "besonderheit"],
	katzen: ["groesse", "material", "dimensions", "weight", "besonderheit"],
	nager: ["material", "dimensions", "weight", "besonderheit"],
	hamster: ["material", "dimensions", "weight", "besonderheit"],
	meerschweinchen: ["material", "dimensions", "weight", "besonderheit"],
	kaninchen: ["material", "dimensions", "weight", "besonderheit"],
	vogel: ["material", "dimensions", "weight", "besonderheit"],
	terrarium: ["material", "dimensions", "weight", "besonderheit"],

	// --- feeding ---
	napf: ["material", "capacity_ml", "dimensions", "besonderheit"],
	futternapf: ["material", "capacity_ml", "dimensions", "besonderheit"],
	trinknapf: ["material", "capacity_ml", "dimensions", "besonderheit"],
	futterautomat: ["power_source", "capacity_ml", "dimensions", "besonderheit"],
	wasserbrunnen: ["power_source", "capacity_ml", "dimensions", "besonderheit"],
	futterdose: ["material", "volumen", "besonderheit"],
	leckmatte: ["material", "dishwasher_safe", "dimensions", "besonderheit"],

	// --- walking / safety ---
	leine: ["laenge_cm", "material", "besonderheit"],
	rollleine: ["laenge_cm", "weight", "besonderheit"],
	schleppleine: ["laenge_cm", "material", "besonderheit"],
	halsband: ["groesse", "material", "besonderheit"],
	geschirr: ["groesse", "material", "besonderheit"],
	maulkorb: ["groesse", "material", "besonderheit"],

	// --- transport / car ---
	transportbox: ["dimensions", "weight", "material", "besonderheit"],
	transporttasche: ["dimensions", "weight", "material", "besonderheit"],
	autositz: ["dimensions", "weight", "material", "besonderheit"],
	autoschondecke: ["dimensions", "material", "washable", "besonderheit"],

	// --- sleep / home ---
	hundebett: ["dimensions", "material", "washable", "besonderheit"],
	katzennbett: ["dimensions", "material", "washable", "besonderheit"],
	kratzbaum: ["dimensions", "material", "weight", "besonderheit"],
	kratzbrett: ["dimensions", "material", "besonderheit"],
	katzentoilette: ["dimensions", "material", "besonderheit"],
	katzenklo: ["dimensions", "material", "besonderheit"],
	katzenstreu: ["menge", "material", "besonderheit"],
	streu: ["menge", "material", "besonderheit"],
	
	spaten: ["arbeitsbreite_cm", "stielmaterial", "kopfmaterial", "weight"],
	hacke: ["arbeitsbreite_cm", "stielmaterial", "kopfmaterial", "weight"],
	rechen: ["arbeitsbreite_cm", "stielmaterial", "kopfmaterial", "weight"],
	säge: ["klingenlaenge_cm", "material", "weight"],

	bewässer: ["durchfluss", "druck", "rohrdurchmesser_mm", "gewinde"],
	regner: ["durchfluss", "druck", "anschluss"],
	tropf: ["rohrdurchmesser_mm", "durchfluss"],

	weidezaun: ["impulsenergie_j", "zaunlaenge_km", "energieversorgung"],
	weidezaungerät: ["impulsenergie_j", "zaunlaenge_km", "energieversorgung"],

	hühnerstall: ["dimensions", "material", "tierart"],
	tränke: ["fassungsvermoegen_l", "material", "automatik"],

	dörrautomat: ["temperaturbereich_c", "leistung", "energieversorgung"],
	einkochtopf: ["volumen", "material", "energieversorgung"],

    // --- party/events: decor ---
    geburtstag: ["occasion", "theme", "set_size", "farbe", "material"],
    hochzeit: ["occasion", "theme", "material", "personalization"],
    babyshower: ["occasion", "theme", "set_size", "farbe"],
    taufe: ["occasion", "theme", "personalization", "material"],
    kommunion: ["occasion", "theme", "personalization", "material"],
    konfirmation: ["occasion", "theme", "personalization", "material"],
    silvester: ["occasion", "theme", "set_size", "light_mode"],
    oktoberfest: ["occasion", "theme", "set_size", "material"],
    halloween: ["occasion", "theme", "size", "material", "light_mode"],
    weihnacht: ["occasion", "theme", "material", "light_mode"],

    girlande: ["theme", "set_size", "material", "farbe"],
    banner: ["theme", "set_size", "material", "farbe"],
    wimpel: ["theme", "set_size", "material", "farbe"],
    luftballon: ["set_size", "farbe", "dimensions", "light_mode"],
    ballon: ["set_size", "farbe", "dimensions", "light_mode"],
    konfetti: ["set_size", "material", "farbe"],
    streudeko: ["set_size", "material", "farbe"],

    kerze: ["set_size", "material", "theme"],
    topper: ["theme", "material", "set_size"],
    cake: ["theme", "material", "set_size"],

    serviette: ["set_size", "material", "farbe"],
    teller: ["set_size", "material", "farbe"],
    becher: ["set_size", "material", "capacity_ml", "insulated"],
    besteck: ["set_size", "material", "farbe"],

    gaestebuch: ["material", "dimensions", "personalization"],
    gästebuch: ["material", "dimensions", "personalization"],
    fotoalbum: ["material", "dimensions", "personalization"],
    erinnerungsbox: ["material", "dimensions", "personalization"],
    zeitkapsel: ["material", "dimensions", "personalization"],

    // --- party/events: outdoor & tech (aus deiner KW-Liste) ---
    thermobecher: ["insulated", "capacity_ml", "material", "weight"],
    thermoflasche: ["insulated", "capacity_ml", "material", "weight"],
    isolierkanne: ["insulated", "capacity_ml", "material", "weight"],
    lautsprecher: ["power_source", "battery_type", "weight", "besonderheit"],

    // --- cleaning: consumables ---
    reiniger: ["surface", "volumen", "material", "besonderheit"],
    entkalker: ["surface", "volumen", "besonderheit"],
    schimmel: ["surface", "volumen", "besonderheit"],
    flecken: ["surface", "volumen", "besonderheit"],
    spuelmaschine: ["surface", "set_size", "volumen"],
    waschmaschine: ["surface", "volumen", "besonderheit"],

    // --- cleaning: tools ---
    schwamm: ["material", "set_size", "besonderheit"],
    buerste: ["material", "dimensions", "besonderheit"],
    bürste: ["material", "dimensions", "besonderheit"],
    mopp: ["material", "dimensions", "besonderheit"],
    wischer: ["material", "dimensions", "besonderheit"],
    eimer: ["volumen", "material", "besonderheit"],
    fenster: ["dimensions", "material", "besonderheit"],
    abzieher: ["dimensions", "material", "besonderheit"],

    // --- cleaning: vacuums/robots ---
    staubsauger: ["power_source", "battery_type", "leistung", "suction_pa", "noise_db", "runtime_min", "gewicht"],
    saugroboter: ["runtime_min", "filter_type", "noise_db", "besonderheit", "battery_type"],
    wischroboter: ["runtime_min", "volumen", "noise_db", "besonderheit"],
    fensterroboter: ["runtime_min", "noise_db", "besonderheit"],

    // --- cleaning: steam/pressure ---
    dampfreiniger: ["leistung", "volumen", "material", "besonderheit"],
    hochdruckreiniger: ["druck", "durchfluss", "leistung", "cable_length_m", "besonderheit"],

    // --- air (smell/mold) ---
    luftreiniger: ["filter_type", "noise_db", "leistung", "runtime_min"],
    luftentfeuchter: ["volumen", "noise_db", "leistung", "runtime_min"],

    // --- waste ---
    muelleimer: ["volumen", "material", "sensor", "besonderheit"],
    mülleimer: ["volumen", "material", "sensor", "besonderheit"],
    muelltrennung: ["volumen", "material", "besonderheit"],

    // --- storage/organization ---
    aufbewahrungsbox: ["volumen", "dimensions", "material", "stackable", "airtight"],
    organizer: ["dimensions", "material", "stackable", "besonderheit"],
    regal: ["dimensions", "material", "traglast", "besonderheit"],
    schuhschrank: ["dimensions", "material", "besonderheit"],


    // --- auto: dashcam / cameras ---
    dashcam: ["video_resolution", "camera_channels", "gps", "wifi", "parking_mode", "night_vision", "storage_gb"],
    rückfahrkamera: ["display_size_in", "wifi", "vehicle_fit", "besonderheit"],
    rueckfahrkamera: ["display_size_in", "wifi", "vehicle_fit", "besonderheit"],
    park: ["parking_mode", "device_type", "display_size_in", "besonderheit"],

    // --- auto: OBD / diagnostics ---
    obd: ["obd_functions", "app_control", "bluetooth", "besonderheit"],
    diagnose: ["obd_functions", "app_control", "bluetooth", "besonderheit"],

    // --- auto: TPMS / tires ---
    tpms: ["tpms_frequency_mhz", "battery_type", "besonderheit"],
    reifendruck: ["tpms_frequency_mhz", "battery_type", "besonderheit"],

    // --- auto: anti-theft ---
    diebstahl: ["security_type", "material", "besonderheit"],
    lenkrad: ["security_type", "material", "besonderheit"],
    keyless: ["security_type", "besonderheit"],

    // --- auto: power / inverter / jump starter ---
    wechselrichter: ["output_power_w", "peak_power_w", "input_voltage_v", "output_voltage_v", "usb_ports", "ac_outlets", "weight"],
    inverter: ["output_power_w", "peak_power_w", "input_voltage_v", "output_voltage_v", "usb_ports", "ac_outlets", "weight"],
    starthilfe: ["jump_current_a", "kapazitaet_wh", "capacity_mah", "charge_power_w", "weight"],
    batterie: ["charger_type", "charge_current_a", "charge_power_w", "besonderheit"],

    // --- auto: coolers ---
    kühlbox: ["kuehlbox_typ", "volumen", "energieversorgung", "leistung", "weight"],
    kuehlbox: ["kuehlbox_typ", "volumen", "energieversorgung", "leistung", "weight"],

    // --- auto: roof / carriers / towing ---
    dachbox: ["volumen", "traglast", "dimensions", "weight", "besonderheit"],
    dachträger: ["traglast", "vehicle_fit", "material", "weight"],
    dachtraeger: ["traglast", "vehicle_fit", "material", "weight"],
    fahrradträger: ["traglast", "vehicle_fit", "weight", "besonderheit"],
    fahrradtraeger: ["traglast", "vehicle_fit", "weight", "besonderheit"],
    anhängerkupplung: ["vehicle_fit", "material", "weight", "besonderheit"],
    anhaenger: ["vehicle_fit", "material", "besonderheit"],

    // --- auto: compressor / tire repair ---
    kompressor: ["druck", "durchfluss", "energieversorgung", "weight", "besonderheit"],
    reifen: ["druck", "besonderheit", "weight"],

    // --- auto: interior / covers / organization ---
    sitzbezug: ["vehicle_fit", "material", "besonderheit"],
    fußmatten: ["vehicle_fit", "material", "set_size"],
    fussmatten: ["vehicle_fit", "material", "set_size"],
    kofferraum: ["vehicle_fit", "dimensions", "material", "besonderheit"],

    // --- auto: lighting ---
    led: ["light_type", "color_temp_k", "energieversorgung", "besonderheit"],

    // --- auto: EV charging ---
    wallbox: ["charging_power_kw", "ev_connector_type", "app_control", "rfid", "mid_meter", "load_management"],
    typ2: ["ev_connector_type", "cable_length_m", "charging_power_kw"],
    ladekabel: ["ev_connector_type", "cable_length_m", "charging_power_kw"],
      // --- fashion: tops ---
      tshirt: ["material", "fit", "size", "farbe", "sleeve_length"],
      "t-shirt": ["material", "fit", "size", "farbe", "sleeve_length"],
      langarm: ["material", "fit", "size", "farbe", "sleeve_length"],
      hoodie: ["material", "fit", "size", "hood", "lining", "season"],
      sweatshirt: ["material", "fit", "size", "season"],
      pullover: ["material", "fit", "size", "neckline", "season"],
      cardigan: ["material", "fit", "size", "closure", "season"],
      bluse: ["material", "fit", "size", "sleeve_length"],
      hemd: ["material", "fit", "size", "sleeve_length", "closure"],

      // --- fashion: bottoms ---
      jeans: ["leg_fit", "waist_rise", "size", "material", "stretch"],
      cargo: ["leg_fit", "size", "material", "pockets"],
      jogger: ["fit", "size", "material", "stretch"],
      leggings: ["stretch", "size", "material", "season"],
      rock: ["length", "size", "material", "farbe"],
      kleid: ["length", "size", "material", "season"],
      blazer: ["fit", "size", "material", "lining"],
      anzug: ["fit", "size", "material", "lining"],

      // --- fashion: outerwear ---
      jacke: ["season", "waterproof", "windproof", "insulation", "material", "fit", "size"],
      parka: ["season", "insulation", "waterproof", "windproof", "fit", "size"],
      regenjacke: ["waterproof", "windproof", "breathability", "fit", "size"],
      daunen: ["insulation", "season", "fit", "size"],
      softshell: ["windproof", "breathability", "waterproof", "fit", "size"],
      ski: ["insulation", "waterproof", "breathability", "season", "fit", "size"],

      // --- fashion: shoes ---
      sneaker: ["shoe_size", "fit", "upper_material", "sole_material", "season"],
      laufs: ["shoe_size", "fit", "upper_material", "sole_material", "breathability"],
      stiefel: ["shoe_size", "upper_material", "sole_material", "boot_shaft_height", "season"],
      sandalen: ["shoe_size", "upper_material", "sole_material", "fit"],
      pumps: ["shoe_size", "heel_height_cm", "toe_shape", "upper_material"],
      heels: ["shoe_size", "heel_height_cm", "toe_shape", "upper_material"],
      loafer: ["shoe_size", "upper_material", "sole_material", "fit"],

      // --- fashion: accessories ---
      guertel: ["material", "size", "farbe"],
      gürtel: ["material", "size", "farbe"],
      socken: ["material", "size", "season"],
      strumpfhose: ["material", "size", "season"],

      tasche: ["bag_volume_l", "material", "dimensions", "strap_type"],
      rucksack: ["bag_volume_l", "material", "dimensions", "strap_type"],

      uhr: ["watch_movement", "case_size_mm", "band_material", "wasserfestigkeit"],
      sonnenbrille: ["polarized", "uv_protection", "material"],
"akku": [
    "battery_type",
    "battery_capacity",
    "voltage",
    "charge_time",
    "battery_included",
    "charger_included"
  ],
  "bohr": [
    "torque",
    "no_load_speed",
    "impact_rate",
    "max_drilling_diameter",
    "chuck_size",
    "battery_capacity",
    "voltage"
  ],
  "säge": [
    "blade_diameter",
    "cutting_depth",
    "no_load_speed",
    "battery_capacity",
    "voltage"
  ],
  "fahrrad": [
    "wheel_size",
    "frame_size",
    "gear_count",
    "brake_type",
    "suspension"
  ],
  "drucker": [
    "ink_type",
    "paper_size",
    "paper_gsm",
    "sheet_count"
  ],
  "papier": [
    "paper_size",
    "paper_gsm",
    "sheet_count"
  ],
  "staubsauger": [
    "suction_power",
    "tank_volume",
    "noise_level",
    "cable_length",
    "hose_length"
  ],
  "kompressor": [
    "pressure",
    "air_flow",
    "tank_volume",
    "power_consumption"
  ],
  "hochdruck": [
    "pressure",
    "hose_length",
    "power_consumption"
  ],
  "kühlbox": [
    "capacity",
    "power_consumption"
  ],
  // --- Chemiefrei / Haushalt / Pflege ---
zahnbuerste: ["material", "plastic_free", "bpa_free"],
zahnpasta: ["fluoride_free", "fragrance_free", "microplastic_free"],
zahnpulver: ["fluoride_free", "fragrance_free", "microplastic_free"],
zahnseide: ["plastic_free", "material"],
deo: ["aluminum_free", "fragrance_free"],
deodorant: ["aluminum_free", "fragrance_free"],
shampoo: ["silicone_free", "paraben_free", "microplastic_free", "fragrance_free"],
conditioner: ["silicone_free", "paraben_free", "microplastic_free", "fragrance_free"],
duschgel: ["microplastic_free", "paraben_free", "fragrance_free"],
seife: ["fragrance_free", "microplastic_free"],
lotion: ["paraben_free", "mineral_oil_free", "fragrance_free"],
creme: ["paraben_free", "mineral_oil_free", "fragrance_free"],
trinkflasche: ["material", "capacity_ml", "leak_proof", "dishwasher_safe", "bpa_free", "plastic_free"],
brotdose: ["material", "capacity_ml", "air_tight", "dishwasher_safe", "bpa_free", "plastic_free"],
lunchbox: ["material", "capacity_ml", "air_tight", "dishwasher_safe", "bpa_free", "plastic_free"],

// --- Fitness ---
kurzhantel: ["weight", "material"],
langhantel: ["weight", "material", "laenge_cm"],
kettlebell: ["weight", "material"],
hantelbank: ["max_user_weight_kg", "dimensions", "weight"],
laufband: ["max_speed_kmh", "incline_percent", "max_user_weight_kg", "power_watts"],
crosstrainer: ["flywheel_mass_kg", "max_user_weight_kg", "dimensions", "weight"],
ergometer: ["flywheel_mass_kg", "max_user_weight_kg", "dimensions", "weight"],
rudergeraet: ["resistance_system", "max_user_weight_kg", "dimensions", "weight"],
stepper: ["max_user_weight_kg", "dimensions", "weight"],

// --- Beleuchtung ---
led_streifen: ["strip_length_m", "color_temp_k", "power_watts", "led_count"],
led_strip: ["strip_length_m", "color_temp_k", "power_watts", "led_count"],
lichterkette: ["strip_length_m", "power_source", "weatherproof"],
gluehbirne: ["socket_type", "power_watts", "color_temp_k", "lumen"],
e27: ["socket_type", "power_watts", "color_temp_k", "lumen"],
e14: ["socket_type", "power_watts", "color_temp_k", "lumen"],
gu10: ["socket_type", "power_watts", "color_temp_k", "lumen"],
g9: ["socket_type", "power_watts", "color_temp_k", "lumen"],

// --- PV / Notstrom ---
balkonkraftwerk: ["power_watts", "connector_type", "mppt"],
solarpanel: ["power_watts", "connector_type"],
powerstation: ["capacity_wh", "power_watts", "peak_power_w", "pure_sine_wave", "weight"],
notstromaggregat: ["power_watts", "peak_power_w", "noise_db", "fuel_type", "weight"],
  },
},

physicalSpec: [
  { key: "energieversorgung", priority: 10 },
  { key: "leistung", priority: 20 },
  { key: "weight", priority: 40 },
  { key: "dimensions", priority: 50 },

  // --- camping: physical specs ---
  { key: "volumen", priority: 55 },
  { key: "kapazitaet_wh", priority: 56 },
  { key: "wassersaeule_aussenzelt", priority: 57 },
  { key: "wassersaeule_boden", priority: 58 },
  { key: "komforttemperatur", priority: 59 },
  { key: "limittemperatur", priority: 60 },
  { key: "r_wert", priority: 61 },
  { key: "dicke", priority: 62 },
  { key: "helligkeit_lm", priority: 63 },
  { key: "laufzeit_h", priority: 64 },
  { key: "tankvolumen_l", priority: 65 },
  { key: "schlauchlaenge_m", priority: 66 },
  { key: "porengroesse_um", priority: 67 },

  // --- baby/kids: physical-ish specs ---
  { key: "capacity_ml", priority: 68 },
  { key: "gate_width_min_cm", priority: 69 },
  { key: "gate_width_max_cm", priority: 70 },
  { key: "gate_height_cm", priority: 71 },
  { key: "tog_rating", priority: 72 },
  { key: "age_min_months", priority: 73 },
  { key: "age_max_months", priority: 74 },
  { key: "set_size", priority: 75 },

  // baseline
  { key: "material", priority: 80 },
  { key: "menge", priority: 90 },
  { key: "anzahl", priority: 92 },
  { key: "farbe", priority: 95 },
  { key: "besonderheit", priority: 100 },
  
  { key: "laenge_cm", priority: 76 },
  { key: "groesse", priority: 77 },

  // --- hobbyfarmer / self-supply: physical-ish specs ---
  { key: "arbeitsbreite_cm", priority: 68 },
  { key: "klingenlaenge_cm", priority: 69 },
  { key: "fassungsvermoegen_l", priority: 70 },
  { key: "rohrdurchmesser_mm", priority: 71 },
  { key: "filterfeinheit_um", priority: 72 },
  { key: "impulsenergie_j", priority: 73 },
  { key: "zaunlaenge_km", priority: 74 },
  { key: "ausgangsspannung_v", priority: 75 },
  { key: "temperaturbereich_c", priority: 76 },
  
    // --- party/events: physical-ish specs ---
  { key: "set_size", priority: 76 },
  { key: "capacity_ml", priority: 77 },
  { key: "insulated", priority: 78 },
  { key: "size", priority: 79 },

  // --- cleaning/organization: physical-ish specs ---
  { key: "volumen", priority: 54 },
  { key: "capacity_ml", priority: 55 },
  { key: "runtime_min", priority: 56 },
  { key: "noise_db", priority: 57 },
  { key: "suction_pa", priority: 58 },
  { key: "cable_length_m", priority: 59 },
  { key: "filter_type", priority: 60 },

  // --- auto: physical-ish specs ---
  { key: "video_resolution", priority: 52 },
  { key: "display_size_in", priority: 53 },
  { key: "storage_gb", priority: 54 },
  { key: "output_power_w", priority: 55 },
  { key: "peak_power_w", priority: 56 },
  { key: "charging_power_kw", priority: 57 },
  { key: "jump_current_a", priority: 58 },
  { key: "capacity_mah", priority: 59 },
  { key: "tpms_frequency_mhz", priority: 60 },
  { key: "color_temp_k", priority: 61 },
  { key: "audio_rms_w", priority: 62 },
  { key: "impedance_ohm", priority: 63 },
    // --- fashion: physical-ish specs ---
  { key: "size", priority: 52 },
  { key: "shoe_size", priority: 53 },
  { key: "fit", priority: 54 },
  { key: "material", priority: 70 },

  { key: "heel_height_cm", priority: 72 },
  { key: "bag_volume_l", priority: 73 },
  { key: "case_size_mm", priority: 74 },

  { key: "upper_material", priority: 75 },
  { key: "lining", priority: 76 },

  { key: "waterproof", priority: 77 },
  { key: "windproof", priority: 78 },
  { key: "breathability", priority: 79 },
  { key: "insulation", priority: 80 },

  { key: "polarized", priority: 81 },
  { key: "uv_protection", priority: 82 },
{ key: "wattage", priority: 20 },
  { key: "power_consumption", priority: 20 },
  { key: "voltage", priority: 21 },
  { key: "amperage", priority: 22 },
  { key: "torque", priority: 30 },
  { key: "battery_capacity", priority: 40 },
  { key: "capacity", priority: 40 },
  { key: "range", priority: 41 },
  { key: "tank_volume", priority: 42 },
  { key: "pressure", priority: 43 },
  { key: "air_flow", priority: 44 },
  { key: "suction_power", priority: 45 },
  { key: "noise_level", priority: 46 },
  { key: "cable_length", priority: 47 },
  { key: "hose_length", priority: 48 },
  { key: "wheel_size", priority: 50 },
  { key: "frame_size", priority: 51 },
  { key: "gear_count", priority: 52 },
  { key: "brake_type", priority: 53 },
  { key: "suspension", priority: 54 },
  { key: "blade_diameter", priority: 55 },
  { key: "cutting_depth", priority: 56 },
  { key: "stroke_length", priority: 57 },
  { key: "impact_rate", priority: 58 },
  { key: "no_load_speed", priority: 59 },
  { key: "max_drilling_diameter", priority: 60 },
  { key: "chuck_size", priority: 61 },
  { key: "paper_size", priority: 70 },
  { key: "paper_gsm", priority: 71 },
  { key: "sheet_count", priority: 72 },
  { key: "page_count", priority: 73 },
  { key: "binding_type", priority: 74 },
  { key: "ink_type", priority: 75 },
  { key: "energy_class", priority: 80 },
  { key: "max_temperature", priority: 81 },
  { key: "temperature_range", priority: 82 },
  { key: "charge_time", priority: 83 },
  { key: "battery_type", priority: 84 },
  { key: "battery_included", priority: 85 },
  { key: "charger_included", priority: 86 },
  { key: "set_includes", priority: 90 }


],


  limits: {
    maxColumns: 4, // + "Modell" = 5 total
    maxCellChars: 140,
  },

  policies: {
    weight: {
      canonicalKey: "weight",
      forbiddenSourceKeys: ["packageweight", "shippingweight"],
    },
  },
};
