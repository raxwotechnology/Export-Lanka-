import os
import re

models_dir = r'd:\mobile app\backend\src\models'

def loosen_constraints(content):
    # Remove required: true or required: [true, '...']
    # Handles various formats: required: true, required: [true, 'message'], required:[true,'msg']
    new_content = re.sub(r'required:\s*(\[true,.*\]|true)', 'required: false', content)
    return new_content

for filename in os.listdir(models_dir):
    if filename.endswith('.js'):
        filepath = os.path.join(models_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = loosen_constraints(content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Loosened {filename}")
