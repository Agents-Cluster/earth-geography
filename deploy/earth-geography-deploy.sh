#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="/srv/earth-geography"
SOURCE_DIR="$PROJECT_ROOT/source"
WEB_ROOT="$PROJECT_ROOT/web"
REPO_URL="https://github.com/Agents-Cluster/earth-geography.git"
BRANCH="main"

install -d -m 0755 "$PROJECT_ROOT" "$WEB_ROOT" "$WEB_ROOT/releases"
exec 9>"$PROJECT_ROOT/deploy.lock"
flock -n 9 || exit 0

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  clone_dir="$(mktemp -d "$PROJECT_ROOT/.clone.XXXXXX")"
  trap 'rm -rf "$clone_dir"' EXIT
  git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$clone_dir"
  mv "$clone_dir" "$SOURCE_DIR"
  trap - EXIT
else
  git -C "$SOURCE_DIR" fetch --depth=1 origin "$BRANCH"
fi

if [[ -n "$(git -C "$SOURCE_DIR" status --porcelain)" ]]; then
  echo "source checkout has local changes; refusing to deploy" >&2
  exit 1
fi

commit="$(git -C "$SOURCE_DIR" rev-parse "origin/$BRANCH")"
current=""
if [[ -L "$WEB_ROOT/current" ]]; then
  current="$(readlink "$WEB_ROOT/current")"
fi

if [[ "$current" == "releases/$commit" && -f "$WEB_ROOT/current/index.html" ]]; then
  exit 0
fi

git -C "$SOURCE_DIR" checkout --detach "origin/$BRANCH"
cd "$SOURCE_DIR"
npm ci --no-audit --no-fund
npm run typecheck
npm run build

release="$WEB_ROOT/releases/$commit"
install -d -m 0755 "$release"
cp -a dist/. "$release/"

next_link="$WEB_ROOT/.current-$commit"
ln -sfn "releases/$commit" "$next_link"
mv -Tf "$next_link" "$WEB_ROOT/current"
