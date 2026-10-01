import os
import re

models_dir = r'd:\mobile app\backend\src\models'

def remove_enums(content):
    # Regex to find enum: [ ... ] and replace with type: String
    # Handles multi-line enums as well. DOTALL to match across lines.
    pattern = re.compile(r'enum:\s*\[.*?\]', re.DOTALL)
    new_content = pattern.sub('type: String', content)
    return new_content

for filename in os.listdir(models_dir):
    if filename.endswith('.js'):
        filepath = os.path.join(models_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = remove_enums(content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filename}")
        except Exception as e:
            print(f"Error processing {filename}: {e}")
