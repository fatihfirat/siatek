import { Product } from '../types';

/**
 * Normalizes text for Turkish-aware, diacritics-insensitive, and case-insensitive search.
 * Handles:
 * - 'ı', 'i', 'İ', 'I' -> 'i'
 * - 'ğ', 'Ğ' -> 'g'
 * - 'ü', 'Ü' -> 'u'
 * - 'ş', 'Ş' -> 's'
 * - 'ö', 'Ö' -> 'o'
 * - 'ç', 'Ç' -> 'c'
 * - Circumflex vowels 'â', 'î', 'û' -> 'a', 'i', 'u'
 * - Punctuation normalization
 */
export function normalizeSearchText(text: any): string {
  if (text == null) return '';
  let str = '';
  if (typeof text === 'string') {
    str = text;
  } else if (typeof text === 'object' && 'target' in text && typeof (text as any).target?.value === 'string') {
    str = (text as any).target.value;
  } else {
    str = String(text);
  }
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .replace(/['"`´’]/g, '') // remove quotes
    .replace(/[-_.,;:!?()[\]{}]/g, ' ') // replace punctuation with space to separate words
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if a single query token matches a target word or phrase, with exact, prefix, substring, or fuzzy match.
 */
export function matchTokenAgainstWords(
  queryToken: string,
  targetWords: string[],
  fullTargetNormalized: string
): { matched: boolean; score: number } {
  if (!queryToken) return { matched: true, score: 0 };

  // 1. Direct full phrase substring match (fastest)
  if (fullTargetNormalized.includes(queryToken)) {
    // If it's at word boundary or exact word match
    const isExactWord = targetWords.includes(queryToken);
    const startsWord = targetWords.some(w => w.startsWith(queryToken));
    return {
      matched: true,
      score: isExactWord ? 100 : startsWord ? 80 : 60,
    };
  }

  // 2. Exact or prefix match with any target word
  for (const word of targetWords) {
    if (word === queryToken) {
      return { matched: true, score: 100 };
    }
    if (word.startsWith(queryToken)) {
      return { matched: true, score: 85 };
    }
    if (word.includes(queryToken)) {
      return { matched: true, score: 65 };
    }
  }

  // 3. Typo / Fuzzy tolerance for tokens with length >= 3
  const tokenLen = queryToken.length;
  if (tokenLen >= 3) {
    let bestDist = Infinity;
    let bestScore = 0;

    for (const word of targetWords) {
      // Compare with prefix of equal length if word is longer
      if (word.length >= tokenLen) {
        const wordPrefix = word.slice(0, tokenLen);
        const dist = levenshteinDistance(queryToken, wordPrefix);
        const maxAllowed = tokenLen <= 4 ? 1 : 2;
        if (dist <= maxAllowed && dist < bestDist) {
          bestDist = dist;
          bestScore = 60 - dist * 15;
        }
      }

      // Also compare full word if lengths are close (diff <= 2)
      if (Math.abs(word.length - tokenLen) <= 2) {
        const dist = levenshteinDistance(queryToken, word);
        const maxAllowed = tokenLen <= 4 ? 1 : 2;
        if (dist <= maxAllowed && dist < bestDist) {
          bestDist = dist;
          bestScore = 55 - dist * 15;
        }
      }
    }

    if (bestDist !== Infinity) {
      return { matched: true, score: bestScore };
    }
  }

  return { matched: false, score: 0 };
}

export interface ProductSearchResult {
  product: Product;
  score: number;
  matchedFields: string[];
}

/**
 * Evaluates match quality and score of a product against a search query.
 */
export function scoreProductMatch(product: Product, rawQuery: string): ProductSearchResult | null {
  const normQuery = normalizeSearchText(rawQuery);
  if (!normQuery) {
    return { product, score: 0, matchedFields: [] };
  }

  const queryTokens = normQuery.split(' ').filter(t => t.length > 0);
  if (queryTokens.length === 0) {
    return { product, score: 0, matchedFields: [] };
  }

  // Prepare normalized target fields and word lists
  const normName = normalizeSearchText(product.name);
  const nameWords = normName.split(' ').filter(Boolean);

  const normSku = normalizeSearchText(product.sku);
  const normBarcode = normalizeSearchText(product.barcode || '');
  const normCategory = normalizeSearchText(product.category);
  const normSubCategory = normalizeSearchText(product.subCategory || '');
  const normDesc = normalizeSearchText(product.description);
  const descWords = normDesc.split(' ').filter(Boolean);

  // Exact SKU or Barcode Match bonus
  if (normSku === normQuery || normBarcode === normQuery) {
    return {
      product,
      score: 1000,
      matchedFields: [normSku === normQuery ? 'sku' : 'barcode'],
    };
  }

  if (normSku.includes(normQuery) || (normBarcode && normBarcode.includes(normQuery))) {
    return {
      product,
      score: 800,
      matchedFields: [normSku.includes(normQuery) ? 'sku' : 'barcode'],
    };
  }

  // Full query exact phrase matches in name
  let totalScore = 0;
  const matchedFieldsSet = new Set<string>();

  if (normName.startsWith(normQuery)) {
    totalScore += 400;
    matchedFieldsSet.add('name');
  } else if (normName.includes(normQuery)) {
    totalScore += 250;
    matchedFieldsSet.add('name');
  }

  // Verify that EVERY token in the search query matches at least one attribute of the product
  let allTokensMatched = true;

  for (const token of queryTokens) {
    let tokenMatched = false;
    let tokenScore = 0;

    // Check SKU
    if (normSku.includes(token)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 200);
      matchedFieldsSet.add('sku');
    }

    // Check Barcode
    if (normBarcode && normBarcode.includes(token)) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, 180);
      matchedFieldsSet.add('barcode');
    }

    // Check Name words
    const nameMatch = matchTokenAgainstWords(token, nameWords, normName);
    if (nameMatch.matched) {
      tokenMatched = true;
      tokenScore = Math.max(tokenScore, nameMatch.score * 2.2);
      matchedFieldsSet.add('name');
    }

    // Check SubCategory
    if (normSubCategory) {
      const subCatWords = normSubCategory.split(' ').filter(Boolean);
      const subMatch = matchTokenAgainstWords(token, subCatWords, normSubCategory);
      if (subMatch.matched) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, subMatch.score * 1.2);
        matchedFieldsSet.add('subCategory');
      }
    }

    // Check Category
    if (normCategory) {
      const catWords = normCategory.split(' ').filter(Boolean);
      const catMatch = matchTokenAgainstWords(token, catWords, normCategory);
      if (catMatch.matched) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, catMatch.score * 0.9);
        matchedFieldsSet.add('category');
      }
    }

    // Check Description words
    if (!tokenMatched && descWords.length > 0) {
      const descMatch = matchTokenAgainstWords(token, descWords, normDesc);
      if (descMatch.matched) {
        tokenMatched = true;
        tokenScore = Math.max(tokenScore, descMatch.score * 0.7);
        matchedFieldsSet.add('description');
      }
    }

    if (!tokenMatched) {
      allTokensMatched = false;
      break;
    }

    totalScore += tokenScore;
  }

  if (!allTokensMatched) {
    return null;
  }

  // Extra priority boosts
  if (product.stock > 0) {
    totalScore += 10; // In-stock bonus
  }
  if (product.featured) {
    totalScore += 5; // Featured bonus
  }

  return {
    product,
    score: totalScore,
    matchedFields: Array.from(matchedFieldsSet),
  };
}

export function searchProductsWithFuzzy(
  products: Product[],
  query: string | any,
  options?: {
    category?: string;
    subCategory?: string;
    inStockOnly?: boolean;
    limit?: number;
  }
): ProductSearchResult[] {
  let productList: Product[] = Array.isArray(products) ? products : [];
  let rawQuery = query;

  // Handle swapped parameters if passed (query, products)
  if (!Array.isArray(products) && Array.isArray(query)) {
    productList = query;
    rawQuery = products;
  }

  let strQuery = '';
  if (typeof rawQuery === 'string') {
    strQuery = rawQuery;
  } else if (rawQuery && typeof rawQuery === 'object' && 'target' in rawQuery && typeof (rawQuery as any).target?.value === 'string') {
    strQuery = (rawQuery as any).target.value;
  } else if (rawQuery != null) {
    strQuery = String(rawQuery);
  }

  const normQuery = strQuery.trim();
  const categoryFilter = options?.category && options.category !== 'all' ? options.category : null;
  const subCatFilter = options?.subCategory || null;
  const inStockFilter = options?.inStockOnly || false;

  const results: ProductSearchResult[] = [];

  for (const product of productList) {
    if (!product) continue;
    // Category checks
    if (categoryFilter && product.category !== categoryFilter) {
      continue;
    }
    if (subCatFilter && product.subCategory !== subCatFilter) {
      continue;
    }
    if (inStockFilter && product.stock <= 0) {
      continue;
    }

    if (!normQuery) {
      results.push({ product, score: 0, matchedFields: [] });
      continue;
    }

    const match = scoreProductMatch(product, normQuery);
    if (match) {
      results.push(match);
    }
  }

  // Sort by score descending (if searching)
  if (normQuery) {
    results.sort((a, b) => b.score - a.score);
  }

  if (options?.limit && options.limit > 0) {
    return results.slice(0, options.limit);
  }

  return results;
}
