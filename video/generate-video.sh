#!/bin/bash
# INTENTRA Product Launch Video Generator

set -e

ARTIFACTS_DIR="/Users/ikhaisoshuare/KILLSWITCH/artifacts"
mkdir -p "$ARTIFACTS_DIR"

echo "Creating INTENTRA product launch video..."

# Scene 1: Opening
ffmpeg -y \
  -f lavfi -i color=c=black:s=1920x1080:d=3 \
  -vf "drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='INTENTRA':fontsize=72:fontcolor='#ff6b35':x=(w-text_w)/2:y=200,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Your agents can delegate the work.':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=320,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='They cannot duplicate the authority.':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=370,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Financial control for autonomous agent teams on NEAR':fontsize=24:fontcolor='#6b6b6b':x=(w-text_w)/2:y=450,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='github.com/HillaryIkhais/INTENTRA':fontsize=18:fontcolor='#ff6b35':x=(w-text_w)/2:y=900" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 "$ARTIFACTS_DIR/scene1.mp4" 2>/dev/null

# Scene 2: The Problem
ffmpeg -y \
  -f lavfi -i color=c="#f8f6f2":s=1920x1080:d=4 \
  -vf "drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='The Problem':fontsize=48:fontcolor='#0a0a0a':x=40:y=80,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='1.00 NEAR':fontsize=36:fontcolor='#0a0a0a':x=40:y=160,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='↓':fontsize=48:fontcolor='#0a0a0a':x=120:y=150,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Coordinator A':fontsize=28:fontcolor='#0a0a0a':x=40:y=220,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='├─ 0.45 NEAR → Researcher B [RESERVED]':fontsize=20:fontcolor='#8b8b8b':x=60:y=260,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='└─ 0.30 NEAR → Verifier C [RESERVED]':fontsize=20:fontcolor='#8b8b8b':x=60:y=290,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='0.25 NEAR remaining':fontsize=24:fontcolor='#16a34a':x=40:y=340,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='BUT Coordinator A tries to spend 0.30 NEAR...':fontsize=28:fontcolor='#0a0a0a':x=40:y=400,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='...should FAIL':fontsize=28:fontcolor='#d42020':x=40:y=440" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 "$ARTIFACTS_DIR/scene2.mp4" 2>/dev/null

# Scene 3: The Attack
ffmpeg -y \
  -f lavfi -i color=c=white:s=1920x1080:d=3 \
  -vf "drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='THE ATTACK':fontsize=60:fontcolor='#d42020':x=(w-text_w)/2:y=120,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Available: 0.25 NEAR':fontsize=32:fontcolor='#16a34a':x=40:y=220,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Requested: 0.30 NEAR':fontsize=32:fontcolor='#d42020':x=40:y=280,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='0.30 > 0.25':fontsize=48:fontcolor='#d42020':x=40:y=340,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='BUDGET_EXCEEDED':fontsize=60:fontcolor='#d42020':x=40:y=420" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 "$ARTIFACTS_DIR/scene3.mp4" 2>/dev/null

# Scene 4: Legitimate Execution
ffmpeg -y \
  -f lavfi -i color=c="#f0fff0":s=1920x1080:d=2.5 \
  -vf "drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Legitimate Execution':fontsize=48:fontcolor='#0a0a0a':x=40:y=80,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Researcher B → Vendor: 0.20 NEAR':fontsize=28:fontcolor='#0a0a0a':x=40:y=180,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='✓ ALLOWED':fontsize=32:fontcolor='#16a34a':x=40:y=230,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Verifier C → Vendor: 0.15 NEAR':fontsize=28:fontcolor='#0a0a0a':x=40:y=300,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='✓ ALLOWED':fontsize=32:fontcolor='#16a34a':x=40:y=350,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Total spent: 0.35 NEAR':fontsize=36:fontcolor='#0a0a0a':x=40:y=420,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Within 1.00 NEAR boundary ✓':fontsize=24:fontcolor='#16a34a':x=40:y=480" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 "$ARTIFACTS_DIR/scene4.mp4" 2>/dev/null

# Scene 5: Revocation
ffmpeg -y \
  -f lavfi -i color=c="#fff0f0":s=1920x1080:d=2 \
  -vf "drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Owner Revocation':fontsize=48:fontcolor='#0a0a0a':x=40:y=80,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Owner → REVOKE Coordinator A':fontsize=28:fontcolor='#0a0a0a':x=40:y=180,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Cascading invalidation...':fontsize=24:fontcolor='#6b6b6b':x=40:y=240,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Researcher B → REVOKED_CHAIN':fontsize=28:fontcolor='#d42020':x=40:y=320,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Verifier C → REVOKED_CHAIN':fontsize=28:fontcolor='#d42020':x=40:y=370,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Authority TERMINATED':fontsize=48:fontcolor='#d42020':x=40:y=460,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='One owner action, full chain invalidated':fontsize=24:fontcolor='#6b6b6b':x=40:y=520" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 "$ARTIFACTS_DIR/scene5.mp4" 2>/dev/null

# Scene 6: Final
ffmpeg -y \
  -f lavfi -i color=c=white:s=1920x1080:d=3 \
  -vf "drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='INTENTRA':fontsize=80:fontcolor='#0a0a0a':x=(w-text_w)/2:y=300,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Your agents can delegate the work.':fontsize=32:fontcolor='#0a0a0a':x=(w-text_w)/2:y=380,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='They cannot duplicate the authority.':fontsize=32:fontcolor='#0a0a0a':x=(w-text_w)/2:y=430,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='Recursive financial authority control for agent swarms':fontsize=22:fontcolor='#6b6b6b':x=(w-text_w)/2:y=520,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='budget-vault.intentra.testnet | 1.00 NEAR | 27/27 tests PASS':fontsize=18:fontcolor='#0a0a0a':x=(w-text_w)/2:y=620,drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='github.com/HillaryIkhais/INTENTRA':fontsize=20:fontcolor='#ff6b35':x=(w-text_w)/2:y=700" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 "$ARTIFACTS_DIR/scene6.mp4" 2>/dev/null

echo "Combining scenes..."

# Combine all scenes
ffmpeg -y \
  -i "$ARTIFACTS_DIR/scene1.mp4" \
  -i "$ARTIFACTS_DIR/scene2.mp4" \
  -i "$ARTIFACTS_DIR/scene3.mp4" \
  -i "$ARTIFACTS_DIR/scene4.mp4" \
  -i "$ARTIFACTS_DIR/scene5.mp4" \
  -i "$ARTIFACTS_DIR/scene6.mp4" \
  -filter_complex "[0:v][1:v][2:v][3:v][4:v][5:v]concat=n=6:v=1:a=0[out]" \
  -map "[out]" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 "$ARTIFACTS_DIR/intentra-product-launch.mp4"

# Generate voiceover
echo "Generating voiceover..."

cat > "$ARTIFACTS_DIR/voiceover-script.txt" << 'EOF'
INTENTRA -- Your agents can delegate the work. They cannot duplicate the authority.

Financial control for autonomous agent teams on NEAR.

The problem: giving an autonomous agent a spending limit is not enough when that agent can create other agents and delegate authority to them.

INTENTRA enforces that financial authority can only narrow, never widen, across an agent delegation tree.

When a parent delegates budget to a child, that budget is reserved from the parent's headroom.

Step one: Owner grants Coordinator A one NEAR of root authority.

Step two: Coordinator A delegates point four five NEAR to Researcher B -- RESERVED.

Step three: Coordinator A delegates point three zero NEAR to Verifier C -- RESERVED.

Now Coordinator A has only point two five NEAR remaining.

Step four: the critical moment. Coordinator A attempts to spend point three zero NEAR.

The contract rejects: BUDGET EXCEEDED. Only point two five NEAR is available. Point seven five NEAR is already committed to children.

Step five: Researcher B spends point two zero NEAR -- ALLOWED.

Step six: Verifier C spends point one five NEAR -- ALLOWED.

Total spent: point three five NEAR exactly within the one NEAR boundary.

Step seven: Owner revokes Coordinator A.

The revocation cascades -- both children become REVOKED CHAIN.

One owner action invalidates the entire descendant chain.

INTENTRA brings enforceable financial boundaries to autonomous agent teams on NEAR.

Delegate the work. Keep control of the authority.
EOF

# Generate audio
say -v "Alex" -o "$ARTIFACTS_DIR/voiceover.aac" -f "$ARTIFACTS_DIR/voiceover-script.txt" 2>/dev/null && \
ffmpeg -y \
  -i "$ARTIFACTS_DIR/intentra-product-launch.mp4" \
  -i "$ARTIFACTS_DIR/voiceover.aac" \
  -c:v copy \
  -c:a aac \
  -strict experimental \
  "$ARTIFACTS_DIR/intentra-product-launch.mp4" || echo "Note: Audio generation skipped (macOS TTS not available)"

# Clean up
rm -f "$ARTIFACTS_DIR"/scene*.mp4 "$ARTIFACTS_DIR"/voiceover.aac "$ARTIFACTS_DIR"/voiceover-script.txt

echo "Done! Video saved to: $ARTIFACTS_DIR/intentra-product-launch.mp4"
ls -la "$ARTIFACTS_DIR/"