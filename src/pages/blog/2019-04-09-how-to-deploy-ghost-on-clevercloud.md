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

🎉 We have a brand new Ghost application accessible via <http://localhost:2368>!

🤔 Where is my data?

> The SQLite3 database is auto-setup and located in`/content/data/`

Okay, now let's explore what's just been installed:

![Ghost directory tree](/img/ghost-tree.png)
