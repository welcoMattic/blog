---
title: "[JoliCode] Quick PHP tip: Initialize a DateTime object from string, but with time resetted"
date: 2023-02-16T09:00:00.000Z
description: "Initialize the PHP DateTime object For a variety of reasons, we all have to initialize DateTime objects from strings like 2023-02-14. The quick and clean way to get an object from this kind of string is to use"
tags:
  - cross-post
  - jolicode
  - php
  - date
  - tips
lang: en
noindex: true
origin:
  url: https://jolicode.com/blog/quick-php-tip-initialize-a-datetime-object-from-string-but-with-time-resetted
  site: JoliCode
---

## Initialize the PHP DateTime object

For a variety of reasons, we all have to initialize DateTime objects from strings like `2023-02-14`.

The quick and clean way to get an object from this kind of string is to use `createFromFormat` method of `DateTime` (or `DateTimeImmutable`):

```php
$dateTime = \DateTime::createFromFormat('Y-m-d', '2023-02-14');
var_dump($dateTime);
```

If I run this code today at 18:40:29, the output will be:

```
^ DateTime @1676367954 {#3
    date: 2023-02-14 18:40:29.0 Europe/Paris (+01:00)
}
```

Yes, PHP sets the time of our new DateTime object with the current time, at the moment of the execution! 🧐

## Reset the time

Now, let’s reset this weird time value. We can easily do it by calling the `setTime` method on our DateTime object:

```php
$dateTime = \DateTime::createFromFormat('Y-m-d', '2023-02-14');
$dateTime = $dateTime->setTime(0, 0);
var_dump($dateTime);
```

If I run this code today at 18:41:12, the output will be:

```
^ DateTime @1676329200 {#10
    date: 2023-02-14 00:00:00.0 Europe/Paris (+01:00)
}
```

But we have to call two methods to get the desired value, isn’t there a more concise way to do this?

Yes there is! To reset the time at the object initialization, we can use a little-known and poorly documented feature of PHP, the BANG: `!`.

```php
$dateTime = \DateTime::createFromFormat('!Y-m-d', '2023-02-14');
var_dump($dateTime);
```

If I run this code today at 18:42:01, the output will be:

```
^ DateTime @1676329200 {#3
    date: 2023-02-14 00:00:00.0 Europe/Paris (+01:00)
}
```

🎉 Tada! We have our DateTime object, with time at midnight, in one line of code!

Two alternative syntaxes exist, especially one without the discrete `!` character

The first with `|` at the end of the date string expression:

```php
$dateTime = \DateTime::createFromFormat('Y-m-d|', '2023-02-14');
var_dump($dateTime);
```

If I run this code today at 18:42:01, the output will be:

```
^ DateTime @1676329200 {#3
    date: 2023-02-14 00:00:00.0 Europe/Paris (+01:00)
}
```

> Please note, `!` or `|` character will reset not only time, but all values that are not present, or not parsed from your input string.

The second with `midnight` word at the end of the date expression, which is more visible while you quickly read a piece of code:

```php
$dateTime = new \DateTime('2023-02-14 midnight');
var_dump($dateTime);
```

If I run this code today at 18:42:01, the output will be:

```
^ DateTime @1676329200 {#3
    date: 2023-02-14 00:00:00.0 Europe/Paris (+01:00)
}
```

Before leaving this page, did you know you can write this kind of code? 🤯

```php
$firstDayOfNextMonth = new \DateTime('first day of next month');
$tomorrowAtNoon = new \DateTime('tomorrow noon');
$lastDayOfTheLastWeek = new \DateTime('last day of last week');
```

Let us know if you have any other quick tips about little-known features of PHP DateTime!

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/quick-php-tip-initialize-a-datetime-object-from-string-but-with-time-resetted', max\_shown\_comments: 20, theme: 'light', page\_title: "Quick PHP tip: Initialize a DateTime object from string, but with time resetted", locale: 'en', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Ces clients ont profité de notre expertise
