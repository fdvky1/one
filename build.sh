#!/bin/bash
set -e

echo "⚙️  [1/4] Generating Master Key..."
# Generate 32 bytes hex for AES-256 (64 characters)
RAW_KEY=$(openssl rand -hex 32)

echo "🔐 [2/4] Injecting Keys to Server config..."
# Simple Obfuscation: reverse the string at compile time
# In Rust, we need to reverse it back
OBFUSCATED_KEY=$(echo -n $RAW_KEY | rev)
export BUILD_TIME_KEY=$OBFUSCATED_KEY

mkdir -p server/utils app/utils public/wasm
cat <<EOF > server/utils/secret.ts
// AUTO-GENERATED DURING BUILD. DO NOT COMMIT.
export const secretKey = "${RAW_KEY}";
EOF

echo "🦀 [3/4] Building Rust WASM (The Decrypter)..."
cd wasm-decrypt
wasm-pack build --target web --out-dir ../public/wasm --no-typescript
cd ..

echo "🔏 Fingerprinting WASM..."
WASM_FILE="public/wasm/wasm_decrypt_bg.wasm"
# Generate SHA256 Hash for cache fingerprinting
if command -v shasum &> /dev/null; then
    HASH=$(shasum -a 256 $WASM_FILE | awk '{print $1}' | cut -c 1-8)
else
    HASH=$(sha256sum $WASM_FILE | awk '{print $1}' | cut -c 1-8)
fi
NEW_WASM="decrypter_${HASH}.wasm"
NEW_JS="decrypter_${HASH}.js"

# Remove old assets if any
find public/wasm -type f \( -name "decrypter_*.wasm" -o -name "decrypter_*.js" \) -delete 2>/dev/null || true

# Rename new files
mv public/wasm/wasm_decrypt_bg.wasm "public/wasm/${NEW_WASM}"
mv public/wasm/wasm_decrypt.js "public/wasm/${NEW_JS}"

# Update wasm target name inside js wrapper
perl -pi -e "s/wasm_decrypt_bg\.wasm/${NEW_WASM}/g" public/wasm/${NEW_JS}

# Export this Hash to Nuxt client-side utilities 
cat <<EOF > app/utils/wasmConfig.ts
// AUTO-GENERATED DURING BUILD. DO NOT COMMIT.
export const WASM_JS_URL = '/wasm/${NEW_JS}';
export const WASM_FILE_URL = '/wasm/${NEW_WASM}';
EOF

echo "🟢 [4/4] Building Nuxt App..."
pnpm install
pnpm build

echo "✅ Build Complete."
