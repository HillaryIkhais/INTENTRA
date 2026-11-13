#!/bin/bash
cd /Users/ikhaisoshuare/KILLSWITCH/video/public/audio/voiceover

# Format: "filename start_seconds"
SEGMENTS="
a01_problem.mp3 0
a02_limit.mp3 3.5
a03_promised.mp3 6
a04_watch.mp3 10
a05_grant.mp3 12
a06_reserve_b.mp3 15
a07_reserve_c.mp3 18
a08_boundary.mp3 21
a09_delegate.mp3 25
a10_multiply.mp3 27
b01_spend.mp3 30
b02_enough.mp3 34
b03_committed.mp3 36
b04_available.mp3 39
b05_blocked.mp3 42
b06_budget.mp3 43.5
b07_nofunds.mp3 45.5
c01_try.mp3 52
c02_level.mp3 55
c03_promised.mp3 57.5
c04_available.mp3 60
c05_blocked.mp3 63
c06_budget.mp3 64.5
c07_level.mp3 66.5
d01_valid.mp3 70
d02_spend_a.mp3 72.5
d03_spend_b.mp3 75
d04_spend_c.mp3 77
d05_exact.mp3 79
d06_settle.mp3 81
d07_balance.mp3 83.5
d08_testnet.mp3 86
d09_simulated.mp3 88
e01_revoke.mp3 100
e02_b.mp3 104
e03_revoked.mp3 106
e04_c.mp3 108
e05_revoked.mp3 110
e06_noexist.mp3 111.5
e07_root.mp3 115
e08_source.mp3 117
f01_vault.mp3 120
f02_keys.mp3 123
f03_three.mp3 126
f04_recorded.mp3 128
f05_verified.mp3 130.5
f06_intentra.mp3 134
f07_delegate.mp3 135.5
f08_multiply.mp3 138
"

INPUTS=""
FILTER=""
i=0
while read -r file start; do
  [ -z "$file" ] && continue
  INPUTS="$INPUTS -i $file"
  # Convert seconds to milliseconds using awk
  ms=$(awk "BEGIN {printf \"%d\", $start * 1000}")
  FILTER="$FILTER [$i:a]adelay=${ms}|${ms}[a$i];"
  i=$((i+1))
done <<< "$SEGMENTS"

# Build amix inputs
AMIX_INPUTS=""
for ((j=0; j<i; j++)); do
  AMIX_INPUTS="$AMIX_INPUTS [a$j]"
done
FILTER="${FILTER}${AMIX_INPUTS} amix=inputs=$i:duration=longest:normalize=0"

echo "Building narration with $i segments..."
echo "Filter graph length: ${#FILTER}"

ffmpeg -y $INPUTS -filter_complex "$FILTER" -c:a libmp3lame -q:a 2 narration_combined.mp3 2>&1 | tail -5

if [ -f narration_combined.mp3 ]; then
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 narration_combined.mp3)
  echo "Combined narration: ${dur}s"
fi
