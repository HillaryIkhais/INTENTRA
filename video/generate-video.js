#!/usr/bin/env node
/**
 * INTENTRA Product Launch Video Generator
 * 
 * Creates a 2-minute animated video demonstrating the authority reservation mechanism
 * using ffmpeg for compositing.
 * 
 * Requires: ffmpeg, node-canvas (installed if needed)
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const WIDTH = 1920;
const HEIGHT = 1080;
const FRAMERATE = 30;
const DURATION = 130; // 2 minutes 10 seconds
const TOTAL_FRAMES = DURATION * FRAMERATE;

// Colors
const COLORS = {
  bg: '#f8f6f2',
  ink: '#0a0a0a',
  ink50: '#6b6b6b',
  near: '#000000',
  ok: '#16a34a',
  blocked: '#d42020',
  reserved: '#8b8b8b',
  highlight: '#ff6b35'
};

// Font paths - using system fonts
const FONTS = {
  sans: '/System/Library/Fonts/Helvetica.ttc',
  mono: '/System/Library/Fonts/Menlo.ttc'
};

// Create output directory
const FRAMES_DIR = '/tmp/intentra_frames';
if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

console.log('Generating INTENTRA product launch video frames...');

/**
 * Draw a frame at a specific time (in seconds)
 */
function drawFrame(frameNum, totalFrames) {
  const t = frameNum / FRAMERATE; // time in seconds
  
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
  // Subtle noise overlay
  ctx.fillStyle = 'rgba(0,0,0,0.02)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
  // Act I: The Promise (0:00 - 0:18) - Title screen
  if (t < 18) {
    drawActI(ctx, t, 18);
  }
  // Act II: The Problem (0:18 - 0:40) - Authority tree with reservations
  else if (t < 40) {
    drawActII(ctx, t, 40);
  }
  // Act III: The Product (0:40 - 1:05) - Attack attempt and rejection
  else if (t < 65) {
    drawActIII(ctx, t, 65);
  }
  // Act IV: Why It Matters (1:05 - 1:30) - Legitimate execution
  else if (t < 90) {
    drawActIV(ctx, t, 90);
  }
  // Act V: Owner Control (1:30 - 1:48) - Revocation cascade
  else if (t < 108) {
    drawActV(ctx, t, 108);
  }
  // Act VI: Product Reveal (1:48 - 2:15) - Final branding
  else {
    drawActVI(ctx, t, 160);
  }
  
  // Save frame
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(FRAMES_DIR, `frame_${String(frameNum).padStart(6, '0')}.png`), buffer);
  
  if (frameNum % 300 === 0) {
    console.log(`Generated ${frameNum}/${totalFrames} frames`);
  }
}

/**
 * Act I: The Promise
 * Opening title with the product promise
 */
function drawActI(ctx, t, duration) {
  // Fade in
  const progress = Math.min(t / 2, 1);
  ctx.globalAlpha = progress;
  
  // Title
  ctx.fillStyle = COLORS.near;
  ctx.font = 'bold 80px Helvetica';
  ctx.textAlign = 'center';
  ctx.fillText('Give an agent room to act.', WIDTH / 2, HEIGHT / 2 - 40);
  
  // Subtitle
  ctx.font = '40px Helvetica';
  ctx.fillStyle = COLORS.ink50;
  ctx.fillText('What happens when it delegates?', WIDTH / 2, HEIGHT / 2 + 40);
  
  // Logo at bottom
  ctx.globalAlpha = 1;
  ctx.font = 'bold 48px Helvetica';
  ctx.fillStyle = COLORS.highlight;
  ctx.fillText('INTENTRA', WIDTH / 2, HEIGHT - 80);
}

/**
 * Act II: The Problem
 * Authority tree visualization
 */
function drawActII(ctx, t, duration) {
  // Time within act
  const actT = t - 18;
  
  ctx.fillStyle = COLORS.near;
  ctx.font = 'bold 36px Helvetica';
  ctx.textAlign = 'center';
  ctx.fillText('Authority flows from Owner → Coordinator → Children', WIDTH / 2, 80);
  
  // Draw authority tree
  const centerX = WIDTH / 2;
  const startY = 200;
  const nodeWidth = 280;
  
  // Animation progress
  const progress = actT / 22; // 0 to 1 over 22 seconds
  
  // Root node (Owner)
  if (progress > 0) {
    ctx.fillStyle = COLORS.ok;
    ctx.fillRect(centerX - 140, startY, 280, 80);
    ctx.fillStyle = COLORS.near;
    ctx.font = 'bold 24px Helvetica';
    ctx.fillText('OWNER', centerX, startY + 30);
    ctx.fillStyle = COLORS.ink;
    ctx.font = '20px Helvetica';
    ctx.fillText('1.00 NEAR', centerX, startY + 60);
  }
  
  // Arrow to Coordinator
  if (progress > 0.2) {
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, startY + 80);
    ctx.lineTo(centerX, startY + 130);
    ctx.stroke();
  }
  
  // Coordinator node with budget bar
  if (progress > 0.4) {
    // Budget visualization
    const budgetTop = startY + 150;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(centerX - 150, budgetTop, 300, 20);
    
    // Reserved portion (75%)
    ctx.fillStyle = COLORS.reserved;
    ctx.fillRect(centerX - 150, budgetTop, 225, 20);
    
    // Available portion (25%)
    ctx.fillStyle = COLORS.ok;
    ctx.fillRect(centerX + 75, budgetTop, 75, 20);
    
    // Labels
    ctx.fillStyle = COLORS.near;
    ctx.font = 'bold 22px Helvetica';
    ctx.fillText('COORDINATOR A', centerX, budgetTop - 30);
    ctx.font = '16px Helvetica';
    ctx.fillText('0.75 RESERVED', centerX - 120, budgetTop + 40);
    ctx.fillText('0.25 AVAILABLE', centerX + 90, budgetTop + 40);
    
    // Nodes to children
    if (progress > 0.7) {
      // Arrow down to Researcher
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 140, budgetTop + 20);
      ctx.lineTo(centerX - 140, budgetTop + 80);
      ctx.stroke();
      
      // Arrow down to Verifier
      ctx.beginPath();
      ctx.moveTo(centerX + 140, budgetTop + 20);
      ctx.lineTo(centerX + 140, budgetTop + 80);
      ctx.stroke();
      
      // Researcher node
      ctx.fillStyle = COLORS.ok;
      ctx.fillRect(centerX - 140 - 100, budgetTop + 80, 180, 60);
      ctx.fillStyle = COLORS.near;
      ctx.font = 'bold 16px Helvetica';
      ctx.fillText('RESEARCHER B', centerX - 180, budgetTop + 100);
      ctx.font = '14px Helvetica';
      ctx.fillText('Max: 0.45', centerX - 180, budgetTop + 125);
      
      // Verifier node
      ctx.fillRect(centerX + 100, budgetTop + 80, 180, 60);
      ctx.fillText('VERIFIER C', centerX + 280, budgetTop + 100);
      ctx.fillText('Max: 0.30', centerX + 280, budgetTop + 125);
    }
  }
  
  // Caption at bottom
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.ink50;
  ctx.font = '14px Helvetica';
  ctx.fillText('Authority allocation visualization', WIDTH / 2, HEIGHT - 80);
}

/**
 * Act III: The Product
 * Show the attack being blocked
 */
function drawActIII(ctx, t, duration) {
  const actT = t - 40;
  const progress = Math.min(actT / 25, 1);
  
  // Big bold title
  ctx.fillStyle = COLORS.blocked;
  ctx.font = 'bold 60px Helvetica';
  ctx.textAlign = 'center';
  ctx.fillText('ATTACK BLOCKED', WIDTH / 2, 120);
  
  // Subtitle
  ctx.fillStyle = COLORS.near;
  ctx.font = 'bold 36px Helvetica';
  ctx.fillText('Coordinator A tries 0.30 NEAR', WIDTH / 2, 180);
  
  // Budget bar showing the conflict
  const budgetTop = 280;
  const barWidth = 500;
  
  // Available portion (25% - too small for 30% request)
  ctx.fillStyle = COLORS.ok;
  ctx.fillRect(WIDTH / 2 - barWidth/2, budgetTop, 125, 40);
  
  // Reserved portion (75%)
  ctx.fillStyle = COLORS.reserved;
  ctx.fillRect(WIDTH / 2 - barWidth/2 + 125, budgetTop, 375, 40);
  
  ctx.fillStyle = COLORS.near;
  ctx.font = 'bold 18px Helvetica';
  ctx.fillText('0.25 NEAR', WIDTH / 2 - 140, budgetTop + 30);
  ctx.fillText('0.75 NEAR COMMITTED', WIDTH / 2 - 40, budgetTop + 30);
  
  // Attack request
  ctx.fillStyle = COLORS.blocked;
  ctx.strokeStyle = COLORS.blocked;
  ctx.lineWidth = 3;
  ctx.strokeRect(WIDTH / 2 - 80, 340, 160, 60);
  ctx.fillStyle = COLORS.blocked;
  ctx.font = 'bold 24px Helvetica';
  ctx.fillText('0.30', WIDTH / 2 - 60, 380);
  
  // Error message appearing
  if (progress > 0.3) {
    ctx.fillStyle = COLORS.blocked;
    ctx.font = 'bold 28px Helvetica';
    ctx.fillText('BUDGET_EXCEEDED', WIDTH / 2, 440);
  }
  
  // Headroom calculation
  if (progress > 0.5) {
    ctx.fillStyle = COLORS.ink;
    ctx.font = '16px Helvetica';
    ctx.fillText('Contract check: max_total - total_spent - allocated_children', WIDTH / 2, 490);
    ctx.font = 'bold 20px Helvetica';
    ctx.fillText('= 1.00 - 0 - 0.75 = 0.25 NEAR', WIDTH / 2, 520);
  }
  
  // Caption
  ctx.fillStyle = COLORS.ink50;
  ctx.font = '14px Helvetica';
  ctx.fillText('The contract prevents double-spending authority', WIDTH / 2, HEIGHT - 80);
}

/**
 * Act IV: Why It Matters
 * Show legitimate execution by children
 */
function drawActIV(ctx, t, duration) {
  const actT = t - 65;
  const progress = Math.min(actT / 25, 1);
  
  ctx.fillStyle = COLORS.near;
  ctx.font = 'bold 36px Helvetica';
  ctx.textAlign = 'center';
  ctx.fillText('Legitimate execution continues', WIDTH / 2, 120);
  
  // Researcher payment
  if (progress > 0.2) {
    ctx.fillStyle = COLORS.ok;
    ctx.strokeStyle = COLORS.near;
    ctx.lineWidth = 2;
    ctx.strokeRect(WIDTH / 2 - 200, 180, 400, 80);
    
    ctx.fillStyle = COLORS.ok;
    ctx.font = 'bold 28px Helvetica';
    ctx.fillText('Researcher B → Vendor: 0.20 NEAR', WIDTH / 2, 230);
    ctx.font = '20px Helvetica';
    ctx.fillText('✓ ALLOWED', WIDTH / 2, 260);
  }
  
  // Verifier payment
  if (progress > 0.5) {
    ctx.fillStyle = COLORS.ok;
    ctx.strokeStyle = COLORS.near;
    ctx.lineWidth = 2;
    ctx.strokeRect(WIDTH / 2 - 200, 300, 400, 80);
    
    ctx.fillStyle = COLORS.ok;
    ctx.font = 'bold 28px Helvetica';
    ctx.fillText('Verifier C → Vendor: 0.15 NEAR', WIDTH / 2, 350);
    ctx.font = '20px Helvetica';
    ctx.fillText('✓ ALLOWED', WIDTH / 2, 380);
  }
  
  // Total spent
  if (progress > 0.7) {
    ctx.fillStyle = COLORS.near;
    ctx.font = 'bold 32px Helvetica';
    ctx.fillText('Total spent: 0.35 NEAR', WIDTH / 2, 420);
    
    ctx.font = '16px Helvetica';
    ctx.fillStyle = COLORS.ink50;
    ctx.fillText('Exactly within the 1.00 NEAR budget boundary', WIDTH / 2, 460);
  }
  
  // Caption
  ctx.fillStyle = COLORS.ink50;
  ctx.font = '14px Helvetica';
  ctx.fillText('Children execute within inherited authority', WIDTH / 2, HEIGHT - 80);
}

/**
 * Act V: Owner Control
 * Revocation cascade
 */
function drawActV(ctx, t, duration) {
  const actT = t - 90;
  const progress = Math.min(actT / 18, 1);
  
  ctx.fillStyle = COLORS.near;
  ctx.font = 'bold 36px Helvetica';
  ctx.textAlign = 'center';
  ctx.fillText('Owner revocation cascades', WIDTH / 2, 120);
  
  // Owner revokes
  ctx.fillStyle = COLORS.highlight;
  ctx.font = 'bold 28px Helvetica';
  ctx.fillText('Owner → REVOKE Coordinator A', WIDTH / 2, 180);
  
  // Animation: revocation spreading
  if (progress > 0.3) {
    ctx.fillStyle = COLORS.blocked;
    ctx.font = 'bold 20px Helvetica';
    ctx.fillText('Researcher B → REVOKED_CHAIN', WIDTH / 2, 250);
  }
  if (progress > 0.5) {
    ctx.fillText('Verifier C → REVOKED_CHAIN', WIDTH / 2, 290);
  }
  
  // Visual indicator of termination
  if (progress > 0.7) {
    ctx.fillStyle = COLORS.blocked;
    ctx.font = 'bold 32px Helvetica';
    ctx.fillText('Authority TERMINATED', WIDTH / 2, 380);
    
    // Broken chain visual
    ctx.strokeStyle = COLORS.blocked;
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 - 150, 430);
    ctx.lineTo(WIDTH / 2 + 150, 430);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // Caption
  ctx.fillStyle = COLORS.ink50;
  ctx.font = '14px Helvetica';
  ctx.fillText('One owner action can shut down the entire delegation tree', WIDTH / 2, HEIGHT - 80);
}

/**
 * Act VI: Product Reveal
 * Final branding with key information
 */
function drawActVI(ctx, t, duration) {
  const actT = t - 108;
  const progress = Math.min(actT / 52, 1);
  
  // Fade in content
  ctx.globalAlpha = progress;
  
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, COLORS.bg);
  grad.addColorStop(1, '#e0e0e0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
  // Product name
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.near;
  ctx.font = 'bold 72px Helvetica';
  ctx.textAlign = 'center';
  ctx.fillText('INTENTRA', WIDTH / 2, 280);
  
  // Tagline
  ctx.font = 'bold 48px Helvetica';
  ctx.fillStyle = COLORS.highlight;
  ctx.fillText('Your agents can delegate the work.', WIDTH / 2, 360);
  ctx.fillStyle = COLORS.near;
  ctx.fillText("They can't duplicate the authority.", WIDTH / 2, 420);
  
  // Key info cards fading in
  const cards = [
    { y: 500, text: 'Recursive authority enforcement' },
    { y: 560, text: '1.00 NEAR budget preserved' },
    { y: 620, text: '27/27 tests passing' },
    { y: 680, text: '19/19 independent verifications' }
  ];
  
  ctx.font = 'bold 28px Helvetica';
  ctx.fillStyle = COLORS.near;
  cards.forEach((card, i) => {
    if (progress > 0.8 + i * 0.05) {
      ctx.globalAlpha = Math.min(1, (progress - 0.8 - i * 0.05) / 0.05);
      ctx.fillText(card.text, WIDTH / 2, card.y);
    }
  });
  
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.ink50;
  ctx.font = '18px Helvetica';
  ctx.fillText('budget-vault.intentra.testnet | NEAR testnet', WIDTH / 2, 760);
  
  // Call to action
  ctx.fillStyle = COLORS.highlight;
  ctx.font = 'bold 24px Helvetica';
  ctx.fillText('github.com/HillaryIkhais/INTENTRA', WIDTH / 2, HEIGHT - 100);
}

/**
 * Main function to generate video
 */
async function generateVideo() {
  console.log('Generating frames...');
  
  // Generate all frames
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    drawFrame(i, TOTAL_FRAMES);
  }
  
  console.log('Compiling video with ffmpeg...');
  
  // Compile with ffmpeg
  const cmd = [
    'ffmpeg', '-y',
    '-framerate', String(FRAMERATE),
    '-i', `${FRAMES_DIR}/frame_%06d.png`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '18',
    '-vf', 'fps=' + FRAMERATE,
    '-movflags', '+faststart',
    '/tmp/intentra-product-launch.mp4'
  ].join(' ');
  
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('Video created: /tmp/intentra-product-launch.mp4');
  } catch (e) {
    console.error('FFmpeg error:', e.message);
  }
  
  // Copy to artifacts
  const artifactsDir = '/Users/ikhaisoshuare/KILLSWITCH/artifacts';
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  
  fs.copyFileSync('/tmp/intentra-product-launch.mp4', `${artifactsDir}/intentra-product-launch.mp4`);
  console.log('Video saved to:', `${artifactsDir}/intentra-product-launch.mp4`);
  
  // Generate voiceover using macOS TTS
  console.log('Generating voiceover...');
  const voiceText = `
INTENTRA. Your agents can delegate the work. They cannot duplicate the authority.

Giving an autonomous agent a spending limit is not enough when that agent can create other agents and delegate authority. The owner needs the entire delegation hierarchy to remain within the original financial boundary.

INTENTRA enforces that financial authority can only narrow, never widen, across an agent delegation tree.

When a parent delegates budget to a child, that budget is reserved from the parent's headroom.

Step one: Owner grants Coordinator A one NEAR of root authority.

Step two: Coordinator A delegates 0.45 to Researcher B - reserved.

Step three: Coordinator A delegates 0.30 to Verifier C - reserved.

Now Coordinator A has only 0.25 NEAR remaining.

Step four: The critical moment. Coordinator A attempts to spend 0.30 NEAR.

The contract rejects: BUDGET_EXCEEDED. Only 0.25 NEAR is available. 0.75 NEAR is already committed to children.

Step five: Researcher B spends 0.20 NEAR - allowed.

Step six: Verifier C spends 0.15 NEAR - allowed.

Total: 0.35 NEAR spent, exactly within the 1.00 NEAR boundary.

Step seven: Owner revokes Coordinator A.

The revocation cascades - both children become REVOKED_CHAIN.

One owner action invalidates the entire descendant chain.

INTENTRA brings enforceable financial boundaries to autonomous agent teams on NEAR.

Delegate the work. Keep control of the authority.`;

  // Write voice script
  fs.writeFileSync(`${artifactsDir}/voiceover-script.txt`, voiceText);
  
  // Generate audio using macOS say
  const voice = 'Alex'; // Good quality default voice
  const audioPath = `${artifactsDir}/voiceover.aac`;
  
  try {
    execSync(`say -v "${voice}" -o "${audioPath}" -f "${artifactsDir}/voiceover-script.txt"`, { timeout: 60000 });
    console.log('Voiceover generated:', audioPath);
  } catch (e) {
    console.error('Voice generation failed:', e.message);
  }
  
  // Create final video with audio
  if (fs.existsSync(audioPath)) {
    console.log('Creating final video with audio...');
    execSync([
      'ffmpeg', '-y',
      '-i', '/tmp/intentra-product-launch.mp4',
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-strict', 'experimental',
      `${artifactsDir}/intentra-product-launch.mp4`
    ].join(' '), { stdio: 'inherit' });
  }
  
  // Clean up temp files
  try {
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  } catch (e) {}
  
  console.log('Done!');
}

generateVideo().catch(console.error);