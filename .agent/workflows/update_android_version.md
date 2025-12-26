---
description: Update Android Server Version & Changelog
---
1. Ask the user for the new version number (e.g., 1.1.7).
2. Ask the user to verify if they want to update the CHANGELOG.md (y/n). 
3. Run the bump version script:
   - `./scripts/bump_version.sh <VERSION>`
4. If the user confirmed changelog update, remind them to edit `android-server/CHANGELOG.md` to add details about what changed.
   - Use `view_file android-server/CHANGELOG.md` to show the current state if needed.
