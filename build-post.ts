import fs from 'fs';
import path from 'path';

console.log('Generating final.html...');

const distDir = path.join(process.cwd(), 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

const assetsDir = path.join(distDir, 'assets');
const assetFiles = fs.readdirSync(assetsDir);

let cssContent = '';
let jsContent = '';

// Read assets
for (const file of assetFiles) {
  const filePath = path.join(assetsDir, file);
  if (file.endsWith('.css')) {
    cssContent += fs.readFileSync(filePath, 'utf8') + '\n';
  } else if (file.endsWith('.js')) {
    jsContent += fs.readFileSync(filePath, 'utf8') + '\n';
  }
}

// Remove original script and link tags from html
html = html.replace(/<script type="module" crossorigin src="\/assets\/[^"]+"><\/script>/g, '');
html = html.replace(/<link rel="stylesheet" crossorigin href="\/assets\/[^"]+">/g, '');

// Also remove modulepreload links
html = html.replace(/<link rel="modulepreload" crossorigin href="\/assets\/[^"]+">/g, '');

// Inject CSS into <head>
const styleTag = `\n    <style>\n${cssContent}\n    </style>\n`;
html = html.split('</head>').join(`${styleTag}</head>`);

// Escape </script> inside the JS to prevent prematurely closing the injected script block
jsContent = jsContent.replace(/<\/script>/g, '<\\/script>');

// Inject JS at the end of <body> to run AFTER #root is rendered
const scriptTag = `\n    <script>\n${jsContent}\n    </script>\n`;
html = html.split('</body>').join(`${scriptTag}</body>`);

fs.writeFileSync('final.html', html);
console.log('final.html generated successfully.');
