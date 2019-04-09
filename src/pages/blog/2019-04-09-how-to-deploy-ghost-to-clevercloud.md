---
templateKey: blog-post
title: How to deploy Ghost to CleverCloud?
date: 2019-04-09T10:45:47.332Z
description: >-
  Here's a step-by-step tutorial for deploying a Ghost application to
  CleverCloud
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
- We don't have a `package.json` at the root of our app

Let's fix this!

# 🔧 Make Ghost ready to be deployed

The directory `versions/2.19.3` directory contains this:

![Ghost version directory tree](/img/ghost-version-tree.png)

We can see a `content` directory, which contains the same structure as the root `content` directory. So, I suppose that we can merge them.

Let's move this structure to the root of our app (make sure to replace version number by our own):

- backup our `content` directory

`$ mv content _content`

- move Ghost instance to the root directory

`$ mv versions/2.19.3/* .`

⚠ You have to merge manually `_content` which contains **your data, files and themes** and `content` which contains default things.

- see the result

![root directory result](/img/ghost-mv.png)

Now, we have to configure Ghost for production environment. To do this, we copy `config.development.json` to `config.production.json` and edit it like this:

```
{
  "url": "https://YOUR_CC_APP_ID.cleverapps.io/",
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  },
  "database": {
    "client": "sqlite3",
    "connection": {
      "filename": "content/data/ghost-prod.db"
    }
  },
  "mail": {
    "transport": "Direct"
  },
  "logging": {
    "transports": [
      "file",
      "stdout"
    ]
  },
  "process": "local",
  "paths": {
    "contentPath": "content/c"
  }
}
```
