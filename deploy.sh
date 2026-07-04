#!/bin/bash
set -e

cd "/mnt/c/Users/vm_user/Downloads/Documents & Templates/documents-templates"
yarn build
python3 scripts/fix-manifest.py

cd .twenty/output
rm -f *.tgz
npm pack
cd ../..

API_URL=$(grep TWENTY_API_URL .env | cut -d '=' -f2 | tr -d '\r')
API_KEY=$(grep TWENTY_API_KEY .env | cut -d '=' -f2 | tr -d '\r')
TARBALL=$(ls .twenty/output/*.tgz | head -1)

echo "Uploading $TARBALL to $API_URL"
curl -s -X POST "$API_URL/metadata" \
  -H "Authorization: Bearer $API_KEY" \
  -F 'operations={"query":"mutation UploadAppTarball($file: Upload!, $universalIdentifier: String) { uploadAppTarball(file: $file, universalIdentifier: $universalIdentifier) { id name } }","variables":{"file":null,"universalIdentifier":"6eaaf6ac-81f8-5c40-8f27-0d0c70b17500"}}' \
  -F 'map={"0":["variables.file"]}' \
  -F "0=@$TARBALL;type=application/gzip"

echo -e "\nInstalling app..."
echo y | yarn twenty app:install -r opc .
echo "Done!"
