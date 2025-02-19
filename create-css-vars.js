const fs = require('fs');

// Read and parse JSON files
const readJsonFile = (filename) => {
try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
} catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return {};
}
};

// Flatten nested objects into dot notation
const flattenObject = (obj, prefix = '') => {
return Object.keys(obj).reduce((acc, key) => {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
    // If the object has a $value property, treat it as a leaf node
    if ('$value' in obj[key]) {
        acc[newPrefix] = obj[key].$value;
    } else {
        Object.assign(acc, flattenObject(obj[key], newPrefix));
    }
    } else {
    acc[newPrefix] = obj[key];
    }
    return acc;
}, {});
};

// Resolve color references like {purple.200}
const resolveColorReferences = (value, tokens, globals) => {
if (typeof value !== 'string') return value;

const referenceRegex = /\{([^}]+)\}/g;
return value.replace(referenceRegex, (match, path) => {
    // First check in tokens
    let resolvedValue = path.split('.').reduce((obj, key) => obj?.[key], tokens);
    
    // If not found in tokens, check in globals under the core path
    if (!resolvedValue) {
    const globalPath = `core.${path}`;
    resolvedValue = globalPath.split('.').reduce((obj, key) => obj?.[key], globals);
    
    // If we found an object with a $value property, use that
    if (resolvedValue && typeof resolvedValue === 'object' && '$value' in resolvedValue) {
        resolvedValue = resolvedValue.$value;
    }
    }
    
    return resolvedValue || match;
});
}

// Generate CSS variables
const generateCssVariables = (theme, tokens, globals) => {
const flatTheme = flattenObject(theme);
const cssVars = Object.entries(flatTheme)
    .filter(([key]) => !key.includes('$type'))
    .map(([key, value]) => {
        const resolvedValue = resolveColorReferences(value, tokens, globals);
        return `--${key.replace(/\./g, '-').replace(/-\$value$/, '')}: ${resolvedValue};`;
    });
return cssVars.join('\n');
};

// Main process
const main = () => {
// Read all theme files
const dark = readJsonFile('dark.json');
const tokens = readJsonFile('tokens.json');
const globals = readJsonFile('global.json');

// Write CSS content to file
const writeCssFile = (filename, content) => {
try {
    fs.writeFileSync(filename, content, 'utf8');
    console.log(`Successfully wrote CSS to ${filename}`);
} catch (error) {
    console.error(`Error writing to ${filename}:`, error);
    process.exit(1);
}
};

// Generate CSS variables for dark theme
const darkCss = [
':root {',
'  /* Dark theme variables */',
generateCssVariables(dark, tokens, globals)
    .split('\n')
    .map(line => '  ' + line)
    .join('\n'),
'}'
].join('\n');

writeCssFile('dark.css', darkCss);
};

main();

