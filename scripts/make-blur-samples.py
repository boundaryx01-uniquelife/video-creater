# 사용: python3 -I scripts/make-blur-samples.py <outDir>   → <outDir>/media/<mode>_<L|P><n>.jpg
# 템플릿 확인용 블러 샘플 이미지 (실제 사진/개인정보 없음)
import sys, os, random, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

out = os.path.join(sys.argv[1], 'media'); os.makedirs(out, exist_ok=True)
hexrgb = lambda h: tuple(int(h[i:i+2], 16) for i in (1, 3, 5))

def gradient(w, h, c1, c2, angle=90):
    a = np.linspace(0, 1, h)[:, None] if angle == 90 else np.linspace(0, 1, w)[None, :]
    a = np.broadcast_to(a, (h, w))[..., None]
    return (np.array(c1) * (1 - a) + np.array(c2) * a).astype('uint8')

def blob(d, rnd, w, h, col, rx, ry, cx=None, cy=None, alpha=255):
    cx = rnd.uniform(0, w) if cx is None else cx; cy = rnd.uniform(0, h) if cy is None else cy
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=col + (alpha,))

SCENES = {
  # 행사: 어두운 홀 + 스포트라이트 + 보케 + 청중 실루엣
  'event': dict(bg=('#14163f', '#4b1f6b'), cols=['#ff7a45', '#ffd27d', '#8a5cff', '#ff4f8b'], kind='stage'),
  # 현장: 하늘 + 콘크리트 구조물 + 안전조끼 주황
  'site': dict(bg=('#7db4e0', '#d8dde2'), cols=['#8d9399', '#b7bcc2', '#f2a900', '#3a3f45'], kind='site'),
  # 매장: 따뜻한 우드 인테리어 + 식물
  'store': dict(bg=('#efe2cf', '#c9a27a'), cols=['#8a5a3b', '#6f8f6a', '#fff6e6', '#3c2f26'], kind='interior'),
  # 상품: 스튜디오 그라데이션 + 오브젝트
  'product': dict(bg=('#eef1f5', '#c9d3df'), cols=['#1f2430', '#3f6df6', '#9ab4ff', '#ffffff'], kind='object'),
  # 여행: 하늘 + 바다 + 산
  'journey': dict(bg=('#6cc1d9', '#f6d9a7'), cols=['#2a77a3', '#4f7a63', '#ffe9b0', '#3b8ea5'], kind='landscape'),
  # 교육: 밝은 교실 + 파스텔
  'education': dict(bg=('#f7f2e4', '#e6dcc3'), cols=['#4a90a4', '#f2b84b', '#7fb069', '#d9685f'], kind='room'),
  # 결산: 봄 파스텔
  'recap': dict(bg=('#cfe3f7', '#f7dce6'), cols=['#f3a6c0', '#7fb069', '#fff0e6', '#8fb7e8'], kind='spring'),
  # 학교: 하늘 + 교사동 + 나무 + 운동장
  'school': dict(bg=('#8cc3ee', '#e6f0e4'), cols=['#e9dcc3', '#b6553f', '#3f8f5a', '#c98f5a'], kind='campus'),
  # 동아리: 보라색 무대 조명
  'club': dict(bg=('#1a0f3d', '#6a2bd9'), cols=['#ff5fa2', '#ffd24a', '#5ae0ff', '#ffffff'], kind='stage'),
  # 졸업: 따뜻한 봄빛
  'grad': dict(bg=('#f6e3c8', '#f3c9c0'), cols=['#f2a6b3', '#ffe9c4', '#c9785e', '#8fb07a'], kind='spring'),
}

def make(mode, n, portrait):
    sc = SCENES[mode]; rnd = random.Random(hash((mode, n, portrait)) & 0xffffff)
    w, h = (900, 1200) if portrait else (1600, 900)
    base = gradient(w, h, hexrgb(sc['bg'][0]), hexrgb(sc['bg'][1]))
    im = Image.fromarray(base).convert('RGBA'); d = ImageDraw.Draw(im, 'RGBA'); cols = [hexrgb(c) for c in sc['cols']]
    k = sc['kind']
    if k == 'stage':
        for i in range(3):  # 스포트라이트 광원
            x = rnd.uniform(0.15, 0.85) * w; d.polygon([(x - 40, 0), (x + 40, 0), (x + rnd.uniform(160, 380), h * 0.85), (x - rnd.uniform(160, 380), h * 0.85)], fill=cols[1] + (26,))
        for i in range(26): blob(d, rnd, w, h, rnd.choice(cols), (r := rnd.uniform(10, 46)), r, alpha=rnd.randint(110, 230))
        for i in range(9): blob(d, rnd, w, h, (8, 8, 20), rnd.uniform(60, 130), rnd.uniform(70, 150), cy=h * rnd.uniform(0.9, 1.05), alpha=255)
    elif k == 'site':
        for i in range(5): x = rnd.uniform(0, w); d.rectangle([x, h * rnd.uniform(0.3, 0.55), x + rnd.uniform(160, 380), h], fill=rnd.choice(cols[:2]) + (255,))
        d.rectangle([0, h * 0.82, w, h], fill=cols[3] + (255,))
        for i in range(4): blob(d, rnd, w, h, cols[2], rnd.uniform(26, 50), rnd.uniform(40, 80), cy=h * rnd.uniform(0.62, 0.85), alpha=255)
        d.line([(w * 0.7, 0), (w * 0.7, h * 0.5)], fill=cols[3] + (255,), width=18)
    elif k == 'interior':
        d.rectangle([0, h * 0.62, w, h], fill=cols[0] + (255,))
        d.rectangle([w * rnd.uniform(0.1, 0.5), h * 0.12, w * rnd.uniform(0.55, 0.9), h * 0.5], fill=cols[2] + (255,))
        for i in range(4): blob(d, rnd, w, h, cols[1], rnd.uniform(60, 130), rnd.uniform(90, 170), cy=h * rnd.uniform(0.5, 0.7), alpha=230)
        for i in range(8): blob(d, rnd, w, h, cols[2], (r := rnd.uniform(14, 36)), r, cy=h * rnd.uniform(0.08, 0.3), alpha=240)
    elif k == 'object':
        cx, cy = w * rnd.uniform(0.35, 0.65), h * 0.55; rx, ry = w * 0.18, h * 0.3
        d.rounded_rectangle([cx - rx, cy - ry, cx + rx, cy + ry], radius=int(rx * 0.5), fill=cols[0] + (255,))
        blob(d, rnd, w, h, cols[1], rx * 0.5, ry * 0.4, cx=cx + rx * 0.25, cy=cy - ry * 0.2, alpha=200); blob(d, rnd, w, h, cols[3], rx * 0.25, ry * 0.5, cx=cx - rx * 0.5, cy=cy - ry * 0.3, alpha=140)
        d.ellipse([cx - rx * 1.5, h * 0.88, cx + rx * 1.5, h * 0.98], fill=(0, 0, 0, 60))
    elif k == 'landscape':
        blob(d, rnd, w, h, cols[2], (r := h * 0.09), r, cx=w * rnd.uniform(0.2, 0.8), cy=h * 0.3, alpha=255)
        d.rectangle([0, h * 0.62, w, h], fill=cols[0] + (255,))
        pts = [(0, h * 0.6)] + [(x, h * (0.5 + 0.12 * math.sin(x / w * rnd.uniform(3, 7) + rnd.random() * 6))) for x in range(0, w + 40, 40)] + [(w, h), (0, h)]
        d.polygon(pts, fill=cols[1] + (255,))
    elif k == 'room':
        d.rectangle([0, h * 0.66, w, h], fill=(200, 170, 130, 255)); d.rectangle([w * 0.55, h * 0.08, w * 0.95, h * 0.45], fill=(255, 255, 255, 240))
        for i in range(7): blob(d, rnd, w, h, rnd.choice(cols), rnd.uniform(40, 90), rnd.uniform(60, 120), cy=h * rnd.uniform(0.55, 0.8), alpha=240)
    elif k == 'campus':
        d.rectangle([0, h * 0.72, w, h], fill=cols[3] + (255,))
        bx = w * rnd.uniform(0.12, 0.3); d.rectangle([bx, h * rnd.uniform(0.28, 0.38), bx + w * rnd.uniform(0.45, 0.6), h * 0.74], fill=cols[0] + (255,))
        for i in range(9): x = bx + 30 + i * (w * 0.055); d.rectangle([x, h * 0.44, x + w * 0.03, h * 0.52], fill=(120, 150, 180, 255)); d.rectangle([x, h * 0.58, x + w * 0.03, h * 0.66], fill=(120, 150, 180, 255))
        d.rectangle([bx, h * 0.26, bx + w * 0.12, h * 0.74], fill=cols[1] + (255,))
        for i in range(6): blob(d, rnd, w, h, cols[2], rnd.uniform(70, 150), rnd.uniform(90, 170), cy=h * rnd.uniform(0.55, 0.72), alpha=245)
    else:  # spring
        for i in range(30): blob(d, rnd, w, h, rnd.choice(cols), (r := rnd.uniform(30, 120)), r * rnd.uniform(0.6, 1), alpha=rnd.randint(120, 230))
    im = im.convert('RGB').filter(ImageFilter.GaussianBlur(radius=int(w * (0.05 if k in ('stage', 'spring', 'landscape') else 0.038))))
    arr = np.asarray(im).astype('int16') + np.random.RandomState(n).normal(0, 3.2, (h, w, 1)).astype('int16')   # 필름 그레인
    Image.fromarray(np.clip(arr, 0, 255).astype('uint8')).save(os.path.join(out, f"{mode}_{'P' if portrait else 'L'}{n}.jpg"), quality=88)

for m in SCENES:
    for n in range(1, 7): make(m, n, False)
    for n in range(1, 5): make(m, n, True)
print('made', len(os.listdir(out)), 'images ->', out)

# ---- 행사 장면별 변형 (event_<kind>_L1..4 / P1..3) ----
EVENT = {
  'keynote': dict(bg=('#10123a', '#47206a'), spot=True, crowd=True, bokeh=['#ff7a45', '#ffd27d', '#8a5cff']),
  'panel': dict(bg=('#0b2a3d', '#1f7a96'), people=4, screen=True, bokeh=['#7fe0ff', '#ffffff']),
  'session': dict(bg=('#1a1a2e', '#3d2b4c'), screen=True, crowd=True, bokeh=['#ffb36b']),
  'expo': dict(bg=('#f6f2ec', '#d6e0ee'), booths=True, cols=['#ff5a3c', '#3f6df6', '#ffd166', '#2dc9a0']),
  'network': dict(bg=('#3a1f1a', '#c9763f'), people=6, bokeh=['#ffd27d', '#fff1c9', '#ff9a5a']),
}
def make_event(kind, n, portrait):
    sc = EVENT[kind]; rnd = random.Random(hash(('ev', kind, n, portrait)) & 0xffffff)
    w, h = (900, 1200) if portrait else (1600, 900)
    im = Image.fromarray(gradient(w, h, hexrgb(sc['bg'][0]), hexrgb(sc['bg'][1]))).convert('RGBA'); d = ImageDraw.Draw(im, 'RGBA')
    if sc.get('spot'):
        for i in range(3):
            x = rnd.uniform(0.15, 0.85) * w; d.polygon([(x - 40, 0), (x + 40, 0), (x + rnd.uniform(160, 380), h * 0.85), (x - rnd.uniform(160, 380), h * 0.85)], fill=(255, 210, 125, 24))
    if sc.get('screen'): d.rectangle([w * rnd.uniform(0.18, 0.35), h * 0.14, w * rnd.uniform(0.65, 0.82), h * 0.5], fill=(230, 240, 255, 235))
    for c in sc.get('bokeh', []):
        for i in range(10): blob(d, rnd, w, h, hexrgb(c), (r := rnd.uniform(12, 42)), r, alpha=rnd.randint(110, 230))
    if sc.get('booths'):
        for i in range(5):
            x = i * w / 5 + rnd.uniform(0, 30); col = hexrgb(rnd.choice(sc['cols'])); d.rectangle([x, h * rnd.uniform(0.28, 0.45), x + w / 5 - 24, h * 0.82], fill=col + (255,)); d.rectangle([x, h * 0.74, x + w / 5 - 24, h * 0.86], fill=(255, 255, 255, 255))
    for i in range(sc.get('people', 0)):
        cx = w * (0.18 + 0.64 * (i + rnd.random() * 0.4) / max(1, sc['people'])); blob(d, rnd, w, h, (20, 22, 30), 70, 150, cx=cx, cy=h * 0.78, alpha=235); blob(d, rnd, w, h, (214, 170, 140), 34, 40, cx=cx, cy=h * 0.58, alpha=235)
    if sc.get('crowd'):
        for i in range(11): blob(d, rnd, w, h, (6, 6, 16), rnd.uniform(60, 120), rnd.uniform(70, 140), cx=w * (i + rnd.random()) / 10.5, cy=h * rnd.uniform(0.92, 1.05), alpha=255)
    im = im.convert('RGB').filter(ImageFilter.GaussianBlur(radius=int(w * 0.038)))
    arr = np.asarray(im).astype('int16') + np.random.RandomState(n).normal(0, 3.2, (h, w, 1)).astype('int16')
    Image.fromarray(np.clip(arr, 0, 255).astype('uint8')).save(os.path.join(out, f"event_{kind}_{'P' if portrait else 'L'}{n}.jpg"), quality=88)

for k in EVENT:
    for n in range(1, 5): make_event(k, n, False)
    for n in range(1, 4): make_event(k, n, True)
print('event variants ->', len([f for f in os.listdir(out) if f.startswith('event_')]))

# ---- 여행지별 변형 (trip_<kind>_L1..3 / P1..2) ----
TRIP = ['tokyo', 'hakone', 'kyoto', 'inari', 'plane']
def make_trip(kind, n, portrait):
    rnd = random.Random(hash(('trip', kind, n, portrait)) & 0xffffff)
    w, h = (900, 1200) if portrait else (1600, 900)
    bgs = {'tokyo': ('#0d1233', '#4a1f66'), 'hakone': ('#79b8e6', '#e8f1f6'), 'kyoto': ('#3a2a1f', '#d99a5b'), 'inari': ('#e8541e', '#7d130c'), 'plane': ('#1b4a7a', '#9fd0f0')}
    im = Image.fromarray(gradient(w, h, hexrgb(bgs[kind][0]), hexrgb(bgs[kind][1]))).convert('RGBA'); d = ImageDraw.Draw(im, 'RGBA')
    if kind == 'tokyo':
        for i in range(14):
            x = rnd.uniform(0, w); bw = rnd.uniform(60, 150); top = h * rnd.uniform(0.25, 0.6); d.rectangle([x, top, x + bw, h], fill=(10, 10, 30, 255))
            for j in range(10):
                wx = x + rnd.uniform(4, max(5, bw - 22)); wy = top + rnd.uniform(10, max(11, h - top - 40))
                d.rectangle([wx, wy, wx + rnd.uniform(8, 16), wy + rnd.uniform(10, 22)], fill=(255, 214, 120, 190))
        for c in ['#ff4f8b', '#34e0ff', '#ffd27d']:
            for i in range(6): blob(d, rnd, w, h, hexrgb(c), (r := rnd.uniform(14, 40)), r, alpha=rnd.randint(120, 220))
    elif kind == 'hakone':
        d.polygon([(w * 0.5 - w * 0.34, h * 0.68), (w * 0.5 - w * 0.04, h * 0.2), (w * 0.5 + w * 0.04, h * 0.2), (w * 0.5 + w * 0.34, h * 0.68)], fill=(240, 244, 250, 255))
        d.polygon([(w * 0.5 - w * 0.34, h * 0.68), (w * 0.5 - w * 0.12, h * 0.42), (w * 0.5 + w * 0.12, h * 0.42), (w * 0.5 + w * 0.34, h * 0.68)], fill=(88, 104, 150, 255))
        d.rectangle([0, h * 0.66, w, h], fill=(48, 132, 190, 255)); d.polygon([(0, h * 0.66), (w * 0.3, h * 0.56), (w * 0.55, h * 0.66)], fill=(60, 116, 78, 255)); d.polygon([(w * 0.45, h * 0.66), (w * 0.8, h * 0.54), (w, h * 0.66)], fill=(52, 104, 70, 255))
    elif kind == 'kyoto':
        d.polygon([(0, h * 0.4), (w * 0.5, h * 0.18), (w, h * 0.4), (w, h * 0.5), (0, h * 0.5)], fill=(40, 26, 20, 255)); d.rectangle([0, h * 0.5, w, h], fill=(120, 74, 40, 255))
        for i in range(7): x = w * (i + 0.5) / 7; d.rectangle([x - 18, h * 0.5, x + 18, h], fill=(60, 34, 22, 255))
        for i in range(12): blob(d, rnd, w, h, hexrgb('#ffb347'), (r := rnd.uniform(14, 34)), r, cy=h * rnd.uniform(0.2, 0.5), alpha=230)
    elif kind == 'inari':
        for i in range(9): x = w * (0.04 + i * 0.115); d.rectangle([x, 0, x + w * 0.05, h], fill=(190, 40, 20, 255)); d.rectangle([x - w * 0.02, h * 0.1, x + w * 0.07, h * 0.16], fill=(30, 12, 10, 255))
        blob(d, rnd, w, h, (255, 230, 170), w * 0.12, h * 0.3, cx=w * 0.5, cy=h * 0.5, alpha=220)
    else:  # plane: 구름 위 하늘
        for i in range(10): blob(d, rnd, w, h, (255, 255, 255), rnd.uniform(90, 220), rnd.uniform(30, 70), cy=h * rnd.uniform(0.55, 0.95), alpha=190)
        d.rectangle([w * 0.32, h * 0.1, w * 0.68, h * 0.55], fill=(235, 245, 255, 235))
    im = im.convert('RGB').filter(ImageFilter.GaussianBlur(radius=int(w * 0.034)))
    arr = np.asarray(im).astype('int16') + np.random.RandomState(n).normal(0, 3.2, (h, w, 1)).astype('int16')
    Image.fromarray(np.clip(arr, 0, 255).astype('uint8')).save(os.path.join(out, f"trip_{kind}_{'P' if portrait else 'L'}{n}.jpg"), quality=88)
for k in TRIP:
    for n in range(1, 4): make_trip(k, n, False)
    for n in range(1, 3): make_trip(k, n, True)
print('trip variants ->', len([f for f in os.listdir(out) if f.startswith('trip_')]))
