import os
from PIL import Image
from collections import deque

def flood_fill_transparent(in_path, out_path, tolerance=240):
    img = Image.open(in_path).convert('RGBA')
    w, h = img.size
    pixels = img.load()

    visited = set()
    queue = deque()

    # Seed from outer border perimeter
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    def is_bg(r, g, b, a):
        return r >= tolerance and g >= tolerance and b >= tolerance

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited:
            continue
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        visited.add((x, y))

        r, g, b, a = pixels[x, y]
        if is_bg(r, g, b, a):
            pixels[x, y] = (0, 0, 0, 0)
            for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                if (nx, ny) not in visited and 0 <= nx < w and 0 <= ny < h:
                    queue.append((nx, ny))

    img.save(out_path, 'PNG')
    print(f"Transparency processed: {out_path}")

if __name__ == '__main__':
    orig_path = '/home/kalpra/.gemini/antigravity-ide/brain/b30e1067-254f-442c-b51b-a4c88bf2be70/.user_uploaded/media_1790921696644.png'
    flood_fill_transparent(orig_path, 'src/assets/hospai-logo.png')
    flood_fill_transparent(orig_path, 'public/hospai-logo.png')
    flood_fill_transparent(orig_path, 'public/logo.png')

    # Also make sure Kalpra logo has transparent outer background
    kalpra_path = 'src/assets/Kalpra-logo.png'
    if os.path.exists(kalpra_path):
        flood_fill_transparent(kalpra_path, 'src/assets/Kalpra-logo.png')
        flood_fill_transparent(kalpra_path, 'public/kalpra_logo.png')
        flood_fill_transparent(kalpra_path, 'public/Kalpra-logo.png')
