const fs = require('fs');
const path = require('path');

const CANVAS_FILE = 'canvas.json';
const SONG_DIR = 'Song';
const ALBUM_DIR = 'Album';

function validate() {
  console.log('--- Starting canvas.json validation ---');

  if (!fs.existsSync(CANVAS_FILE)) {
    const errorMsg = `Error: ${CANVAS_FILE} not found!`;
    console.error(errorMsg);
    fs.writeFileSync('validation_report.md', `### ❌ Validation Failed\n\n${errorMsg}`);
    process.exit(1);
  }

  let data;
  try {
    const content = fs.readFileSync(CANVAS_FILE, 'utf8');
    data = JSON.parse(content);
  } catch (err) {
    const errorMsg = `Error Parsing JSON: ${err.message}`;
    console.error(errorMsg);
    fs.writeFileSync('validation_report.md', `### ❌ Validation Failed\n\n**JSON Parse Error:** ${err.message}`);
    process.exit(1);
  }

  if (!data.items || !Array.isArray(data.items)) {
    const errorMsg = `Error: 'items' array missing or invalid in ${CANVAS_FILE}`;
    console.error(errorMsg);
    fs.writeFileSync('validation_report.md', `### ❌ Validation Failed\n\n${errorMsg}`);
    process.exit(1);
  }

  const items = data.items;
  const errors = [];
  const seen = new Set();

  items.forEach((item, index) => {
    const { song, artist, url } = item;

    // 1. Missing fields
    if (!song || !artist || !url) {
      errors.push({ index, song: song || 'N/A', artist: artist || 'N/A', error: 'Missing required fields' });
      return;
    }

    // 2. Duplicates
    const key = `${song.toLowerCase()}|${artist.toLowerCase()}`;
    if (seen.has(key)) {
      errors.push({ index, song, artist, error: 'Duplicate song/artist entry' });
    } else {
      seen.add(key);
    }

    // 3. Extension check
    const urlLower = url.toLowerCase();
    if (!urlLower.endsWith('.m3u8') && !urlLower.endsWith('.mp4')) {
      errors.push({ index, song, artist, error: `Invalid file extension (must be .m3u8 or .mp4)` });
    }

    // 4. Local file existence check
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const match = pathname.match(/\/(Song|Album)\/(.+)$/i);
      
      if (match) {
        const directory = match[1];
        const filename = match[2];
        const localPath = path.join(directory, filename);
        if (!fs.existsSync(localPath)) {
          errors.push({ index, song, artist, error: `Referenced file does not exist: '${localPath}'` });
        }
      } else {
        errors.push({ index, song, artist, error: `URL does not follow repository structure (/Song/ or /Album/)` });
      }
    } catch (err) {
      errors.push({ index, song, artist, error: `Invalid URL format` });
    }
  });

  let reportContent = '';

  if (errors.length > 0) {
    console.error('\n--- Validation FAILED! ---');
    reportContent = `### ❌ Validation Failed\n\nFound **${errors.length}** issues in \`canvas.json\`. Please fix them to proceed:\n\n`;
    reportContent += '| Index | Song | Artist | Error Description |\n';
    reportContent += '|---|---|---|---|\n';
    errors.forEach(err => {
      reportContent += `| ${err.index} | ${err.song} | ${err.artist} | ${err.error} |\n`;
      console.error(`- [Item ${err.index}] ${err.error}`);
    });
    
    fs.writeFileSync('validation_report.md', reportContent);
    process.exit(1);
  } else {
    console.log('\n--- Validation PASSED! ---');
    reportContent = `### ✅ Validation Passed!\n\nInformed the developer, shortly it will be merged.`;
    fs.writeFileSync('validation_report.md', reportContent);
    console.log(`${items.length} items verified successfully.`);
  }
}

validate();
