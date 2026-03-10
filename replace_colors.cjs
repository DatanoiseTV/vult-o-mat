const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  { p: /#ffcc00/gi, r: 'var(--accent-primary)' },
  { p: /rgba\(255,\s*204,\s*0,/gi, r: 'rgba(var(--accent-primary-rgb),' },
  { p: /#1e1e1e/gi, r: 'var(--bg-base)' },
  { p: /#252526/gi, r: 'var(--bg-surface)' }
];

walk(dir, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.css') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    replacements.forEach(({p, r}) => {
      content = content.replace(p, r);
    });
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
