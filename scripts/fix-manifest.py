import json

with open('.twenty/output/manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

def fix_paths(obj):
    if isinstance(obj, str):
        return obj.replace('\\', '/')
    elif isinstance(obj, dict):
        return {k: fix_paths(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix_paths(item) for item in obj]
    return obj

manifest = fix_paths(manifest)

with open('.twenty/output/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print('Fixed manifest paths')
