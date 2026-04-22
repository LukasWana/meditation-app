/**
 * Language Filtering Verification Script
 *
 * Tento skript ověřuje, jak funguje jazykové filtrování v slovaDataService
 */

const testCases = [
  {
    description: 'SK user with SK file',
    userLanguage: 'sk',
    fileName: 'SK/meditacia.mp3',
    expected: true
  },
  {
    description: 'SK user with CZ file',
    userLanguage: 'sk',
    fileName: 'CZ/meditacia.mp3',
    expected: false
  },
  {
    description: 'SK user with EN file',
    userLanguage: 'sk',
    fileName: 'EN/meditation.mp3',
    expected: false
  },
  {
    description: 'SK user with file without language marker',
    userLanguage: 'sk',
    fileName: 'meditacia.mp3',
    expected: true
  },
  {
    description: 'CZ user with CZ file',
    userLanguage: 'cz',
    fileName: 'CZ/meditacia.mp3',
    expected: true
  },
  {
    description: 'CZ user with SK file',
    userLanguage: 'cz',
    fileName: 'SK/meditacia.mp3',
    expected: false
  },
  {
    description: 'CZ user with file without language marker',
    userLanguage: 'cz',
    fileName: 'meditacia.mp3',
    expected: false
  },
  {
    description: 'EN user with EN file',
    userLanguage: 'en',
    fileName: 'EN/meditation.mp3',
    expected: true
  },
  {
    description: 'EN user with SK file',
    userLanguage: 'en',
    fileName: 'SK/meditacia.mp3',
    expected: false
  }
];

function currentFilteringLogic(fileName, userLanguage) {
  const languageMap = { 'sk': 'sk', 'SK': 'sk', 'cz': 'cz', 'CZ': 'cz', 'en': 'en', 'EN': 'en' };
  const normalizedUserLang = languageMap[userLanguage] || 'sk';

  let languageMatch = false;
  if (normalizedUserLang === 'sk') {
    languageMatch = fileName.includes('SK') ||
      (!fileName.includes('CZ') && !fileName.includes('EN'));
  } else if (normalizedUserLang === 'cz') {
    languageMatch = fileName.includes('CZ');
  } else if (normalizedUserLang === 'en') {
    languageMatch = fileName.includes('EN');
  }

  return languageMatch;
}

function proposedFilteringLogic(fileName, userLanguage, fileLanguage) {
  const languageMap = { 'sk': 'sk', 'SK': 'sk', 'cz': 'cz', 'CZ': 'cz', 'en': 'en', 'EN': 'en' };
  const normalizedUserLang = languageMap[userLanguage] || 'sk';
  const targetLang = normalizedUserLang.toUpperCase();

  // Use language property if available
  if (fileLanguage) {
    return fileLanguage === targetLang;
  }

  // Fallback to filename check
  if (normalizedUserLang === 'sk') {
    return fileName.includes('SK') ||
      (!fileName.includes('CZ') && !fileName.includes('EN'));
  } else if (normalizedUserLang === 'cz') {
    return fileName.includes('CZ');
  } else if (normalizedUserLang === 'en') {
    return fileName.includes('EN');
  }

  return false;
}

console.log('='.repeat(80));
console.log('LANGUAGE FILTERING VERIFICATION');
console.log('='.repeat(80));

console.log('\n📊 Testing CURRENT implementation:\n');

let currentPass = 0;
let currentFail = 0;

testCases.forEach((test, i) => {
  const actual = currentFilteringLogic(test.fileName, test.userLanguage);
  const passed = actual === test.expected;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const expectedStr = test.expected ? 'SHOW' : 'HIDE';
  const actualStr = actual ? 'SHOW' : 'HIDE';

  if (passed) {
    currentPass++;
    console.log(`${status} ${i + 1}. ${test.description}`);
  } else {
    currentFail++;
    console.log(`${status} ${i + 1}. ${test.description}`);
    console.log(`   File: ${test.fileName}`);
    console.log(`   User: ${test.userLanguage.toUpperCase()}`);
    console.log(`   Expected: ${expectedStr}, Got: ${actualStr}`);
  }
});

console.log(`\nCurrent: ${currentPass} passed, ${currentFail} failed`);

console.log('\n' + '='.repeat(80));
console.log('\n📊 Testing PROPOSED implementation (using language property):\n');

let proposedPass = 0;
let proposedFail = 0;

testCases.forEach((test, i) => {
  // Simulate that files have language property set by fastMetadataService
  const fileLanguage = test.fileName.includes('/') ? test.fileName.split('/')[0] : null;
  const actual = proposedFilteringLogic(test.fileName, test.userLanguage, fileLanguage);
  const passed = actual === test.expected;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const expectedStr = test.expected ? 'SHOW' : 'HIDE';
  const actualStr = actual ? 'SHOW' : 'HIDE';

  if (passed) {
    proposedPass++;
    console.log(`${status} ${i + 1}. ${test.description}`);
  } else {
    proposedFail++;
    console.log(`${status} ${i + 1}. ${test.description}`);
    console.log(`   File: ${test.fileName}`);
    console.log(`   User: ${test.userLanguage.toUpperCase()}`);
    console.log(`   File Language: ${fileLanguage || 'NOT SET'}`);
    console.log(`   Expected: ${expectedStr}, Got: ${actualStr}`);
  }
});

console.log(`\nProposed: ${proposedPass} passed, ${proposedFail} failed`);

console.log('\n' + '='.repeat(80));
console.log('\n🔍 ANALYSIS:\n');

if (currentFail === 0) {
  console.log('✅ Current implementation is CORRECT');
  console.log('   The filtering logic works as expected for folder structure (LANG/file.mp3)');
} else {
  console.log('❌ Current implementation has BUGS');
  console.log('   See failed tests above for details');
}

console.log('\n💡 HYPOTHESIS:');
console.log('   If only SOME languages are loading, the problem might be:');
console.log('   1. Firebase Storage structure (folders might be missing)');
console.log('   2. Metadata generation (files not processed)');
console.log('   3. Language detection (files not tagged with correct language)');
console.log('   4. Case sensitivity (SK vs Sk vs sk)');

console.log('\n🔧 NEXT STEPS:');
console.log('   1. Run: node verify-language-filtering.js');
console.log('   2. Open: debug-metadata-loading.html in browser');
console.log('   3. Check browser console for Firebase structure');
console.log('   4. Check if language property is set correctly');
console.log('   5. Verify metadata generation completed');

console.log('\n' + '='.repeat(80));
