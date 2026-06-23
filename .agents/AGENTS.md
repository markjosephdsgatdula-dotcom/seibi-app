Please think and respond in English.

# Token Saving & File Access Constraints

To keep conversations fast, context sizes small, and costs minimal, you must strictly follow these rules:

1. **Do Not Scan the Entire Repo:** Never run recursive workspace searches, list large directories, or scan the entire project unless explicitly instructed to do so (e.g. "find all references of X").
2. **Strict File Focus:** Limit your reading (`view_file`) ONLY to the files explicitly mentioned in the user's prompt or direct dependencies of those files.
3. **No Speculative Reading:** If you suspect an issue might be in an adjacent file, ask for confirmation first instead of reading it immediately.
4. **Prefer Targeted Edits:** When editing, use target replacement tools rather than reading or rewriting entire files.
