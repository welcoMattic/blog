---
title: How to deploy Ghost on Clever Cloud?
date: 2019-04-09T10:45:47.332Z
description: >-
  Here's a step-by-step tutorial for deploying a brand new Ghost application on Clever Cloud.
tags:
  - ghost
  - clever cloud
  - english
---
## 👻 Install Ghost locally

First, we need to init a fresh new Ghost application. According to [the documentation](https://github.com/TryGhost/Ghost#quickstart-install), we need to install the `ghost-cli` package globally:

`$ npm install ghost-cli -g`

Then, we can install a local Ghost with this command:

`$ ghost install local`

🎉 We have a brand new Ghost application accessible via <http://localhost:2368>

> 🤔 "Where is my data?"

Ghost documentation says:

> The SQLite3 database is auto-setup and located in`/content/data/`

Okay, now let's explore what's just been installed:

![Ghost directory tree](/img/ghost-tree.png)

> 🤔 bis "Where is package.json?"

It's located in `current` which is a symlink to the current version of Ghost for our instance. Yes, it's a bit strange but ok, let's deal with it.

Clever Cloud documentation says:

    - you have pushed in master branch
    - you listen on 0.0.0.0:8080
    - your package.json either has a scripts.start or main field

With our Ghost app, we have 2 problems:
- We don't listen on 8080 (default port of Ghost is 2368)
- We don't have a `package.json` at the root of our app

Let's fix this!

## 🔧 Make Ghost ready to be deployed

The directory `versions/2.19.3` directory contains this:

![Ghost version directory tree](/img/ghost-version-tree.png)

We can see a `content` directory, which contains the same structure as the root `content` directory. So, I suppose that we can merge them.

Let's move this structure to the root of our app (make sure to replace version number by our own):

- backup our `content` directory

`$ mv content _content`

- move Ghost instance to the root directory

`$ mv versions/2.19.3/* .`

> ⚠ You have to merge manually `_content` which contains **your data, files and themes** and `content` which contains default things.

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
    "contentPath": "content/"
  }
}
```

As mentionned earlier, Clever Cloud needs a `start` entry under `scripts` in package.json. By default Ghost gets one, but we have to update it to force Ghost to to start in production mode:

```
"start": "NODE_ENV=production node index",
```

A last step before next chapter, we must add `content` directory to the `.gitignore` file, which should be like this:

```
node_modules/
content/
.ghostpid
```

Now, our app is ready. Let's open Clever Cloud dashboard to prepare the deployment.

## 💡☁ Create a NodeJS application on Clever Cloud

I invite you to follow [official documentation](https://www.clever-cloud.com/doc/clever-cloud-overview/add-application/#create-an-application) to create a NodeJS application.

Once it's done, we need to link an FS addon to our application. To do this, go to the [addon creation page](https://console.clever-cloud.com/users/me/addons/new) and select FS Bucket:

![Addon creation page](/img/console-clever-cloud.png)

Then, go back in your application settings, go to "Service dependencies" item, and link your addon to your app.

The last step takes place in "Environment variables". You should see a `BUCKET_HOST` variable on the second aprt of the page. Now, create a new variable `CC_FS_BUCKET` with this value `content:<the value of BUCKET_HOST>`.

## 🚀 Let's push!

If your create your Clever Cloud application from a GitHub repository, you only have to `git push` your code to GitHub, and Clever Cloud will automatically deploy your code!

If not, you have to follow this documentation to add Clever Cloud remote to your git configuration. Then you will be able to push to Clever Cloud!

<hr>

Thanks for reading!

enjoy();
