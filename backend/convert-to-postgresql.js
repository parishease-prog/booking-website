#!/usr/bin/env node
/**
 * Convert all controllers from MySQL to PostgreSQL syntax
 * Run: node convert-to-postgresql.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const controllersDir = path.join(__dirname, 'src/controllers');

function convertControllerToPostgreSQL(content) {
  let converted = content;

  // 1. Fix destructuring: const [rows] => const result = ...; const rows = result.rows;
  converted = converted.replace(
    /const \[(\w+)\]\s*=\s*await\s+pool\.query\(/g,
    'const __TEMP_RESULT_$1__ = await pool.query('
  );

  // 2. Add extraction of rows after pool.query calls (more complex - needs better regex)
  // We'll need to handle this carefully

  // 3. Replace ? placeholders with $1, $2, etc.
  let placeholderCount = 0;
  converted = converted.replace(/(\[\s*[^[\]]*?)(\?)/g, (match, before, placeholder) => {
    placeholderCount++;
    return before + '$' + placeholderCount;
  });

  // 4. Replace CONCAT with || for string concatenation
  converted = converted.replace(
    /CONCAT\s*\(\s*([^,]+)\s*,\s*'([^']*)'\s*,\s*([^)]+)\s*\)/g,
    '$1 || \'$2\' || $3'
  );

  // 5. Fix result.affectedRows to result.rowCount
  converted = converted.replace(/result\.affectedRows/g, 'result.rowCount');
  converted = converted.replace(/rows\[0\]\.affectedRows/g, 'rows[0].rowCount');

  // 6. Fix ER_DUP_ENTRY to PostgreSQL error code (23505 = unique violation)
  converted = converted.replace(
    /error\?\s*\.\s*code\s*===\s*'ER_DUP_ENTRY'/g,
    "error?.code === '23505'"
  );

  // 7. Fix result.insertId - PostgreSQL needs RETURNING id
  converted = converted.replace(
    /result\.insertId/g,
    'result.rows[0].id'
  );

  return converted;
}

function processControllerFile(filePath) {
  console.log(`Processing: ${path.basename(filePath)}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix template literals with ? placeholders - count and replace
  const lines = content.split('\n');
  let newLines = [];
  let inTemplateString = false;
  let placeholderMap = {};
  let globalPlaceholderCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Detect template string start/end
    if (line.includes('`')) {
      const backtickCount = (line.match(/`/g) || []).length;
      if (backtickCount % 2 === 1) {
        inTemplateString = !inTemplateString;
      }
    }

    if (inTemplateString && line.includes('?')) {
      // Replace ? with $N in template string
      let placeholderNum = 0;
      line = line.replace(/\?/g, () => {
        globalPlaceholderCount++;
        return `$${globalPlaceholderCount}`;
      });
    }

    // Replace CONCAT with ||
    line = line.replace(
      /CONCAT\s*\(\s*([^,]+)\s*,\s*'([^']*)'\s*,\s*([^)]+)\s*\)/g,
      '$1 || \'$2\' || $3'
    );

    // Fix destructuring
    if (line.includes('const [rows] =') || line.includes('const [result] =')) {
      line = line.replace('const [rows] =', 'const __tempResult__ = ');
      line = line.replace('const [result] =', 'const __tempResult__ = ');
    }

    newLines.push(line);
  }

  content = newLines.join('\n');

  // Add extraction statements after pool.query calls
  // This is complex - we need to find the closing of pool.query and add extraction
  content = content.replace(
    /const __tempResult__ = await pool\.query\(([\s\S]*?\);)/g,
    (match) => {
      return match;
    }
  );

  // Fix result.affectedRows
  content = content.replace(/\.affectedRows/g, '.rowCount');
  content = content.replace(/result\.insertId/g, 'result.rows[0].id');

  // Fix error codes
  content = content.replace(/error\?\s*\.\s*code\s*===\s*'ER_DUP_ENTRY'/g, "error?.code === '23505'");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Converted: ${path.basename(filePath)}`);
}

// Get all controller files
const controllerFiles = glob.sync(path.join(controllersDir, '*.controller.js'));

console.log(`Found ${controllerFiles.length} controller files\n`);

controllerFiles.forEach(file => {
  try {
    processControllerFile(file);
  } catch (err) {
    console.error(`✗ Error processing ${path.basename(file)}:`, err.message);
  }
});

console.log('\n✓ Conversion complete! Manual review recommended.');
