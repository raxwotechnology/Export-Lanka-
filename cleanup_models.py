import os

models_dir = r'd:\mobile app\backend\src\models'

for filename in os.listdir(models_dir):
    if filename.endswith('.js'):
        filepath = os.path.join(models_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove double type: String
        new_content = content.replace('type: String,\n        type: String', 'type: String')
        new_content = new_content.replace('type: String, type: String', 'type: String')
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Cleaned {filename}")
