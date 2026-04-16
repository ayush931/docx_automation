import nspell from 'nspell';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SpellError } from '@/types';

const globalForSpellChecker = global as unknown as {
  checkerUs: nspell | undefined;
  checkerUk: nspell | undefined;
  initPromise: Promise<void> | undefined;
};

let checkerUs = globalForSpellChecker.checkerUs;
let checkerUk = globalForSpellChecker.checkerUk;
let initPromise = globalForSpellChecker.initPromise;

async function loadDictionaryFiles(dialect: 'us' | 'gb'): Promise<{ aff: Buffer; dic: Buffer }> {
  const packageName = dialect === 'us' ? 'dictionary-en-us' : 'dictionary-en-gb';
  const dictionaryDir = path.join(process.cwd(), 'node_modules', packageName);
  const [aff, dic] = await Promise.all([
    readFile(path.join(dictionaryDir, 'index.aff')),
    readFile(path.join(dictionaryDir, 'index.dic'))
  ]);

  return { aff, dic };
}

async function initCheckers() {
  if (checkerUs && checkerUk) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const [usDict, gbDict] = await Promise.all([
        loadDictionaryFiles('us'),
        loadDictionaryFiles('gb')
      ]);

      checkerUs = nspell(usDict);
      checkerUk = nspell(gbDict);

      if (process.env.NODE_ENV !== 'production') {
        globalForSpellChecker.checkerUs = checkerUs;
        globalForSpellChecker.checkerUk = checkerUk;
        globalForSpellChecker.initPromise = initPromise;
      }
    } catch (error) {
      console.error('initCheckers failed:', error);
      initPromise = undefined;
      throw error;
    }
  })();

  return initPromise;
}

export const getSpellChecker = async (dialect: 'us' | 'uk') => {
  await initCheckers();
  return dialect === 'us' ? checkerUs! : checkerUk!;
};

async function checkParagraph(paragraph: string, paragraphIndex: number, dialect: 'us' | 'uk'): Promise<SpellError[]> {
  const checker = await getSpellChecker(dialect);
  const errors: SpellError[] = [];

  // 1. Spell Check
  const wordRegex = /\b[a-zA-Z']+\b/g;
  let match;

  while ((match = wordRegex.exec(paragraph)) !== null) {
    const word = match[0];
    if (!checker.correct(word)) {
      const suggestions = checker.suggest(word).slice(0, 5);
      errors.push({
        word,
        type: 'spelling',
        index: match.index,
        paragraph: paragraphIndex,
        offset: match.index,
        suggestions,
        dialect,
        message: `Possible spelling error in ${dialect.toUpperCase()} English.`
      });
    }
  }

  // 2. Punctuation Checks
  // - Double spaces
  const doubleSpaceRegex = /[ ]{2,}/g;
  while ((match = doubleSpaceRegex.exec(paragraph)) !== null) {
    errors.push({
      word: match[0],
      type: 'punctuation',
      index: match.index,
      paragraph: paragraphIndex,
      offset: match.index,
      suggestions: [' '],
      dialect,
      message: 'Double space detected.'
    });
  }

  // - Space before punctuation
  const spaceBeforePuncRegex = /[ ]+[,.?!]/g;
  while ((match = spaceBeforePuncRegex.exec(paragraph)) !== null) {
    const punc = match[0].trim();
    errors.push({
      word: match[0],
      type: 'punctuation',
      index: match.index,
      paragraph: paragraphIndex,
      offset: match.index,
      suggestions: [punc],
      dialect,
      message: `Unnecessary space before punctuation '${punc}'.`
    });
  }

  // - Missing space after punctuation
  const missingSpaceAfterRegex = /[,.?!][a-zA-Z]/g;
  while ((match = missingSpaceAfterRegex.exec(paragraph)) !== null) {
    const punc = match[0][0];
    const letter = match[0][1];
    errors.push({
      word: match[0],
      type: 'punctuation',
      index: match.index,
      paragraph: paragraphIndex,
      offset: match.index,
      suggestions: [`${punc} ${letter}`],
      dialect,
      message: `Missing space after punctuation '${punc}'.`
    });
  }

  // 3. Style Validation (US/UK formatting)
  // - Dates
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
  while ((match = dateRegex.exec(paragraph)) !== null) {
    const part1 = match[1];
    const part2 = match[2];
    const year = match[3];
    if (parseInt(part1) > 12) {
      if (dialect === 'us') {
        errors.push({
          word: match[0],
          type: 'style',
          index: match.index,
          paragraph: paragraphIndex,
          offset: match.index,
          suggestions: [`${part2}/${part1}/${year}`],
          dialect,
          message: 'US English typically uses MM/DD/YYYY format.'
        });
      }
    } else if (parseInt(part2) > 12) {
      if (dialect === 'uk') {
        errors.push({
          word: match[0],
          type: 'style',
          index: match.index,
          paragraph: paragraphIndex,
          offset: match.index,
          suggestions: [`${part2}/${part1}/${year}`],
          dialect,
          message: 'UK English typically uses DD/MM/YYYY format.'
        });
      }
    }
  }

  // - Currency symbols
  // US usually uses $, UK usually uses £ (if they are specifically talking about local currency)
  // But more specifically, US uses $1,000.00 and UK can use £1,000.00.
  // Actually, US uses . for decimals and , for thousands.
  // UK also uses . for decimals and , for thousands usually, but some other places differ.
  // For simplicity, let's just do a basic "dialect-appropriate currency" check if requested.
  if (dialect === 'us' && paragraph.includes('£')) {
    const currencyRegex = /£(\d+([,.]\d+)?)/g;
    while ((match = currencyRegex.exec(paragraph)) !== null) {
      errors.push({
        word: match[0],
        type: 'style',
        index: match.index,
        paragraph: paragraphIndex,
        offset: match.index,
        suggestions: [`$${match[1]}`],
        dialect,
        message: 'Using £ in US English context.'
      });
    }
  } else if (dialect === 'uk' && paragraph.includes('$')) {
    const currencyRegex = /\$(\d+([,.]\d+)?)/g;
    while ((match = currencyRegex.exec(paragraph)) !== null) {
      errors.push({
        word: match[0],
        type: 'style',
        index: match.index,
        paragraph: paragraphIndex,
        offset: match.index,
        suggestions: [`£${match[1]}`],
        dialect,
        message: 'Using $ in UK English context.'
      });
    }
  }

  return errors;
}

// Word pairs for consistency check
const consistencyPairs = [
  ['advisor', 'adviser'],
  ['acknowledgment', 'acknowledgement'],
  ['judgment', 'judgement'],
  ['percent', 'per cent'],
];

async function checkWordConsistency(text: string, paragraphs: string[], dialect: 'us' | 'uk'): Promise<SpellError[]> {
  const consistencyErrors: SpellError[] = [];

  for (const [v1, v2] of consistencyPairs) {
    const v1Regex = new RegExp(`\\b${v1}\\b`, 'gi');
    const v2Regex = new RegExp(`\\b${v2}\\b`, 'gi');

    const v1Matches = (text.match(v1Regex) || []).length;
    const v2Matches = (text.match(v2Regex) || []).length;

    if (v1Matches > 0 && v2Matches > 0) {
      // Find the minor one
      const minor = v1Matches >= v2Matches ? v2 : v1;
      const dominant = v1Matches >= v2Matches ? v1 : v2;

      const minorRegex = new RegExp(`\\b${minor}\\b`, 'gi');

      paragraphs.forEach((p, pIdx) => {
        minorRegex.lastIndex = 0; // Reset regex state before each paragraph
        let match;
        while ((match = minorRegex.exec(p)) !== null) {
          consistencyErrors.push({
            word: match[0],
            type: 'consistency',
            index: match.index,
            paragraph: pIdx,
            offset: match.index,
            suggestions: [dominant],
            dialect,
            message: `Inconsistent use of '${minor}' vs '${dominant}' in the document.`
          });
        }
      });
    }
  }

  return consistencyErrors;
}

export async function checkSpelling(text: string, dialect: 'us' | 'uk' | 'both'): Promise<SpellError[]> {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let allErrors: SpellError[] = [];

  const [usErrorsArrays, ukErrorsArrays] = await Promise.all([
    Promise.all(paragraphs.map((p, i) => checkParagraph(p, i, 'us'))),
    Promise.all(paragraphs.map((p, i) => checkParagraph(p, i, 'uk')))
  ]);

  const usErrors = usErrorsArrays.flat();
  const ukErrors = ukErrorsArrays.flat();

  if (dialect === 'both') {
    const mergedErrors = [...usErrors, ...ukErrors];
    const map = new Map<string, SpellError>();

    for (const err of mergedErrors) {
      const key = `${err.paragraph}-${err.index}-${err.word}-${err.type}`;
      if (!map.has(key)) {
        map.set(key, err);
      }
    }
    allErrors = Array.from(map.values());

    // For "both", we can check consistency for each dialect or combined
    // But maybe skip consistency for "both" as it's intended to show all
  } else {
    allErrors = dialect === 'us' ? usErrors : ukErrors;

    // Mixed dialect check: if many US errors are actually UK words, or vice versa
    const otherErrors = dialect === 'us' ? ukErrors : usErrors;

    const dialectMismatches = allErrors.filter(err =>
      err.type === 'spelling' && !otherErrors.some(oerr => oerr.word === err.word && oerr.paragraph === err.paragraph && oerr.index === err.index)
    );

    if (dialectMismatches.length > 0) {
      for (const mismatch of dialectMismatches) {
        mismatch.type = 'consistency';
        mismatch.message = `Inconsistent dialect: '${mismatch.word}' is ${dialect === 'us' ? 'UK' : 'US'} spelling, but document is set to ${dialect.toUpperCase()}.`;
      }
    }

    // Word consistency (advisor/adviser)
    const wordConsistencyErrors = await checkWordConsistency(text, paragraphs, dialect);
    allErrors = [...allErrors, ...wordConsistencyErrors];
  }

  return allErrors;
}
