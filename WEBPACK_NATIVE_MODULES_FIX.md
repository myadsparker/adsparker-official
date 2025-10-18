# Webpack Native Modules Fix

## Problem

When using `sharp` and `@imgly/background-removal-node` in Next.js API routes, you may encounter this error:

```
Module parse failed: Unexpected character '�' (1:2)
You may need an appropriate loader to handle this file type
./node_modules/@imgly/background-removal-node/node_modules/sharp/build/Release/sharp-win32-x64.node
```

## Root Cause

Next.js webpack tries to bundle native Node.js binaries (`.node` files) which cannot be processed by webpack. These are native C++ addons that must be loaded at runtime, not bundled.

## Solution

Configure Next.js to **exclude** these packages from webpack bundling by adding them to:

1. `experimental.serverComponentsExternalPackages` - Tells Next.js not to bundle these
2. `webpack.externals` - Tells webpack to treat them as external modules

### Configuration Added

**`next.config.mjs`**:

```javascript
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'sharp',
      '@imgly/background-removal',
      '@imgly/background-removal-node',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude native binaries from webpack bundling
      config.externals.push({
        sharp: 'commonjs sharp',
        '@imgly/background-removal': 'commonjs @imgly/background-removal',
        '@imgly/background-removal-node':
          'commonjs @imgly/background-removal-node',
      });
    }
    return config;
  },
};
```

## What This Does

### 1. `serverComponentsExternalPackages`

- Tells Next.js server components to **not bundle** these packages
- Keeps them as external dependencies loaded at runtime
- Required for packages with native binaries

### 2. `webpack.externals`

- Tells webpack to **not attempt to bundle** these modules
- Treats them as `commonjs` modules loaded from `node_modules`
- Only applies to server-side builds (`isServer` check)

## How to Apply

1. **Update `next.config.mjs`** with the configuration above
2. **Stop your dev server** (Ctrl+C)
3. **Restart the dev server**:
   ```bash
   npm run dev
   ```

## Verification

After restarting, you should see:

```bash
✔ Compiled successfully
✔ Ready in X.Xs
```

Without the webpack errors about `.node` files.

## Why This Works

### Native Binaries

- `sharp` uses native C++ bindings for image processing
- `@imgly/background-removal-node` depends on sharp
- `.node` files are compiled binaries (not JavaScript)

### Webpack Cannot Bundle

- Webpack is designed for JavaScript/TypeScript
- Native binaries must be:
  - ✅ Installed in `node_modules`
  - ✅ Loaded at runtime
  - ❌ NOT bundled into JavaScript bundles

### External Loading

By marking as external:

- Next.js skips webpack processing
- Modules are loaded directly from `node_modules` at runtime
- Native binaries work correctly

## Common Issues

### Issue 1: Still Getting Errors After Config Change

**Solution**: Make sure you **restarted the dev server**

```bash
# Stop the server (Ctrl+C)
npm run dev  # Start again
```

Config changes in `next.config.mjs` require a restart.

### Issue 2: Errors in Production Build

If you see errors during `npm run build`:

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### Issue 3: Module Not Found in Production

Make sure all packages are in `dependencies` (not `devDependencies`):

```json
{
  "dependencies": {
    "sharp": "^0.33.x",
    "@imgly/background-removal": "^1.x.x",
    "@imgly/background-removal-node": "^1.x.x"
  }
}
```

## Additional Packages

If you add more packages with native binaries in the future, add them to the config:

```javascript
experimental: {
  serverComponentsExternalPackages: [
    'sharp',
    '@imgly/background-removal',
    '@imgly/background-removal-node',
    'your-new-native-package',  // Add here
  ],
},
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals.push({
      'sharp': 'commonjs sharp',
      '@imgly/background-removal': 'commonjs @imgly/background-removal',
      '@imgly/background-removal-node': 'commonjs @imgly/background-removal-node',
      'your-new-native-package': 'commonjs your-new-native-package',  // And here
    });
  }
  return config;
},
```

## Common Native Packages

Other packages that typically need this configuration:

- `sharp` - Image processing
- `canvas` - HTML5 Canvas for Node.js
- `sqlite3` - SQLite database
- `bcrypt` - Password hashing
- `node-sass` - Sass compiler
- Any package with `.node` files

## Vercel/Deployment Notes

### Vercel

These configurations work automatically on Vercel. No additional setup needed.

### Other Platforms

Make sure:

1. Native binaries are installed for the correct platform
2. `node_modules` is deployed (not ignored)
3. Platform supports the native module architectures

## Summary

✅ **Problem**: Webpack can't bundle native `.node` binaries  
✅ **Solution**: Exclude from webpack, load as external modules  
✅ **Configuration**: `serverComponentsExternalPackages` + `webpack.externals`  
✅ **Action Required**: Restart dev server after config change

---

**Fixed**: October 13, 2024  
**Status**: ✅ Working  
**Applies To**: Next.js 13+, Sharp, @imgly/background-removal-node
