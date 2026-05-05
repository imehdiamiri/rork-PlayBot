# Fix Metro "Script not found expo" error

**The problem**

The app fails to start because the Expo runtime can't be located. This usually happens when dependencies get out of sync.

**The fix**

- Reinstall the app's dependencies cleanly so the Expo runtime is found again.
- Restart the bundler with a fresh cache.
- Verify the app boots in the preview without errors.

No design, screens, or features will change — this is purely a startup fix.