---
templateKey: blog-post
title: '[WIP] How to deploy Ghost on CleverCloud?'
date: 2019-04-09T09:15:22.370Z
description: Here's a step-by-step tutorial to deploy a Ghost application on CleverCloud
tags:
  - ghost
  - clevercloud
---
# 👻 Install Ghost locally

🧰 First, we need to init a fresh new Ghost application. According to the documentation, we need to install the `ghost-cli` package globally:

`$ npm install ghost-cli -g`

Then, we can install a local Ghost with this command:

`$ ghost install local`

🎉 We have a brand new Ghost application accessible via <http://localhost:2368>

🤔 "Where is my data?"

> The SQLite3 database is auto-setup and located in`/content/data/`

Okay, now let's explore what's just been installed:

![Ghost directory tree](/img/ghost-tree.png)

🤔 bis "Where is package.json?"

It's located in `current` which is a symlink to the current version of Ghost for our instance. Yes, it's a bit strange but ok, let's deal with it.

Clever Cloud documentation says:

    - you have pushed in master branch
    - you listen on 0.0.0.0:8080
    - your package.json either has a scripts.start or main field

With our Ghost app, we have 2 problems:
- We don't listen on 8080 (default port of Ghost is 2368)
- We don't have a package.json at the root of our app*

Let's fix this!

`current` directory contains

![Ghost directory tree](/img/ghost-version-tree.png)

We need to move the content of `current` directory to the root of our app
