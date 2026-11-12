#!/usr/bin/env python3
"""
INTENTRA Product Launch Video Generator
Creates a 2-minute animated product demonstration video.
"""

from PIL import Image, ImageDraw, ImageFont
import subprocess
import os
import json

# Configuration
WIDTH, HEIGHT = 1920, 1080
FRAMES = 7500  # 2.5 minutes at 30fps
FRAME_RATE = 30
OUTPUT_DIR = "/tmp/intentra_frames"
VIDEO_OUTPUT = "/Users/ikhaisoshuare/KILLSWITCH/artifacts/intentra-product-launch.mp4"

# Colors
COLORS = {
    'bg': (248, 246, 242),
    'ink': (10, 10, 10),
    'ink50': (107, 107, 107),
    'red': (212, 32, 32),
    'green': (22, 163, 74),
    'near': (0, 0, 0),
    'reserved': (139, 139, 139),
    'highlight': (255, 107, 53)
}

# Load fonts
try:
    FONT_BOLD = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 80)
    FONT_MED = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
    FONT_SMALL = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
except:
    FONT_BOLD = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue-Bold.ttc", 80)
    FONT_MED = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue-Bold.ttc", 32)
    FONT_SMALL = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue-Medium.ttc", 18)

def draw_text(draw, text, x, y, font, fill=(0,0,0), anchor='mt'):
    """Draw multi-line text"""
    lines = text.split('\n')
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        y += font.getsize(line)[1] + 10
    return y

def create_frame(frame_num):
    """Create a single frame"""
    t = frame_num / FRAME_RATE  # time in seconds
    img = Image.new('RGB', (WIDTH, HEIGHT), COLORS['bg'])
    draw = ImageDraw.Draw(img)
    
    # Act I: The Promise (0:00 - 0:18)
    if t < 18:
        progress = min(t / 18, 1)
        draw.text((WIDTH/2, 200), 'INTENTRA', font=FONT_BOLD, fill=COLORS['near'], anchor='mt')
        draw.text((WIDTH/2, 300), 'Your agents can delegate the work.', font=FONT_MED, fill=COLORS['ink'], anchor='mt')
        draw.text((WIDTH/2, 345), "They can't duplicate the authority.", font=FONT_MED, fill=COLORS['ink'], anchor='mt')
        draw.text((WIDTH/2, 420), 'Financial control for autonomous agent teams on NEAR', font=FONT_SMALL, fill=COLORS['ink50'], anchor='mt')
        draw.text((WIDTH/2, 900), 'github.com/HillaryIkhais/INTENTRA', font=FONT_SMALL, fill=COLORS['highlight'], anchor='mt')
    
    # Act II: The Problem (0:18 - 0:40)
    elif t < 40:
        act_t = t - 18
        draw.text((40, 80), 'The Problem', font=FONT_BOLD, fill=COLORS['ink'])
        
        # Root authority
        draw.rectangle([40, 140, 280, 200], fill=COLORS['green'], outline=COLORS['ink'])
        draw.text((160, 160), 'OWNER', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24), fill=COLORS['ink'])
        draw.text((160, 190), '1.00 NEAR', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18), fill=COLORS['ink'])
        
        # Arrow
        draw.line([(160, 200), (160, 230)], fill=COLORS['ink'], width=3)
        
        # Coordinator with budget visualization
        progress = min((act_t - 2) / 10, 1)
        if act_t > 2:
            # Budget bar
            bar_x, bar_y = 60, 260
            bar_w, bar_h = 600, 40
            draw.rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], outline=COLORS['ink'])
            
            # Reserved portion (75%)
            draw.rectangle([bar_x, bar_y, bar_x + bar_w * 0.75, bar_y + bar_h], fill=COLORS['reserved'])
            
            # Available portion (25%)
            draw.rectangle([bar_x + bar_w * 0.75, bar_y, bar_x + bar_w, bar_y + bar_h], fill=COLORS['green'])
            
            draw.text((bar_x + 10, bar_y + 10), '0.75 NEAR RESERVED', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16), fill=COLORS['ink'])
            draw.text((bar_x + 320, bar_y + 10), '0.25 NEAR AVAILABLE', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16), fill=COLORS['ink'])
            
            # Children
            draw.text((60, 320), '→ 0.45 NEAR RESEARCHER B [RESERVED]', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18), fill=COLORS['reserved'])
            draw.text((60, 360), '→ 0.30 NEAR VERIFIER C [RESERVED]', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18), fill=COLORS['reserved'])
            
            # Attack description
            draw.text((60, 420), 'BUT Coordinator A tries to spend 0.30 NEAR...', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24), fill=COLORS['ink'])
            draw.text((60, 460), '...should REJECT', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24), fill=COLORS['red'])
    
    # Act III: The Attack (0:40 - 1:05)
    elif t < 65:
        act_t = t - 40
        
        draw.text((WIDTH/2, 120), 'THE ATTACK', font=FONT_BOLD, fill=COLORS['red'])
        
        # Budget visualization
        bar_x, bar_y = 360, 220
        bar_w, bar_h = 500, 30
        draw.rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], outline=COLORS['ink'])
        draw.rectangle([bar_x, bar_y, bar_x + bar_w * 0.25, bar_y + bar_h], fill=COLORS['green'])
        draw.rectangle([bar_x + bar_w * 0.25, bar_y, bar_x + bar_w, bar_y + bar_h], fill=COLORS['reserved'])
        
        draw.text((bar_x, 260), '0.25 NEAR AVAILABLE', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18), fill=COLORS['ink'])
        draw.text((bar_x, 290), '0.75 NEAR COMMITTED TO CHILDREN', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18), fill=COLORS['ink'])
        
        # Request
        draw.rectangle([WIDTH/2 - 80, 340, WIDTH/2 + 80, 400], outline=COLORS['red'])
        draw.text((WIDTH/2, 360), 'REQUEST: 0.30 NEAR', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24), fill=COLORS['red'])
        
        # Rejection
        if act_t > 2:
            draw.text((WIDTH/2, 480), 'BUDGET_EXCEEDED', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48), fill=COLORS['red'])
            draw.text((WIDTH/2, 530), 'Contract check: max_total - total_spent - allocated_children = 1.00 - 0 - 0.75 = 0.25 NEAR', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16), fill=COLORS['ink50'])
    
    # Act IV: Legitimate Execution (1:05 - 1:30)
    elif t < 90:
        act_t = t - 65
        draw.text((40, 80), 'Legitimate Execution', font=FONT_BOLD, fill=COLORS['ink'])
        
        if act_t > 2:
            draw.rectangle([40, 180, 600, 260], outline=COLORS['ink'])
            draw.text((40, 150), 'Researcher B → Vendor: 0.20 NEAR', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24), fill=COLORS['ink'])
            draw.text((40, 200), '✓ ALLOWED', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28), fill=COLORS['green'])
            
            draw.rectangle([40, 320, 600, 400], outline=COLORS['ink'])
            draw.text((40, 290), 'Verifier C → Vendor: 0.15 NEAR', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24), fill=COLORS['ink'])
            draw.text((40, 340), '✓ ALLOWED', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28), fill=COLORS['green'])
            
            draw.text((40, 460), 'Total spent: 0.35 NEAR within 1.00 NEAR boundary', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28), fill=COLORS['green'])
    
    # Act V: Revocation (1:30 - 1:48)
    elif t < 108:
        act_t = t - 90
        draw.text((40, 80), 'Owner Revocation', font=FONT_BOLD, fill=COLORS['ink'])
        
        if act_t > 1:
            draw.text((40, 150), 'Owner → REVOKE Coordinator A', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24), fill=COLORS['ink'])
        
        if act_t > 3:
            draw.text((40, 220), 'Cascading invalidation...', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20), fill=COLORS['ink50'])
        
        if act_t > 5:
            draw.text((40, 290), 'Researcher B → REVOKED_CHAIN', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24), fill=COLORS['red'])
        
        if act_t > 7:
            draw.text((40, 340), 'Verifier C → REVOKED_CHAIN', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24), fill=COLORS['red'])
        
        if act_t > 9:
            draw.text((40, 420), 'Authority TERMINATED', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36), fill=COLORS['red'])
            draw.text((40, 460), 'One owner action, full chain invalidated', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20), fill=COLORS['ink50'])
    
    # Act VI: Product Reveal (1:48 - 2:15)
    else:
        act_t = t - 108
        progress = min(act_t / 27, 1)
        
        # Fade in overlay
        if progress > 0.1:
            alpha = min(1, (progress - 0.1) / 0.5)
            
            # Dark overlay for text
            overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, int(100 * (1 - alpha))))
            draw = ImageDraw.Draw(img)
            draw.bitmap((0, 0), overlay, fill=None)
        
        draw.text((WIDTH/2, 300), 'INTENTRA', font=FONT_BOLD, fill=COLORS['ink'])
        draw.text((WIDTH/2, 380), "Your agents can delegate the work.", font=FONT_MED, fill=COLORS['ink'])
        draw.text((WIDTH/2, 425), "They cannot duplicate the authority.", font=FONT_MED, fill=COLORS['ink'])
        
        if progress > 0.3:
            draw.text((WIDTH/2, 520), 'Recursive financial authority control for agent swarms', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22), fill=COLORS['ink50'])
        
        if progress > 0.5:
            draw.text((WIDTH/2, 620), 'budget-vault.intentra.testnet | 1.00 NEAR | 27/27 tests PASS', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18), fill=COLORS['ink'])
        
        if progress > 0.7:
            draw.text((WIDTH/2, 700), 'github.com/HillaryIkhais/INTENTRA', font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20), fill=COLORS['highlight'])
    
    return img.convert('RGB')

def main():
    print("Generating INTENTRA product launch video frames...")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Generate frames
    for frame in range(FRAMES):
        img = create_frame(frame)
        img.save(os.path.join(OUTPUT_DIR, f'frame_{frame:06d}.png'))
        if frame % 500 == 0:
            print(f"Generated {frame}/{FRAMES} frames")
    
    print("Compiling video with ffmpeg...")
    
    # Compile with ffmpeg
    cmd = [
        'ffmpeg', '-y',
        '-framerate', str(FRAME_RATE),
        '-i', os.path.join(OUTPUT_DIR, 'frame_%06d.png'),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', '18',
        '-vf', f'fps={FRAME_RATE}',
        VIDEO_OUTPUT
    ]
    
    subprocess.run(cmd, check=True)
    print(f"Video created: {VIDEO_OUTPUT}")
    
    # Clean up frames
    import shutil
    shutil.rmtree(OUTPUT_DIR)
    print("Frame files cleaned up")

if __name__ == '__main__':
    main()