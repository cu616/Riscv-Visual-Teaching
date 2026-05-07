#!/usr/bin/env bash
set -euo pipefail

# Run this script from the repository root in Git Bash.
# Optional first argument: target branch name.
BRANCH="${1:-feat/openharmony-workspace-visualization}"
COMMIT_MESSAGE="${COMMIT_MESSAGE:-feat: integrate OpenHarmony workspace visualization}"

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Please run this script inside the Riscv-Visual-Teaching repository."
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"

if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  git switch "${BRANCH}"
else
  git switch -c "${BRANCH}"
fi

git add \
  app/README.md \
  app/index.html \
  app/src/app.js \
  app/styles.css \
  openharmony-port/entry/src/main/resources/rawfile/app/index.html \
  openharmony-port/entry/src/main/resources/rawfile/app/src/app.js \
  openharmony-port/entry/src/main/resources/rawfile/app/styles.css \
  docs/OpenHarmony*.md \
  scripts/upload_openharmony_workspace_visualization.sh

if git diff --cached --quiet; then
  echo "No staged changes to commit."
else
  git commit -m "${COMMIT_MESSAGE}"
fi

git push -u origin "${BRANCH}"
