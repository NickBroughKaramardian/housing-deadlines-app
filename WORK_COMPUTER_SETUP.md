# Work computer setup (Windows)

How to find the project, confirm it's ready, and start working on it with Claude.

## Where the project is

The project folder is:

```
C:\Users\NickKaramardian\projects\housing-deadlines-app
```

To open it in File Explorer, paste that path into the File Explorer address bar
and press Enter. Or, from PowerShell:

```powershell
cd $HOME\projects\housing-deadlines-app
explorer .
```

Keep it in `C:\Users\NickKaramardian\projects`. Don't move it into `Documents`
or `Desktop`: on this computer those folders sync to OneDrive, and OneDrive
handles `node_modules` (tens of thousands of small files) badly.

## How to know it's ready

Open PowerShell and paste this whole block. It checks everything at once.

```powershell
cd $HOME\projects\housing-deadlines-app
$checks = [ordered]@{
  "Git installed"              = [bool](Get-Command git -ErrorAction SilentlyContinue)
  "Node installed"             = [bool](Get-Command node -ErrorAction SilentlyContinue)
  "Project folder found"       = Test-Path "package.json"
  "HANDOFF.md present"         = Test-Path "HANDOFF.md"
  "Frontend packages installed"= Test-Path "node_modules"
  "Backend packages installed" = Test-Path "azure-functions\node_modules"
  "Build has been run"         = Test-Path "build\index.html"
  "No uncommitted changes"     = -not (git status --porcelain)
}
$checks.GetEnumerator() | ForEach-Object {
  "{0,-30} {1}" -f $_.Key, $(if ($_.Value) { "OK" } else { "MISSING" })
}
```

If every line says `OK`, the project is ready for Claude.

If a line says `MISSING`:

| Line | Fix |
|---|---|
| Git installed / Node installed | See "If git or node isn't recognized" below |
| Project folder found | You're in the wrong folder, or the clone didn't finish. Rerun the clone from `$HOME\projects` |
| Frontend packages installed | Run `npm install` in the project folder |
| Backend packages installed | Run `cd azure-functions; npm install; cd ..` |
| Build has been run | Run `npm run build`. It should end with `The build folder is ready to be deployed.` About 17 lint warnings above that are normal |
| No uncommitted changes | Run `git status` to see what changed. This is only a problem if you didn't expect changes |

## Starting Claude

### Option A: Claude Code (runs in PowerShell)

Install it once:

```powershell
irm https://claude.ai/install.ps1 | iex
```

This installs to your user folder and doesn't need admin. If that command is
blocked, use `npm install -g @anthropic-ai/claude-code` instead. Current
instructions are at https://docs.anthropic.com/en/docs/claude-code.

Then, every time you want to work on the project:

```powershell
cd $HOME\projects\housing-deadlines-app
claude
```

Claude Code works on whatever folder you start it in, so always `cd` into the
project first.

### Option B: Cursor

Open Cursor, choose **File > Open Folder**, and select
`C:\Users\NickKaramardian\projects\housing-deadlines-app`.

### Your first message to Claude

Paste this so it picks up where the last session left off:

> Read HANDOFF.md first. It explains the project, what the audit changed, and
> the deployment constraints. Then summarize the current state and the known
> remaining items before we change anything.

## Day-to-day

Before you start each session, pull the latest changes:

```powershell
cd $HOME\projects\housing-deadlines-app
git pull
```

The first time Claude or you push changes back to GitHub, a browser window will
open asking you to sign in to GitHub. That's Git Credential Manager, which came
with Git. Sign in once and it remembers you.

Two things not to do:

- **Don't run `npm audit fix --force`.** npm reports about 62 vulnerabilities in
  old dependencies of `react-scripts`. The `--force` fix upgrades packages in
  ways that break the build.
- **Don't deploy the frontend before the backend.** See the "Deploying" section
  of `HANDOFF.md`.

## If git or node isn't recognized

This happened during setup: Git was installed, but PowerShell couldn't find it.
Close every PowerShell window and open a new one. If it still isn't found, run
this, which reloads the program list for the current window:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
git --version
node -v
```

If that works but the problem comes back in every new window, ask Claude to
fix your `PATH` permanently. It's a user setting and doesn't need admin.

## What was done during setup

For reference, these were run once on this computer and don't need repeating:

- Installed Git 2.55.0, Node 24.2.0, and Azure CLI 2.90.0 with `winget`.
- `git config --global core.autocrlf true` (Windows line endings).
- `git config --global core.longpaths true` (allows the long file paths in
  `node_modules`). The `--system` version needs admin; `--global` does the same
  for your account.
- Cloned with `git clone --depth 1` to skip about 889 MB of old history.
- Ran `npm install` in the project folder and in `azure-functions`, then
  `npm run build`, which succeeded.
