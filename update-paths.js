import fs from 'fs';
import path from 'path';

const srcDir = './src';

// Get all HTML files
const htmlFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.html'));

htmlFiles.forEach(file => {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update stylesheet path
  content = content.replace(
    /<link[^>]*href=["']styles\.css["'][^>]*>/g,
    '<link rel="stylesheet" href="./styles/styles.css">'
  );
  
  // Update script path
  content = content.replace(
    /<script[^>]*src=["']script\.js["'][^>]*>/g,
    '<script type="module" src="./js/script.js"></script>'
  );
  
  // Update image paths
  content = content.replace(
    /src=["']Figure_2\.png["']/g,
    'src="./assets/Figure_2.png"'
  );
  
  // Update navigation links to remove .html
  content = content.replace(
    /href=["']([^"']+)\.html["']/g,
    (match, p1) => `href="/${p1}"`
  );
  
  // Special case for index
  content = content.replace(/href=["']\/index["']/g, 'href="/"');
  
  fs.writeFileSync(filePath, content);
}); 