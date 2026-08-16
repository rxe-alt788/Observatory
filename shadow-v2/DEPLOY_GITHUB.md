# Deploy Shadow Field v2 to a Public GitHub Repository

These instructions assume an existing GitHub repository that serves the Observatory as a static site.

## Recommended repository placement

Upload these files into the repository root if the public route should be:

`/shadow.html`

Files:

- `shadow.html`
- `shadow.css`
- `shadow.js`
- `README.md` or rename it to `SHADOW-V2-README.md` if the repository already has a project README
- `ARCHITECTURE.md`
- `PROJECT_WORKFLOW.md`
- `TESTS.md`
- `HITL_GATE.md`
- `DEPLOY_GITHUB.md`

Do **not** overwrite the repository's existing `README.md` unless you deliberately want Shadow Field documentation to become the repository-level README.

A safer first upload is therefore:

```text
shadow.html
shadow.css
shadow.js
shadow-v2/
  ARCHITECTURE.md
  PROJECT_WORKFLOW.md
  TESTS.md
  HITL_GATE.md
  DEPLOY_GITHUB.md
  README.md
```

The three runtime files stay at root; documentation sits in `shadow-v2/`.

---

# Method A — GitHub website

## 1. Open the repository

Open the target repository while signed in.

## 2. Upload runtime files

At repository root:

1. select **Add file**;
2. select **Upload files**;
3. add `shadow.html`, `shadow.css`, and `shadow.js`;
4. add a commit message such as:

```text
Add Shadow Field v2 source-preserving prototype
```

5. commit to the intended branch.

If `shadow.html` already exists, inspect the diff before committing.

## 3. Add documentation folder

Create or upload the `shadow-v2` documentation folder containing the Markdown files.

## 4. Confirm repository visibility

If the repository must be public, confirm visibility under repository Settings before sharing the public route.

## 5. Confirm GitHub Pages source

Open:

**Settings → Pages**

Under **Build and deployment**:

- Source: **Deploy from a branch**
- Branch: the repository's publishing branch, commonly `main`
- Folder: `/ (root)` if the site files are stored at repository root

Save if you changed the setting.

## 6. Test the public route

Once Pages has deployed, visit the site's `shadow.html` route.

Test:

- page loads;
- Three.js terrain renders;
- Primary Source maps;
- Inspector opens when a node is selected;
- Terrain correction works;
- Legitimate Remainder renders;
- Today does not fill merely because an item is Forge or Resolve;
- reload preserves local inputs and corrections;
- mobile width works.

---

# Method B — Git command line

From a clone of the repository:

```bash
git checkout main
git pull
```

Copy runtime files to repository root:

```bash
cp /path/to/observatory-shadow-v2/shadow.html .
cp /path/to/observatory-shadow-v2/shadow.css .
cp /path/to/observatory-shadow-v2/shadow.js .
```

Create documentation folder:

```bash
mkdir -p shadow-v2
cp /path/to/observatory-shadow-v2/*.md shadow-v2/
```

If you already have a repository `README.md`, remove the copied duplicate before staging:

```bash
rm shadow-v2/README.md
```

or rename it:

```bash
mv shadow-v2/README.md shadow-v2/OVERVIEW.md
```

Review:

```bash
git status
git diff -- shadow.html shadow.css shadow.js
```

Stage and commit:

```bash
git add shadow.html shadow.css shadow.js shadow-v2/
git commit -m "Add Shadow Field v2 source-preserving prototype"
git push origin main
```

Then verify the GitHub Pages deployment and public `shadow.html` route.

---

# Rollback

Before replacing an existing `shadow.html`, retain the previous version in Git history. Git already provides this if the old file is committed before replacement.

For an especially cautious public test, first deploy as:

`shadow-v2.html`

After HITL acceptance and testing, rename it to `shadow.html`.

The supplied package uses `shadow.html` because the intended final route is assumed to be the Shadow Field route; use the cautious rename path if the repository already contains a live implementation.

---

# No licence has been selected

A public GitHub repository is visible to the public, but repository visibility should not be confused with choosing an open-source software licence.

Select and add a licence deliberately if reuse, modification or contribution rights are intended.
