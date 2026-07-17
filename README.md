# Gmail Label Re-Sorter

**Keep your Gmail label views sorted by real last activity — automatically.**

A tiny, free Google Apps Script that fixes a Gmail quirk that has annoyed people for over a decade: threads inside a label view get stuck at the position of an *old* message instead of rising to the top when a new reply arrives.

No extension. No third-party service. No data leaving your account. Five-minute setup.

---

## The problem

Gmail sorts a label view by the newest message **that carries the label** — not by the newest message in the thread.

When you apply a label, only the messages that exist *at that moment* get it. New replies arrive unlabeled. So in the label view, the thread stays buried at the date of the last message that happened to be labeled — often weeks or months ago — even though the conversation is active today.

Google has acknowledged this behavior in community threads for years without offering a setting to change it, and no browser extension can fix it, because the sort order is computed on Google's servers.

## The fix

This script periodically re-applies your labels **at the thread level**. A thread-level label operation labels every message in the thread, including the new replies. Once the newest message carries the label, Gmail's own sorting does the rest: the thread jumps to the top of the label view where it belongs.

The script is idempotent (re-labeling already-labeled messages changes nothing), touches only recently active threads to stay light on quotas, and runs entirely inside your own Google account.

## Setup (≈ 5 minutes, one time)

1. **Open Apps Script.** Go to [script.google.com](https://script.google.com) while signed in to the Gmail account you want to fix, and click **New project**.
2. **Paste the code.** Delete the placeholder content in the editor and paste the entire contents of [`Code.gs`](Code.gs). Give the project a name, e.g. *Gmail Label Re-Sorter*.
3. **(Optional) Configure.** At the top of the file, list the labels you care about, for example:
   ```javascript
   LABELS: ["Clients", "Projects/Website", "Invoices"],
   ```
   Leave the list empty (`LABELS: []`) to process **all** your labels — the default, and fine for most people.
4. **Run `setup`.** In the toolbar, select the function **`setup`** from the dropdown and press **▶ Run**.
5. **Grant permissions.** Google shows a consent screen. Because this is *your own script* in *your own account*, you may see an "unverified app" warning — click **Advanced → Go to (project name)** and allow access. The script asks for Gmail access (to read thread dates and apply labels) and permission to run when you're not present (the timer).

That's it. `setup` installs a recurring timer **and** immediately performs the first re-labeling pass, so you should see your label views fixed right away. From then on it runs automatically every 15 minutes — even when your computer is off, because it runs on Google's servers.

**To stop it later:** open the project again, select **`uninstall`**, press **▶ Run**.

## Configuration reference

All options live in the `CONFIG` block at the top of `Code.gs`:

| Option | Default | Meaning |
|---|---|---|
| `LABELS` | `[]` (all labels) | Exact label names to keep sorted. Nested labels use `/`, e.g. `"Clients/ACME"`. |
| `LOOKBACK_DAYS` | `30` | Only threads with activity in the last N days are touched. Inactive threads don't need re-sorting. |
| `MAX_THREADS_PER_LABEL` | `100` | Threads checked per label per run. 100 is the batch-operation maximum and ample in practice. |
| `TRIGGER_EVERY_MINUTES` | `15` | How often the script runs. Allowed: 1, 5, 10, 15, 30. |

After changing anything, run **`setup`** again — it replaces the old timer with the new settings.

## Privacy & security

- The script runs **only** in your Google account, under your own credentials, on Google's own infrastructure (Apps Script).
- It never sends data anywhere. There is no server, no analytics, no third party — you can verify this yourself: the code is ~150 lines and does exactly two things: read thread dates, apply labels.
- Nothing is ever deleted, archived, marked read, or modified beyond adding labels that the threads already have.
- Removing it is one click (`uninstall`), or delete the whole project.

## FAQ

**Why isn't this a Chrome extension?**
An extension can only restyle what Gmail displays — the sort order comes from Google's servers, so no client-side tool can fix it. Also, a published extension touching Gmail data requires Google's annual paid security assessment (CASA). A script you install in your own account needs none of that, and it works 24/7 even with the browser closed.

**How do I know it's actually running?**
Timer runs are completely silent — no notification, no email, nothing visible in Gmail. To see them, open your project at [script.google.com](https://script.google.com) and click the **Executions** icon (☰▶) in the left sidebar. Every run is listed there, including automatic ones, with a log line like *"Re-labeled 4 thread(s) across 12 label(s)"*. Note that Google schedules timers loosely: runs land *roughly* every 15 minutes at a randomized offset (e.g. :07, :22, :37), and the very first automatic run after setup can take up to ~30–45 minutes. If a run ever fails, the error appears in this list immediately.

**Does it affect my inbox or other views?**
No. It only adds labels the threads already carry. Your inbox, archive state, read/unread status, filters — all untouched.

**Will it hit Google's quotas?**
Very unlikely. Free consumer accounts get generous daily Apps Script quotas, and the script uses one batched call per label per run, limited to recently active threads. With the defaults (every 15 min, 30-day lookback) even inboxes with dozens of labels stay far below the limits.

**A new reply arrived and the thread didn't move up yet?**
The script runs on a timer — with the default settings, wait for the next run (see previous answer for the timing). You can also open the project and run `relabelThreads` manually for an instant fix.

**I renamed a label and it stopped being processed.**
If you listed labels explicitly in `LABELS`, update the name there and run `setup` again.

**Does it work with Google Workspace accounts?**
Yes, as long as your admin allows Apps Script (most do).

## How it works (for the curious)

`GmailApp` in Apps Script operates on labels at **thread** level: `label.addToThreads(threads)` applies the label to every message in each thread in a single batched call. The script:

1. resolves the configured labels (or all user labels),
2. fetches up to 100 threads per label,
3. keeps only those whose `getLastMessageDate()` is within the lookback window,
4. batch re-applies the label.

Newest messages now carry the label → Gmail's server-side sort puts the thread where its real last activity says it belongs.

## Contributing

Issues and pull requests are welcome. Ideas that would fit the project's spirit (tiny, safe, zero-infrastructure):

- Label exclusion list (process all labels *except* some)
- Optional email/log summary of what was re-labeled

## License

[MIT](LICENSE) — do whatever you want, no warranty.
