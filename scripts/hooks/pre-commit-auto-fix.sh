#!/bin/bash

# Configuration
LUMA_DIR="/Users/oatrice/Software-projects/Luma"
CLIENT_DIR="/Users/oatrice/Software-projects/Tetris-Battle/client-ts"
LOG_FILE="/Users/oatrice/Software-projects/Tetris-Battle/logs/pre-commit.log"

# Create log directory if needed
mkdir -p "$(dirname "$LOG_FILE")"

# Start logging (append mode with timestamp)
echo "" >> "$LOG_FILE"
echo "========== $(date '+%Y-%m-%d %H:%M:%S') ==========" >> "$LOG_FILE"

echo "🔍 [Pre-commit] Running Tests in client-ts..." | tee -a "$LOG_FILE"

cd "$CLIENT_DIR" || exit 1

# Run tests and capture BOTH output and exit code correctly
# Using a temp file to avoid PIPESTATUS issues with command substitution
TEMP_OUTPUT=$(mktemp)
npx vitest run > "$TEMP_OUTPUT" 2>&1
TEST_EXIT_CODE=$?

# Log and capture output
TEST_OUTPUT=$(cat "$TEMP_OUTPUT")
cat "$TEMP_OUTPUT" >> "$LOG_FILE"
rm -f "$TEMP_OUTPUT"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ [Pre-commit] All tests passed." | tee -a "$LOG_FILE"
    exit 0
fi

echo "❌ [Pre-commit] Tests Failed. (Exit Code: $TEST_EXIT_CODE)" | tee -a "$LOG_FILE"
echo "🤖 [Pre-commit] Invoking Luma Agent to Auto-Fix..." | tee -a "$LOG_FILE"

# Call Luma
cd "$LUMA_DIR" || exit 1

# Pipe error log to Luma
echo "Fix the following build/test errors in Tetris-Battle/client-ts:\n\n$TEST_OUTPUT" | python3 main.py 2>&1 | tee -a "$LOG_FILE"

LUMA_EXIT_CODE=$?

if [ $LUMA_EXIT_CODE -ne 0 ]; then
    echo "❌ [Pre-commit] Luma Agent failed or encountered an error." | tee -a "$LOG_FILE"
    exit 1
fi

echo "🔄 [Pre-commit] Luma finished. Re-running tests verification..." | tee -a "$LOG_FILE"

cd "$CLIENT_DIR" || exit 1

# Re-run verification with proper exit code capture
npx vitest run 2>&1 | tee -a "$LOG_FILE"
VERIFY_EXIT_CODE=${PIPESTATUS[0]}

if [ $VERIFY_EXIT_CODE -eq 0 ]; then
    echo "✅ [Pre-commit] Auto-Fix Successful! Staging fixed files..." | tee -a "$LOG_FILE"
    git add .
    exit 0
else
    echo "❌ [Pre-commit] Auto-Fix Attempted but Tests still failing. Please check manually." | tee -a "$LOG_FILE"
    exit 1
fi
