#!/bin/bash
# scripts/bump_version.sh
# Usage: ./scripts/bump_version.sh <new_version>
# Example: ./scripts/bump_version.sh 1.1.6

set -e

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
    echo "❌ Error: Please provide a version number (e.g., 1.1.6)"
    exit 1
fi

# Ensure version format (vX.X.X or X.X.X)
if [[ $NEW_VERSION != v* ]]; then
    NORMALIZED_VERSION="v$NEW_VERSION"
    CLEAN_VERSION="$NEW_VERSION"
else
    NORMALIZED_VERSION="$NEW_VERSION"
    CLEAN_VERSION="${NEW_VERSION:1}"
fi

echo "🚀 Bumping version to $NORMALIZED_VERSION..."

PROJECT_ROOT="$(dirname "$(dirname "${BASH_SOURCE[0]}")")"

# 1. Update scripts/build_android_lib.sh
echo "Updating scripts/build_android_lib.sh..."
sed -i '' "s/VERSION=\"v[0-9]*\.[0-9]*\.[0-9]*\"/VERSION=\"$NORMALIZED_VERSION\"/" "$PROJECT_ROOT/scripts/build_android_lib.sh"
# Also update the comment in output path example
sed -i '' "s/tetrisserver-lib-v[0-9]*\.[0-9]*\.[0-9]*.aar/tetrisserver-lib-$NORMALIZED_VERSION.aar/" "$PROJECT_ROOT/scripts/build_android_lib.sh"

# 2. Update Android README (gomobile command example)
echo "Updating android-server/README.md..."
sed -i '' "s/tetrisserver-lib-v[0-9]*\.[0-9]*\.[0-9]*.aar/tetrisserver-lib-$NORMALIZED_VERSION.aar/" "$PROJECT_ROOT/android-server/README.md"

# 3. Update server.go (GetVersion)
echo "Updating server.go..."
sed -i '' "s/return \"lib-v[0-9]*\.[0-9]*\.[0-9]*\"/return \"lib-$NORMALIZED_VERSION\"/" "$PROJECT_ROOT/server.go"

# 4. Update Go Tests (server_parity_test.go, server_test.go)
echo "Updating Go tests..."
sed -i '' "s/expected := \"lib-v[0-9]*\.[0-9]*\.[0-9]*\"/expected := \"lib-$NORMALIZED_VERSION\"/" "$PROJECT_ROOT/server_parity_test.go"
sed -i '' "s/if v != \"lib-v[0-9]*\.[0-9]*\.[0-9]*\"/if v != \"lib-$NORMALIZED_VERSION\"/" "$PROJECT_ROOT/server_test.go"
sed -i '' "s/Expected version lib-v[0-9]*\.[0-9]*\.[0-9]*, got/Expected version lib-$NORMALIZED_VERSION, got/" "$PROJECT_ROOT/server_test.go"



# 5. Add placeholder to CHANGELOG.md (Optional but helpful)
CHANGELOG_PATH="$PROJECT_ROOT/android-server/CHANGELOG.md"
DATE=$(date +%Y-%m-%d)
if ! grep -q "\[$CLEAN_VERSION\]" "$CHANGELOG_PATH"; then
    echo "Updating android-server/CHANGELOG.md..."
    # Insert new header after the request/intro text usually or at the top of version list
    # Assuming standard format, we insert after "documented in this file." block or before first ## [Version]
    
    # We will try to insert before the first occurence of "## ["
    # Using temp file for safety
    awk -v ver="$CLEAN_VERSION" -v date="$DATE" '
    !found && /^## \[/ {
        print "## [" ver "] - " date
        print ""
        print "### Fixed"
        print "*"
        print ""
        print "### Added"
        print "*"
        print ""
        found=1
    }
    { print }
    ' "$CHANGELOG_PATH" > "$CHANGELOG_PATH.tmp" && mv "$CHANGELOG_PATH.tmp" "$CHANGELOG_PATH"
fi

echo "✅ Version bumped to $NORMALIZED_VERSION successfully!"
echo "👉 Don't forget to fill in the CHANGELOG.md!"
