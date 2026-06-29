# Debugging & Research Playbook

A personal guide to the *process* of solving hard software problems — especially
the gnarly "it won't build / the error is in someone else's code" kind. Written
from a real case (fixing an Xcode 26 build failure) so future-me can reuse the
*method*, not just the fix.

The one-line philosophy: **It's just code, all the way down. Nothing is magic,
everything is readable, and the answer is almost always already written down
somewhere — in a log, a lockfile, or the source. Your job is to find it, not to
guess.**

---

## 0. The mid-problem checklist (read this first when stuck)

1. **Read the actual error — literally.** What FILE, what LINE, what SYMBOL, what
   TARGET/scope? The location is often the whole answer.
2. **Get the *detailed* error, not the summary.** CLI summaries truncate. Find the
   full log before you act.
3. **Cheap diagnostics before expensive iterations.** If your feedback loop is slow
   (a 15-min build, a deploy), spend time *seeing* before *trying*. A 30-second log
   read beats a 15-minute guess.
4. **Form one hypothesis. Test the cheapest discriminating thing first.**
5. **Confirm you're testing what you think.** Tie the artifact (build/run) back to
   the exact input (commit/version). Rule out stale caches.
6. **Search the error → reach a PRIMARY source** (the tool's own repo/docs/issues),
   not just a blog.
7. **Read the dependency's real source at the exact version you run.**
8. **Make the fix surgical and add a confirmation signal** (a log line) so you can
   *see* it worked.

---

## 1. The debugging process (in order)

### Predict the failure class
Before/at the moment something breaks, name the *category*. "Old framework + new
compiler = C++/library friction." "Auth across a redirect = config/allowed-origin
issue." Pattern-matching the genre tells you where to look and that it's probably
not your fault.

### Observability before iteration
When the loop is slow, over-invest in *seeing*. The biggest time sink is acting on
a guess and waiting 15 minutes to learn nothing. Get the full log, add logging,
reproduce smaller/faster if you can.

### Read the error literally
Scope and location are usually the answer. Example that cracked a 3-attempt case:
```
CompileC .../format.o .../Pods/fmt/src/format.cc ... (in target 'fmt' from project 'Pods')
```
That `in target 'fmt'` told me the failure was in the library's *own* code, not
its consumers — invalidating three prior guesses. The line was there the whole
time; I just hadn't pulled the detailed log.

### Hypothesis → test → learn
Each failed attempt should still *teach* you something by eliminating a class of
causes. Three failed "compiler flag" fixes proved the problem wasn't flag-settable
— which pointed straight at "it must be in the source."

### Confirm you're testing what you think
Match build numbers → git commits (or version → artifact). This rules out "am I
even running my change?" — a cheap check that saves you from chasing ghosts.

### Primary sources over popularizers
Blogs/Stack Overflow give you *a* fix that worked for *their* setup. The project's
own issue tracker gives you the *why*, which lets you adapt it. Escalate blog →
official issue when the blog fix fails.

### Surgical, verifiable fix
Target the smallest correct change. Pin to the exact version. Add a log line so the
build/run output *proves* the fix ran.

### The uncomfortable meta-lesson
Be too eager to **look**, not too eager to **act**. Good debugging is mostly
disciplined observation; the fix is usually small once you understand the system.

---

## 2. How to search (turning an error into an answer)

### The core move
**The error message IS the query.** Copy the most unique-looking part verbatim —
other people who hit this bug pasted that same string somewhere.

### Build a good query (the recipe)
From the raw error, **strip what's unique to YOU, keep what's unique to the BUG**:
- ❌ Drop your specific types, file paths, hashes, variable names — nobody else's
  paste has those.
- ✅ Keep the stable, quotable phrase everyone with this bug sees.
- ✅ Add ecosystem context: the library name + your platform/version.
- ✅ Quote exact phrases so the engine matches them literally.

Template: **`"[stable error phrase]" [library name] [platform/version]`**

Real examples that worked:
```
react-native fmt "consteval function" "is not a constant expression" Xcode 26 build fix
@clerk/expo SPM "package_product_dependencies" nil spm.rb react-native build fail
```

### Read the RESULTS as a map (triage by credibility)
*Triage* = a quick sorting pass to decide what to look at first, before diving in.
1. **Project's own repo / docs / issues = authoritative.** Open these first.
2. **Blogs / Medium / SO = fast but situational.** Good first try, don't trust as
   root cause.
3. **Escalate** to the primary source when the secondary fix fails — and look for
   *why*, not just *what*.

### Searches build on each other
Early searches buy you **vocabulary** (the right macro/symbol name); later searches
use that vocabulary to get **precise**. You rarely nail it in one query.

### When to search vs. when to reason
- **Generic error in a popular tool/library?** → Search. Someone already hit it.
- **Logic specific to YOUR app?** → Reason. Nobody blogged about your code.

---

## 3. Reading a dependency's real source (a superpower)

Docs describe the code; the source *is* the code. Descriptions can be wrong or
outdated or not match your version. Source can't lie.

### Step 1 — Find the EXACT version you run
- **Lockfiles** are the source of truth: `package-lock.json`/`yarn.lock`,
  `Podfile.lock`, `poetry.lock`/`requirements.txt`, `Cargo.lock`, `go.sum`.
- **Install/build logs** print versions everywhere (e.g. `Installing fmt (11.0.2)`).
- **Commands**: `npm ls <pkg>`, `pip show <pkg>`, `go list -m all`.

### Step 2 — Check LOCAL first (instant, guaranteed-correct version)
The installed code is on disk: `node_modules/<pkg>/`, `ios/Pods/<pod>/`,
`site-packages/<pkg>/`, `~/go/pkg/mod/`. Read it directly. Only go to GitHub when
the file isn't local (e.g. CocoaPods fetches C++ source at build time).

### Step 3 — Map package → repo
`npm repo <pkg>`, the npm page's "Repository" link, or the `repository`/`homepage`
field in the package's `package.json`/podspec.

### Step 4 — Navigate by version tag (the URL trick)
GitHub URLs are predictable. `<ref>` can be a tag, branch, or commit SHA — **use
the tag matching your installed version**; branches drift.
```
github.com/<org>/<repo>/tree/<ref>              ← browse repo at a version
github.com/<org>/<repo>/blob/<ref>/<path>       ← view one file
raw.githubusercontent.com/<org>/<repo>/<ref>/<path>   ← raw file text
```
To turn a blob URL into raw: swap `github.com/.../blob/` → `raw.githubusercontent.com/...`
and drop the word `blob`. Real example:
```
raw.githubusercontent.com/fmtlib/fmt/11.0.2/include/fmt/base.h
```
**The trap:** reading `main` instead of your version may show already-fixed code or
different line numbers, so your fix won't match your installed file.

### Step 5 — Find the right file
The **error usually hands you the path** (`Pods/fmt/include/fmt/base.h` →
`include/fmt/base.h` in the repo). On a GitHub repo page: press `t` to fuzzy-find
filenames, `/` to search, or `…/search?q=SYMBOL` to find a symbol.

### Step 6 — Read just enough
Ctrl+F the symbol from the error. Read the few lines around its *definition*. You
don't need the whole file.

### Generalizes beyond GitHub
Python: read `site-packages/` or PyPI source link. Rust: `docs.rs/<crate>/<version>`
has per-item source. Go: `pkg.go.dev/<module>@<version>` links versioned source.

---

## 4. Worked case study: the Xcode 26 / fmt build failure

What it looked like and how each principle applied — a template for next time.

1. **Predicted the class:** new Apple toolchain (Xcode 26) breaking old RN. Not my
   code.
2. **First mistake:** acted on a blog fix ("compile fmt as C++17") and ran a 15-min
   build. Failed. Tried two more define-based variants. **3 builds burned guessing**
   because I worked from the truncated CLI summary.
3. **Turning point:** read the *detailed* Xcode log. One line —
   `in target 'fmt' ... format.cc` — showed the failure was in fmt's OWN code, not
   the consumers I'd assumed. My whole approach was aimed at the wrong scope.
4. **Confirmed scope:** matched build numbers → commits to prove the failing build
   really included my change (not a stale cache).
5. **Primary source:** went to fmt's own issue tracker (#4740). A maintainer stated
   the key fact no blog mentioned: *a `-D` compiler flag is ignored because base.h
   unconditionally redefines the macro.* That explained why all 3 attempts COULDN'T
   have worked.
6. **Read exact source:** pulled `raw.githubusercontent.com/fmtlib/fmt/11.0.2/include/fmt/base.h`
   (version from the pod log) and Ctrl+F'd the macro to find the precise line.
7. **Surgical + verifiable fix:** patched that one line in `post_install`, with a
   `Pod::UI.puts` log so the build output *proves* the patch fired. Build went
   green.

The lesson in one sentence: **I was too eager to act and not eager enough to look;
the detailed log + the primary source were the whole game, and they were available
the entire time.**

---

## 5. Where this work lives, and how to grow

### How common / how hard
Debugging at integration/dependency/build boundaries is a *huge* fraction of real
engineering — often more than writing new code. The *process* is a learnable skill,
not a talent gate. A given instance feels hard mostly due to **unfamiliarity
(missing mental models), not intelligence** — and unfamiliarity is the most
closeable gap in the field (just time + reps).

### Where it's most common
Boundaries and change: integration points (your code + lib + platform), build/
toolchain layers (compilers, bundlers, native builds), version upgrades (new SDK/OS/
compiler), mobile (iOS/Android) and native/C++, polyglot stacks. Rarest in pure app
logic in one mature language with no native deps.

### How to become expert
- **Reps, deliberately** — don't avoid scary errors; they're your training set.
- **Build mental models of the layers beneath you** — know what each build step does.
- **Observability before iteration.**
- **Read source when you're NOT debugging** — makes it routine under fire.
- **Treat errors as primary data**, read them literally.
- **Write a tiny post-mortem after each gnarly bug** (this file is that habit).
- **Watch experienced people debug** — the process transfers more than any one fix.

### Progression markers (measure vs. PAST you, not others)
- **Beginner:** errors feel like walls; copy-paste fixes and hope; overwhelmed.
- **Developing:** can read an error, form a guess, know roughly where to look; slow,
  with detours.
- **Proficient:** triage fast, isolate scope, reach authoritative sources, fix
  confidently.
- **Expert:** *predict* failure classes, build observability up front; gnarly stuff
  is "tractable annoyance," not panic.

Better signal than "which bucket": **trajectory.** Are bugs taking less time than 6
months ago? Do you reach the right tool sooner? Do you panic less?

### On overwhelm
It's supposed to feel like this at the start — every expert felt exactly this fog.
It lifts in layers, one understood mechanism at a time. Curiosity about the
*process* (not just the answer) is the single biggest predictor of who becomes an
expert. You're not behind; you're at the beginning, doing the beginning correctly.

---

## 6. Glossary
- **Triage:** a fast, deliberately-shallow sorting pass to decide *what to look at
  and in what order* before doing deep work (from emergency medicine). Resist diving
  into the first thing you see; spend 30 seconds picking the *right* thing.
- **Primary source:** the authoritative origin (a project's own repo/docs/issues) vs.
  a secondary source (a blog describing it).
- **Observability:** how easily you can *see* what a system is actually doing (logs,
  traces, error detail). More observability = less guessing.
