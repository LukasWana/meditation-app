#!/usr/bin/env node

/**
 * Automated Dead Code Cleanup Script
 * Odstraňuje mrtvý kód, komentované importy a deprecated soubory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../src');

console.log('🚀 Starting automated dead code cleanup...');

// 1. Remove commented imports and exports
function removeCommentedCode(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove commented imports
    const commentedImportRegex = /^[\s]*\/\/\s*import.*$/gm;
    if (commentedImportRegex.test(content)) {
      content = content.replace(commentedImportRegex, '');
      modified = true;
    }

    // Remove commented exports
    const commentedExportRegex = /^[\s]*\/\/\s*export.*$/gm;
    if (commentedExportRegex.test(content)) {
      content = content.replace(commentedExportRegex, '');
      modified = true;
    }

    // Remove commented code blocks
    const commentedCodeRegex = /^[\s]*\/\*[\s\S]*?\*\//gm;
    if (commentedCodeRegex.test(content)) {
      content = content.replace(commentedCodeRegex, '');
      modified = true;
    }

    // Remove empty lines that might be left
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Cleaned: ${path.relative(srcDir, filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
  }
}

// 2. Remove deprecated files
function removeDeprecatedFiles() {
  const deprecatedFiles = [
    'services/cacheService.js',
    'hooks/useOptimizedPreloader.js',
    'components/MetadataMonitor.jsx'
  ];

  deprecatedFiles.forEach(file => {
    const filePath = path.join(srcDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Removed deprecated file: ${file}`);
    }
  });
}

// 3. Fix import statements
function fixImportStatements(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix cacheService imports
    if (content.includes('cacheService') && content.includes('from')) {
      content = content.replace(
        /import\s+.*cacheService.*from\s+['"]\.\/services\/cacheService['"]/g,
        'import { cacheServiceRefactored as cacheService } from "./services/cacheServiceRefactored"'
      );
      modified = true;
    }

    // Fix useOptimizedPreloader imports
    if (content.includes('useOptimizedPreloader')) {
      content = content.replace(
        /import\s+.*useOptimizedPreloader.*from.*$/gm,
        '// useOptimizedPreloader removed - using useBackgroundDataLoader instead'
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`🔧 Fixed imports: ${path.relative(srcDir, filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing imports in ${filePath}:`, error.message);
  }
}

// 4. Process all JavaScript/JSX files
function processFiles(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processFiles(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      removeCommentedCode(filePath);
      fixImportStatements(filePath);
    }
  });
}

// Main execution
try {
  console.log('🧹 Removing commented code...');
  processFiles(srcDir);

  console.log('🗑️ Removing deprecated files...');
  removeDeprecatedFiles();

  console.log('✅ Dead code cleanup completed successfully!');
  console.log('📊 Summary:');
  console.log('  - Removed commented imports/exports');
  console.log('  - Removed commented code blocks');
  console.log('  - Removed deprecated files');
  console.log('  - Fixed import statements');

} catch (error) {
  console.error('❌ Cleanup failed:', error.message);
  process.exit(1);
}


