// Title-keyword categorisation. Keys align with the backend's true_cost_table.json
// so /true-cost lookups get the right footprint per category.

export const CATEGORY_LABELS: Record<string, string> = {
  fast_fashion_top: 'Tops & Apparel',
  jeans: 'Jeans & Bottoms',
  dress: 'Dresses',
  shoes: 'Shoes',
  electronics_small: 'Electronics',
  default: 'Other',
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

// Order matters: more specific garment words win before the generic top/shirt bucket.
const RULES: [RegExp, string][] = [
  [/jean|pant|trouser|legging|shorts|skirt|chino/i, 'jeans'],
  [/dress|gown/i, 'dress'],
  [/shoe|sneaker|boot|sandal|heel|trainer|loafer/i, 'shoes'],
  [/top|tee\b|t-shirt|shirt|blouse|hoodie|jacket|sweater|cardigan|knit|coat|bra\b/i, 'fast_fashion_top'],
  [
    /earbud|headphone|charger|cable|speaker|watch|mouse|keyboard|usb|phone|laptop|tablet|monitor|camera|drone|power ?bank|console|adapter/i,
    'electronics_small',
  ],
];

export function categorize(title: string): string {
  for (const [re, cat] of RULES) {
    if (re.test(title)) return cat;
  }
  return 'default';
}

// ---- Broad categories (spending tracker) ----

export const BROAD_LABELS: Record<string, string> = {
  electronics: 'Electronics',
  clothes: 'Clothes',
  food: 'Food',
  beverages: 'Beverages',
  medicine: 'Medicine',
  stationery: 'Stationery',
  home: 'Home',
  other: 'Other',
};

// Fixed slot assignment from the validated categorical palette — color follows the
// entity, never its rank in the current chart. "Other" wears muted ink, not a series hue.
export const BROAD_COLORS: Record<string, string> = {
  electronics: '#2a78d6',
  clothes: '#1baf7a',
  food: '#eda100',
  beverages: '#008300',
  medicine: '#4a3aa7',
  stationery: '#e34948',
  home: '#e87ba4',
  other: '#898781',
};

// Order matters: medicine before food ("vitamin gummies"), beverages before food
// ("coffee beans"), clothes before stationery ("pencil skirt").
const BROAD_RULES: [RegExp, string][] = [
  [
    /vitamin|supplement|paracetamol|ibuprofen|aspirin|panadol|nurofen|capsule|medicin|pharmac|bandage|first aid/i,
    'medicine',
  ],
  [
    /coffee|tea\b|juice|soda|cola|soft drink|energy drink|kombucha|beer|wine|spirit|smoothie|drink/i,
    'beverages',
  ],
  [
    /snack|chocolate|chip|biscuit|cookie|pasta|rice|cereal|noodle|sauce|candy|lolly|protein bar|granola|food/i,
    'food',
  ],
  [
    /jean|pant|trouser|legging|shorts|skirt|chino|dress|gown|shoe|sneaker|boot|sandal|heel|trainer|loafer|top|tee\b|t-shirt|shirt|blouse|hoodie|jacket|sweater|cardigan|knit|coat|bra\b|sock|scarf|belt|hat\b|glove|bag\b|apparel/i,
    'clothes',
  ],
  [
    /earbud|headphone|charger|cable|speaker|watch|mouse|keyboard|usb|phone|laptop|tablet|monitor|camera|drone|power ?bank|console|adapter|electronic/i,
    'electronics',
  ],
  [
    /pencil|pen\b|notebook|paper|stationery|marker|eraser|stapler|binder|diary|highlighter/i,
    'stationery',
  ],
  [
    /pillow|blanket|curtain|candle|vase|mug|plate|pan\b|pot\b|towel|sheet|rug|furniture|desk|chair|shelf|storage|organis/i,
    'home',
  ],
];

export function broadCategorize(title: string): string {
  for (const [re, cat] of BROAD_RULES) {
    if (re.test(title)) return cat;
  }
  return 'other';
}
