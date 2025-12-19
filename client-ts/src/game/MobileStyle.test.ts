import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Mobile CSS Styles', () => {
    it('should not hide the h1 title on mobile devices', () => {
        const stylePath = path.resolve(__dirname, '../style.css');
        const cssContent = fs.readFileSync(stylePath, 'utf-8');

        // Find the mobile media query block

        // Since we know the structure, let's look for the specific h1 rule inside the file roughly.

        // Better: Check if "h1" and "display: none" exist close to each other inside the media query block.
        // We know the exact string causing the issue:
        // h1 { ... display: none; ... } inside the @media block.

        // Let's grab the content of the media query specifically if possible, or just simpler regex.
        // Match:  @media (max-width: 768px) { ... h1 { ... display: none; ... } ... }

        // We will fail if we find "display: none" inside explicit h1 block
        // Caveat: Regex for nested braces is impossible in standard JS content, but we can approximate.

        // Looking at the file content line by line might be safer if we want to be precise, or just "file should not contain 'h1 { ... display: none' near '@media (max-width: 768px)'"

        // Let's use a simpler heuristic for this specific regression.
        // We want to ensure 'display: none' is NOT applied to 'h1' in the mobile block.

        // Extract the mobile media query block
        const mobileBlockMatch = cssContent.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\}/);
        // Note: the end brace matching is fragile. 
        // Based on previous file view, the media query starts at line 113 and ends at line 249.

        expect(mobileBlockMatch).not.toBeNull();
        const mobileBlock = mobileBlockMatch![1];

        // Check for h1 rule
        const h1RuleMatch = mobileBlock.match(/h1\s*\{([\s\S]*?)\}/);
        expect(h1RuleMatch).not.toBeNull();
        const h1Body = h1RuleMatch![1];

        // Assert that display: none is NOT present
        expect(h1Body).not.toContain('display: none');
    });
});
