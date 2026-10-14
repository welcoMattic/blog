---
title: "Messenger Central: drive your Messenger workers from the terminal"
date: 2026-10-14T09:00:00.000Z
description: "A Symfony bundle to start, scale and watch your Messenger workers in development from a terminal UI, and send failed messages back once fixed."
tags:
  - symfony
  - php
  - messenger
  - tui
lang: en
---
_Cet article est aussi disponible en 🇫🇷 Français : [Messenger Central : piloter les workers Messenger depuis le terminal](/blog/2026-10-14-messenger-central-piloter-les-workers-messenger-depuis-le-terminal/)._

## One terminal per transport

In [article #5 of the Symfony on Clever Cloud series](/blog/2026-09-29-symfony-clever-cloud-5-messenger-workers/), I covered Messenger workers in production: one process per transport, restarted by the platform, watched through metrics. In development, it is another story. You open a terminal per transport to run `messenger:consume`, forget to restart the one still running the old code, scroll back through the logs to find the message that failed, and end up with `messenger:failed:show` and `messenger:failed:retry` in a fifth terminal tab.

I wanted a single window for all of it. The [TUI component](https://symfony.com/doc/current/tui.html), experimental since Symfony 8.1, gave me the opportunity: [Messenger Central](https://github.com/welcoMattic/messenger-central) is a development bundle that drives your workers from the terminal.

<video controls muted playsinline preload="metadata" width="1350" height="916" poster="/img/messenger-central/demo-poster.webp">
  <source src="/video/messenger-central/demo.mp4" type='video/mp4; codecs="avc1.640028"'>
  <source src="/video/messenger-central/demo.webm" type='video/webm; codecs="vp9"'>
</video>

## What the bundle does

- **The transports** of your application, in a sidebar, with their running workers and waiting messages.
- **The workers**, started, stopped and scaled from the keyboard. They are real `messenger:consume` processes, started through your console: nothing to change in the application. The ones that stop by themselves (`--time-limit`, `--memory-limit`) are started again at once, the ones that crash too, after a growing delay.
- **A live view**: incoming rate, the message each worker handles and for how long, the queue, the last handled, retried or failed messages with their error, and what the workers write (logs, `dump()`).
- **Failed messages**: on a failure transport, you page through them, read the full error with its stack trace, remove them, or send them back to the transport they failed on, as is or after fixing their properties in a JSON editor.
- **The concurrency** of Symfony 8.2, due in November: with `amphp/parallel`, each worker can handle several messages at a time.

Each worker also gets a unique `MESSENGER_CONSUMER_NAME`, to plug into the `consumer` option of Redis transports, so that scaled workers do not share their pending messages.

Everything is driven from the keyboard, and a help screen (`?`) lists all the useful shortcuts.

## Shall we try it?

It is a development tool, so it goes in your dev dependencies:

```bash
composer require --dev welcomattic/messenger-central
php bin/console messenger:central
```

It needs PHP 8.4 or higher, Symfony 8.1 with Messenger, and a Unix-like system (Linux, macOS or WSL). With the `pcntl` extension, workers finish their current message when you stop them. As a safety net, the command refuses to run when the kernel runs without debug, which still lets you use it locally, in the prod environment with debug on, if needed.

The README details [the keys](https://github.com/welcoMattic/messenger-central#usage) and [the configuration](https://github.com/welcoMattic/messenger-central#configuration), all of it optional: options given to `messenger:consume`, stop timeout of the workers, default concurrency.

## What comes next

This [0.1.0](https://github.com/welcoMattic/messenger-central/releases/tag/v0.1.0) is the first release. It builds on a component that is still experimental, so it will follow its changes release after release. If you try it, I would love your feedback: issues, pull requests, and "it would be great if it also did X" are all welcome on [GitHub](https://github.com/welcoMattic/messenger-central).
