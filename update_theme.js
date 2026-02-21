const fs = require('fs');
const file = 'c:\\Users\\user\\Desktop\\zaktalks_v3\\src\\app\\coaching\\coaching.module.css';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/var\(--color-blue-coaching, #1B75BC\)/g, 'var(--color-yellow)');
content = content.replace(/var\(--color-blue-light-coaching, #A9D1E1\)/g, 'var(--color-yellow-light)');
content = content.replace(/#000000/g, 'var(--color-black)');
content = content.replace(/color: var\(--color-white\);/g, 'color: var(--color-black);');

fs.writeFileSync(file, content);
console.log('Theme updated successfully.');
