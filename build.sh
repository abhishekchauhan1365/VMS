#!/bin/bash
set -e

echo "Building shared package..."
pnpm --filter=@vms/shared run build

echo "Building web package..."
pnpm --filter=@vms/web run build

echo "Creating Vercel Build Output API structure..."
mkdir -p .vercel/output/static

echo "Copying Vite output to Vercel static directory..."
cp -R apps/web/dist/* .vercel/output/static/

echo "Generating Vercel routing configuration..."
cat << 'EOF' > .vercel/output/config.json
{
  "version": 3,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
EOF

echo "Build complete!"
