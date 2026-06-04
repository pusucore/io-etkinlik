const groups = {
  A: ['Meksika', 'Güney Afrika', 'Güney Kore', 'Çekya'],
  B: ['Kanada', 'Bosna-Hersek', 'Katar', 'İsviçre'],
  C: ['Brezilya', 'Fas', 'Haiti', 'İskoçya'],
  D: ['ABD', 'Paraguay', 'Avustralya', 'Türkiye'],
  E: ['Almanya', 'Curaçao', 'Fildişi Sahili', 'Ekvador'],
  F: ['Hollanda', 'Japonya', 'İsveç', 'Tunus'],
  G: ['Belçika', 'Mısır', 'İran', 'Yeni Zelanda'],
  H: ['İspanya', 'Yeşil Burun Adaları', 'Suudi Arabistan', 'Uruguay'],
  I: ['Fransa', 'Senegal', 'Irak', 'Norveç'],
  J: ['Arjantin', 'Cezayir', 'Avusturya', 'Ürdün'],
  K: ['Portekiz', 'Demokratik Kongo', 'Özbekistan', 'Kolombiya'],
  L: ['İngiltere', 'Hırvatistan', 'Gana', 'Panama'],
};

const roundOf32Template = [
  { matchNo: 73, home: '2A', away: '2B' },
  { matchNo: 74, home: '1E', away: '3X' },
  { matchNo: 75, home: '1F', away: '2C' },
  { matchNo: 76, home: '1C', away: '2F' },
  { matchNo: 77, home: '1I', away: '3X' },
  { matchNo: 78, home: '2E', away: '2I' },
  { matchNo: 79, home: '1A', away: '3X' },
  { matchNo: 80, home: '1L', away: '3X' },
  { matchNo: 81, home: '1D', away: '3X' },
  { matchNo: 82, home: '1G', away: '3X' },
  { matchNo: 83, home: '2K', away: '2L' },
  { matchNo: 84, home: '1H', away: '2J' },
  { matchNo: 85, home: '1B', away: '3X' },
  { matchNo: 86, home: '1J', away: '2H' },
  { matchNo: 87, home: '1K', away: '3X' },
  { matchNo: 88, home: '2D', away: '2G' },
];

const knockoutTemplate = [
  { matchNo: 89, stage: 'round_of_16', home: 'W74', away: 'W77' },
  { matchNo: 90, stage: 'round_of_16', home: 'W73', away: 'W75' },
  { matchNo: 91, stage: 'round_of_16', home: 'W76', away: 'W78' },
  { matchNo: 92, stage: 'round_of_16', home: 'W79', away: 'W80' },
  { matchNo: 93, stage: 'round_of_16', home: 'W83', away: 'W84' },
  { matchNo: 94, stage: 'round_of_16', home: 'W81', away: 'W82' },
  { matchNo: 95, stage: 'round_of_16', home: 'W86', away: 'W88' },
  { matchNo: 96, stage: 'round_of_16', home: 'W85', away: 'W87' },
  { matchNo: 97, stage: 'quarter_final', home: 'W89', away: 'W90' },
  { matchNo: 98, stage: 'quarter_final', home: 'W91', away: 'W92' },
  { matchNo: 99, stage: 'quarter_final', home: 'W94', away: 'W93' },
  { matchNo: 100, stage: 'quarter_final', home: 'W95', away: 'W96' },
  { matchNo: 101, stage: 'semi_final', home: 'W97', away: 'W98' },
  { matchNo: 102, stage: 'semi_final', home: 'W99', away: 'W100' },
  { matchNo: 103, stage: 'third_place', home: 'L101', away: 'L102' },
  { matchNo: 104, stage: 'final', home: 'W101', away: 'W102' },
];

const nextMatchMap = {
  74: { next: 89, slot: 'home' },
  77: { next: 89, slot: 'away' },
  73: { next: 90, slot: 'home' },
  75: { next: 90, slot: 'away' },
  76: { next: 91, slot: 'home' },
  78: { next: 91, slot: 'away' },
  79: { next: 92, slot: 'home' },
  80: { next: 92, slot: 'away' },
  83: { next: 93, slot: 'home' },
  84: { next: 93, slot: 'away' },
  81: { next: 94, slot: 'home' },
  82: { next: 94, slot: 'away' },
  86: { next: 95, slot: 'home' },
  88: { next: 95, slot: 'away' },
  85: { next: 96, slot: 'home' },
  87: { next: 96, slot: 'away' },
  89: { next: 97, slot: 'home' },
  90: { next: 97, slot: 'away' },
  91: { next: 98, slot: 'home' },
  92: { next: 98, slot: 'away' },
  94: { next: 99, slot: 'home' },
  93: { next: 99, slot: 'away' },
  95: { next: 100, slot: 'home' },
  96: { next: 100, slot: 'away' },
  101: { next: 104, slot: 'home' },
  102: { next: 104, slot: 'away' },
};

const thirdPlaceMap = {
  101: { next: 103, slot: 'home' },
  102: { next: 103, slot: 'away' },
};

const THIRD_SLOT_MATCHES = [74, 77, 79, 80, 81, 82, 85, 87];

const STAGE_LABELS = {
  round_of_32: 'Son 32',
  round_of_16: 'Son 16',
  quarter_final: 'Çeyrek Final',
  semi_final: 'Yarı Final',
  third_place: 'Üçüncülük',
  final: 'Final',
};

const VALID_MEMBER_STATUSES = new Set(['member', 'administrator', 'creator']);

module.exports = {
  groups,
  roundOf32Template,
  knockoutTemplate,
  nextMatchMap,
  thirdPlaceMap,
  THIRD_SLOT_MATCHES,
  STAGE_LABELS,
  VALID_MEMBER_STATUSES,
};
