import fs from 'fs';
import path from 'path';

console.log('Running post-build optimizations...');

const distDir = path.join(process.cwd(), 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.warn('dist/index.html not found, skipping post-build processing.');
  process.exit(0);
}

// 1. Generate 404.html for GitHub Pages SPA client-side routing fallback
try {
  const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
  fs.writeFileSync(path.join(distDir, '404.html'), indexContent);
  console.log('✓ Created dist/404.html for GitHub Pages SPA routing.');
} catch (err) {
  console.warn('Failed to copy 404.html:', err);
}

// 2. Ensure .nojekyll exists in dist for GitHub Pages
try {
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
  console.log('✓ Created dist/.nojekyll for GitHub Pages asset processing.');
} catch (err) {
  console.warn('Failed to create .nojekyll:', err);
}

// 3. Generate standalone single-file final.html
try {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  const assetsDir = path.join(distDir, 'assets');

  let cssContent = '';
  let jsContent = '';

  if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir);
    for (const file of assetFiles) {
      const filePath = path.join(assetsDir, file);
      if (file.endsWith('.css')) {
        cssContent += fs.readFileSync(filePath, 'utf8') + '\n';
      } else if (file.endsWith('.js')) {
        jsContent += fs.readFileSync(filePath, 'utf8') + '\n';
      }
    }
  }

  // Remove original script and link tags from html
  html = html.replace(/<script type="module" crossorigin src="\/assets\/[^"]+"><\/script>/g, '');
  html = html.replace(/<link rel="stylesheet" crossorigin href="\/assets\/[^"]+">/g, '');
  html = html.replace(/<link rel="modulepreload" crossorigin href="\/assets\/[^"]+">/g, '');

  // Inject CSS into <head>
  if (cssContent) {
    const styleTag = `\n    <style>\n${cssContent}\n    </style>\n`;
    html = html.split('</head>').join(`${styleTag}</head>`);
  }

  // Escape </script> inside JS
  if (jsContent) {
    jsContent = jsContent.replace(/<\/script>/g, '<\\/script>');
    const scriptTag = `\n    <script>\n${jsContent}\n    </script>\n`;
    html = html.split('</body>').join(`${scriptTag}</body>`);
  }

  fs.writeFileSync('final.html', html);
  fs.writeFileSync(path.join(distDir, 'final.html'), html);
  console.log('✓ Generated standalone final.html build.');
} catch (err) {
  console.warn('Standalone final.html generation notice:', err);
}
