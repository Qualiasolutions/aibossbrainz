#!/usr/bin/env bash
# Load test for BossBrainz - tests concurrent requests against key endpoints
# Usage: ./scripts/load-test.sh [base_url] [concurrency] [requests_per_endpoint]
#
# Examples:
#   ./scripts/load-test.sh                                    # Default: production, 20 concurrent, 50 requests
#   ./scripts/load-test.sh http://localhost:3000 10 30         # Local dev, 10 concurrent, 30 requests
#   ./scripts/load-test.sh https://bossbrainz.aleccimedia.com 50 100  # Stress test

set -euo pipefail

BASE_URL="${1:-https://bossbrainz.aleccimedia.com}"
CONCURRENCY="${2:-20}"
REQUESTS="${3:-50}"

# Check for required tools
if ! command -v curl &>/dev/null; then
  echo "Error: curl is required"
  exit 1
fi

echo "================================================"
echo "  BossBrainz Load Test"
echo "================================================"
echo "Target:      $BASE_URL"
echo "Concurrency: $CONCURRENCY"
echo "Requests:    $REQUESTS per endpoint"
echo "================================================"
echo ""

# Endpoints to test (public, no auth required)
ENDPOINTS=(
  "/"
  "/api/health"
  "/login"
  "/pricing"
  "/about"
  "/contact"
)

PASS=0
FAIL=0

for endpoint in "${ENDPOINTS[@]}"; do
  url="${BASE_URL}${endpoint}"
  echo "Testing: ${endpoint}"
  echo "  ${CONCURRENCY} concurrent, ${REQUESTS} total requests..."

  # Use xargs for parallel curl requests, capture timing
  results=$(seq 1 "$REQUESTS" | xargs -P "$CONCURRENCY" -I {} \
    curl -s -o /dev/null -w "%{http_code} %{time_total}\n" "$url" 2>/dev/null)

  # Parse results
  total=$(echo "$results" | wc -l)
  success=$(echo "$results" | grep -c "^200\|^301\|^302\|^307\|^308" || true)
  errors=$((total - success))
  avg_time=$(echo "$results" | awk '{sum+=$2} END {printf "%.3f", sum/NR}')
  max_time=$(echo "$results" | awk '{if($2>max)max=$2} END {printf "%.3f", max}')
  min_time=$(echo "$results" | awk 'NR==1||$2<min{min=$2} END {printf "%.3f", min}')
  p95_time=$(echo "$results" | awk '{print $2}' | sort -n | awk -v p=0.95 'NR==1{n=0} {a[n++]=$1} END {printf "%.3f", a[int(n*p)]}')

  # Status
  if [ "$errors" -eq 0 ] && awk "BEGIN{exit(!($avg_time < 2.0))}"; then
    status="PASS"
    PASS=$((PASS + 1))
  elif [ "$errors" -gt $((total / 10)) ]; then
    status="FAIL"
    FAIL=$((FAIL + 1))
  else
    status="WARN"
    PASS=$((PASS + 1))
  fi

  printf "  [%s] %d/%d ok | avg: %ss | p95: %ss | max: %ss | min: %ss\n\n" \
    "$status" "$success" "$total" "$avg_time" "$p95_time" "$max_time" "$min_time"
done

echo "================================================"
echo "  Results: ${PASS} passed, ${FAIL} failed (${#ENDPOINTS[@]} endpoints)"
echo "================================================"

if [ "$FAIL" -gt 0 ]; then
  echo "RESULT: FAIL — Some endpoints did not meet performance targets"
  exit 1
else
  echo "RESULT: PASS — All endpoints healthy under ${CONCURRENCY} concurrent users"
  exit 0
fi
