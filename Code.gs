/**
 * Gmail Label Re-Sorter
 * ---------------------
 * Fixes the long-standing Gmail quirk where threads in a label view are
 * sorted by the newest *labeled* message instead of the newest message.
 *
 * How it works: new replies in a thread don't inherit the thread's label,
 * so the label view keeps sorting the thread by an old message. This script
 * periodically re-applies your labels at the thread level, which labels the
 * newest messages too — after that, Gmail sorts the label view correctly.
 *
 * Setup (one click):
 *   1. Adjust CONFIG below if you want (defaults are fine for most people).
 *   2. In the toolbar, select the function `setup` and press ▶ Run.
 *   3. Grant the permissions when asked. Done — it now runs automatically.
 *
 * To stop it later: select `uninstall` and press ▶ Run.
 *
 * Everything runs inside YOUR Google account. No data ever leaves it.
 *
 * License: MIT
 */

const CONFIG = {
  /**
   * Labels to keep sorted. Use the exact names from Gmail's sidebar.
   * Nested labels use "/", e.g. "Clients/ACME".
   *
   * Leave the list EMPTY ([]) to process ALL of your labels.
   */
  LABELS: [],

  /**
   * Only touch threads whose latest message is at most this many days old.
   * Keeps the script fast and well within Google's daily quotas.
   * Old, inactive threads don't need re-sorting anyway.
   */
  LOOKBACK_DAYS: 30,

  /**
   * How many threads to check per label on each run.
   * 100 is the maximum for batch label operations and plenty in practice,
   * because only recently active threads are modified.
   */
  MAX_THREADS_PER_LABEL: 100,

  /**
   * How often the script runs, in minutes. Allowed values: 1, 5, 10, 15, 30.
   * 15 is a good balance between freshness and quota usage.
   */
  TRIGGER_EVERY_MINUTES: 15,
};

/** Internal name of the function the time trigger calls. */
const HANDLER = 'relabelThreads';

/**
 * ONE-CLICK SETUP — run this once.
 * Installs the recurring trigger (replacing any previous one) and
 * immediately performs a first re-labeling pass so you see the effect now.
 */
function setup() {
  removeTriggers_();
  ScriptApp.newTrigger(HANDLER)
    .timeBased()
    .everyMinutes(CONFIG.TRIGGER_EVERY_MINUTES)
    .create();
  relabelThreads();
  Logger.log(
    '✅ Setup complete. Labels will be re-sorted every %s minutes. ' +
    'Run "uninstall" if you ever want to stop.',
    String(CONFIG.TRIGGER_EVERY_MINUTES)
  );
}

/**
 * Removes the recurring trigger. Run this to stop the script.
 */
function uninstall() {
  removeTriggers_();
  Logger.log('🛑 Trigger removed. The script will no longer run automatically.');
}

/**
 * The worker. Re-applies each configured label to its recently active
 * threads. Applying a label at thread level labels every message in the
 * thread — including new replies — which restores the correct sort order
 * in the label view. The operation is idempotent: already-labeled
 * messages are unaffected.
 */
function relabelThreads() {
  const labels = resolveLabels_();
  if (labels.length === 0) {
    Logger.log('⚠️ No labels found. Check CONFIG.LABELS for typos.');
    return;
  }

  const cutoff = new Date(Date.now() - CONFIG.LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  let touched = 0;

  labels.forEach((label) => {
    try {
      const threads = label
        .getThreads(0, CONFIG.MAX_THREADS_PER_LABEL)
        .filter((t) => t.getLastMessageDate() > cutoff);

      if (threads.length > 0) {
        // Batch call: one API operation per label instead of one per thread.
        label.addToThreads(threads);
        touched += threads.length;
      }
    } catch (e) {
      // Never let one broken label stop the others.
      Logger.log('⚠️ Label "%s" failed: %s', label.getName(), e.message);
    }
  });

  Logger.log('Re-labeled %s thread(s) across %s label(s).', String(touched), String(labels.length));
}

/** Returns the GmailLabel objects to process, based on CONFIG.LABELS. */
function resolveLabels_() {
  if (CONFIG.LABELS.length === 0) {
    return GmailApp.getUserLabels();
  }
  return CONFIG.LABELS
    .map((name) => {
      const label = GmailApp.getUserLabelByName(name);
      if (!label) Logger.log('⚠️ Label not found, skipping: "%s"', name);
      return label;
    })
    .filter(Boolean);
}

/** Deletes all triggers pointing at our handler (idempotent). */
function removeTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === HANDLER)
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
