---
title: "[SensioLabs] Multiply your AI development speed using Git Worktrees"
date: 2026-05-25T09:00:00.000Z
description: "Stop wasting time with git stash. Learn how to combine Git Worktrees and AI coding agents like Claude Code to run parallel development sessions with zero friction."
tags:
  - cross-post
  - sensiolabs
lang: en
noindex: true
origin:
  url: https://sensiolabs.com/blog/2026/multiply-your-ai-development-speed-using-git-worktrees
  site: SensioLabs
---
At SensioLabs, the creator of Symfony, we know that Developer Experience (DX) matters more than ever to transform the way teams build software. Every developer knows the pain of context switching. Usually, this means using `git stash` to save your work, checking out a new branch, and often enduring a reinstallation of dependencies and a reset of fixtures, before you can even start looking at an urgent issue.

What if you never had to stash your work or wait for dependencies to reinstall again? Enter **Git Worktrees**. And when you combine this native [Git](https://en.wikipedia.org/wiki/Git) feature with modern AI coding agents like [Claude Code](https://code.claude.com/docs/en/overview), you unlock a completely revolutionized workflow.

## What Are Git Worktrees?

Git worktrees are a built-in feature that lets you check out multiple branches from the same repository simultaneously, each in its own separate working directory. Instead of juggling a single workspace and constantly switching states, you can have a dedicated workspace for every branch you are actively working on.

The primary purposes of Git worktrees include:

-   **Preserving complex staging:** If you have already advanced well on staging your work, worktrees allow you to work on another branch without risking a `stash pop` failing later due to modified files.
    
-   **Avoiding environment disruption:** Switching between branches that have vastly different dependencies wastes a considerable amount of time. Worktrees allow these different environments to co-exist on your disk.
    
-   **Side-by-side comparisons:** You can easily run multiple branches locally at the same time to compare behavior or review pull requests without losing context.
    

## The Next Level: Parallel AI Sessions

By using worktrees, you can run parallel AI sessions in complete isolation. This means you can have Claude Code actively developing a feature in one worktree, while you manually fix a bug in another, without either session interfering with the other.

### How it works with Claude Code

Starting an isolated AI session is incredibly simple. You just use the `--worktree` (or `-w`) flag when launching the agent:

```bash
claude --worktree my-new-feature
```

Note that worktree checkbox is enabled by default in Claude Desktop, tab “Code”. You should be careful, depending on if you want a worktree or not. It’s opt-in on Claude Code CLI, but opt-out on Claude Desktop Code.

If you omit the name, Claude will generate a random one automatically. You can also instruct specialized subagents to use worktrees, ensuring that background tasks are handled safely in parallel.

Once you exit the AI session, the cleanup is managed for you. If the agent made no changes, the worktree and its branch are automatically removed. If changes or commits were made, you will be prompted to either keep the worktree to review later or discard it entirely.

It should be noted that this worktree feature is also available on Claude Desktop (under the tab “Code”), and in many other AI coding agents (Codex, Antigravity, Gemini CLI (experimental), etc.).

## Solving the `.env` Dilemma

One common hurdle for PHP and Symfony developers using worktrees is that fresh checkouts do not include untracked files, such as your local `.env` or `.env.local` configuration files.

To make this seamless, Claude Code supports a `.worktreeinclude` file at the root of your project. Using standard `.gitignore` syntax, you can tell the agent to automatically copy your local environment files into every new worktree it creates. This means the AI agent's isolated environment is immediately ready to run and test your application.

## Conclusion

Improving Developer Experience is a core focus here at SensioLabs. By moving away from `git stash` and adopting Git worktrees, you remove friction from your daily tasks. Coupling this architecture with AI coding agents allows you to parallelize your output and tackle complex bugs and features simultaneously.
