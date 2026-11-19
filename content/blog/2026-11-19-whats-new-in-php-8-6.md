---
title: "What's new in PHP 8.6"
date: 2026-11-19T09:00:00.000Z
description: "Partial Function Application, Time\\Duration, clamp(), readonly property defaults, the SortDirection enum, stream errors as exceptions: a tour of what's new in PHP 8.6 and what to check before upgrading."
tags:
  - php
  - php86
lang: en
---
_Cet article est aussi disponible en 🇫🇷 Français : [Les nouveautés de PHP 8.6](/blog/2026-11-19-les-nouveautes-de-php-8-6/)._

Here we go, PHP 8.6 is out today! As every year, the changelog is long (the [UPGRADING](https://github.com/php/php-src/blob/php-8.6.0/UPGRADING) file is close to 1,200 lines), and a good part of it covers extensions you may never use. So I sorted through it, and here are the new features that will change our everyday code, followed by what to check before upgrading.

## [Partial Function Application](https://wiki.php.net/rfc/partial_function_application_v2) (PFA)

This is THE feature of this release. Since PHP 8.1, the first-class callable syntax lets you write `strtoupper(...)` to get a `Closure` from a function. PHP 8.6 takes this idea further: you can now call a function with only some of its arguments, and replace the others with a placeholder. Instead of running the function, PHP returns a `Closure` that expects the missing arguments.

There are two placeholders:

- `?` stands for exactly one argument;
- `...` stands for all the remaining arguments.

A quick before / after will speak louder than words:

_Before_

```php
$names = ['  alice ', 'BOB', ' charlie'];

$clean = array_map(
    static fn (string $name): string => str_replace(' ', '', $name),
    $names,
);
```

_After_

```php
$clean = array_map(str_replace(' ', '', ?), $names);
// ['alice', 'BOB', 'charlie']
```

The generated `Closure` is not a black box: it keeps the name, type and default value of the remaining parameters, as well as the return type of the original function. Your IDE and static analysis tools can inspect it like any other typed function.

The `...` placeholder is mostly useful to fix the first arguments and leave the rest open:

```php
function greet(string $greeting, string $name, string $punctuation = '!'): string
{
    return "$greeting $name$punctuation";
}

$hello = greet('Hello', ...);

echo $hello('Mathieu');      // Hello Mathieu!
echo $hello('Mathieu', '?'); // Hello Mathieu?
```

Note that you can also pass every argument and end with `...`: you get a `Closure` with no parameters, which you can run later.

### With the pipe operator

This is where PFA really shines. The `|>` operator introduced in PHP 8.5 expects, on its right-hand side, a callable that takes a single argument. Until now, as soon as the function needed more than one, you had to wrap it in an arrow function. With `?`, no need anymore:

```php
$slug = $names
    |> array_map(trim(...), ?)
    |> array_map(strtolower(...), ?)
    |> implode('-', ?);

// alice-bob-charlie
```

And it's even faster than before: PHP 8.6 now compiles an `array_map()` whose callback is a first-class callable or a PFA into an equivalent `foreach` loop, without creating an intermediate `Closure`.

> ⚠ A PFA whose placeholders don't cover the required parameters throws an `ArgumentCountError` as soon as it is created: `greet(?)` gives "Partial application of greet() expects at least 2 arguments, 1 given".

## [Time\Duration](https://wiki.php.net/rfc/duration_class)

We regularly come across a `$timeout` parameter without knowing whether it expects seconds, milliseconds or microseconds. Not to mention the APIs that split `$seconds` and `$microseconds` into two parameters, or the ones that accept a `float`, with the precision issues that come with it 😅

`DateInterval` doesn't fit this need, because it deals with days and months, whose length depends on the calendar and on daylight saving time changes. PHP 8.6 therefore introduces `Time\Duration`, a `final readonly` class that represents a "stopwatch" duration, with nanosecond precision.

You create one with a named constructor per unit:

```php
use Time\Duration;

$timeout = Duration::fromMilliseconds(1500);

$timeout->seconds;     // 1
$timeout->nanoseconds; // 500000000

Duration::fromIso8601DurationString('PT1H30M')->seconds; // 5400
```

The other constructors are `fromSeconds()`, `fromNanoseconds()`, `fromMicroseconds()`, `fromMinutes()` and `fromHours()`. There is no `fromDays()`, and that's on purpose: a day is not always 24 hours long. For the same reason, an ISO 8601 string containing a date part (`P1D`) throws a `Time\TimeException`.

Objects are immutable, every operation returns a new instance: `add()`, `sub()`, `multiplyBy()`, `divideBy()`, `negate()` and `absolute()`. Comparison operators work directly. Here is, for example, how to compute an exponential backoff delay:

```php
$baseDelay = Duration::fromMilliseconds(100);
$attempt = 5;

$delay = $baseDelay->multiplyBy(2 ** $attempt); // 3.2 seconds

if ($delay > Duration::fromSeconds(3)) {
    // ...
}
```

To sort a list of durations, `Duration::compare()` works directly with `usort()`:

```php
usort($durations, Duration::compare(...));
```

> ℹ For now, existing functions don't accept a `Duration`: `sleep(Duration::fromSeconds(1))` throws a `TypeError`. The only API already using it in this release is the new polling API, covered below. The RFC presents this class as the first building block of a modernized date and time library, so more will come in future releases.

## [clamp()](https://wiki.php.net/rfc/clamp_v2)

A small function, but one everybody has rewritten at least once. `clamp()` returns the value if it lies between two bounds, and the nearest bound otherwise:

```php
clamp(150, min: 0, max: 100); // 100
clamp(-3, min: 0, max: 100);  // 0
clamp(42, min: 0, max: 100);  // 42
```

Goodbye `max(0, min(100, $value))`, which you had to read twice to make sure `min` and `max` weren't swapped. The function also checks its bounds: if `$min` is greater than `$max`, or if either of them is `NAN`, it throws a `ValueError`.

It follows PHP's usual comparison rules, so it also works with strings or `DateTimeImmutable` objects. As with `min()` and `max()`, just avoid mixing types.

## [Readonly property defaults](https://wiki.php.net/rfc/readonly_property_defaults)

Until now, a `readonly` property could not have a default value. The original RFC considered it useless, since such a property behaves like a constant. But since PHP 8.4, an interface can declare properties, and a constant cannot fulfill that contract.

This code now works:

```php
interface Exporter
{
    public string $format { get; }
    public string $mimeType { get; }
}

final readonly class CsvExporter implements Exporter
{
    public string $format = 'csv';
    public string $mimeType = 'text/csv';
}
```

No more constructor or getter needed to expose fixed metadata. The default value counts as the property initialization: any later assignment, including in the constructor, throws an `Error` ("Cannot modify readonly property CsvExporter::$format").

## [The SortDirection enum](https://wiki.php.net/rfc/sort_direction_enum)

`SORT_ASC` and `SORT_DESC` for `array_multisort()`, `SCANDIR_SORT_ASCENDING` for `scandir()`, `'ASC'` and `'DESC'` strings, `$ascending` booleans... Every library ended up creating its own type to express a sort direction. Doctrine, for instance, introduced its own `Order` enum.

PHP 8.6 adds a `SortDirection` enum to the global namespace, with two cases: `Ascending` and `Descending`.

```php
function sortBy(array $items, SortDirection $direction = SortDirection::Ascending): array
{
    usort($items, fn ($a, $b) => match ($direction) {
        SortDirection::Ascending => $a <=> $b,
        SortDirection::Descending => $b <=> $a,
    });

    return $items;
}

sortBy([3, 1, 2], SortDirection::Descending); // [3, 2, 1]
```

The enum is not backed: there is no single scalar representation that would suit every use case. If you need `'ASC'` for an SQL query or `'desc'` for a URL parameter, a `match` does the job.

The main point of this enum is to provide a common type that frameworks and libraries can accept. The RFC also mentions using it in the standard library in the future, for example for the second parameter of `scandir()`.

## [Stream errors as exceptions](https://wiki.php.net/rfc/stream_errors)

Stream functions (`fopen()`, `file_get_contents()`, etc.) report their errors through warnings, which forces you to juggle with `@`, `error_get_last()` or a temporary error handler. PHP 8.6 adds an `error_mode` context option to make them throw an exception instead:

```php
$context = stream_context_create([
    'stream' => [
        'error_mode' => StreamErrorMode::Exception,
    ],
]);

try {
    $handle = fopen('/nope/config.json', 'r', false, $context);
} catch (StreamException $e) {
    echo $e->getMessage();
    // Failed to open stream: No such file or directory

    $error = $e->getErrors()[0];
    echo $error->wrapperName; // plainfile
    echo $error->code->name;  // OpenFailed
}
```

The exception carries structured `StreamError` objects, with the wrapper involved and a code as an enum (`StreamErrorCode`). You can also pick `StreamErrorMode::Silent` and fetch the errors afterwards with `stream_last_errors()`. Without this option, nothing changes: streams still emit warnings. That's what `StreamErrorMode::Error`, the default value, stands for, its name referring to PHP's classic error system (warnings and notices).

## [A polling API](https://wiki.php.net/rfc/poll_api)

This one mostly concerns authors of asynchronous libraries such as AMPHP or ReactPHP. Until now, PHP only offered `stream_select()`, based on the `select()` system call, which is limited in the number of file descriptors and performs poorly at scale. The new `Io\Poll` namespace gives access to each system's modern mechanisms (`epoll` on Linux, `kqueue` on macOS and BSD) behind a single API:

```php
use Io\Poll\{Context, Event};
use Time\Duration;

$poll = new Context(); // picks the best available backend
$poll->add(new StreamPollHandle($socket), [Event::Read], data: 'client #1');

foreach ($poll->wait(Duration::fromSeconds(1)) as $watcher) {
    if ($watcher->hasTriggered(Event::Read)) {
        echo $watcher->getData(), ': ', fgets($socket);
    }
}
```

You'll notice that `wait()` takes a `Time\Duration` as its timeout parameter 😉

## Before upgrading

As always, a minor release comes with its share of behavior changes and deprecations. Here are the ones most likely to affect you.

### Sessions are secure by default

This is the change most likely to have a visible effect. [Three session directives](https://wiki.php.net/rfc/session_security_defaults) get new default values:

- `session.use_strict_mode` becomes `1`: PHP rejects an uninitialized session ID (one with no matching entry in the storage), which protects against session fixation;
- `session.cookie_httponly` becomes `1`: the session cookie can no longer be read from JavaScript;
- `session.cookie_samesite` becomes `Lax`: the cookie is no longer sent on cross-site requests, except for top-level navigations using a safe HTTP method such as GET.

If your application reads the session cookie from JavaScript, or receives POST forms from another domain (a payment return, for example), check this before deploying. Custom session handlers that accepted any ID supplied by the client will have to implement `validateId()` and `create_sid()`, or explicitly disable strict mode.

### Arguments in error messages

A new [`error_include_args`](https://wiki.php.net/rfc/display_error_function_args) directive adds the arguments passed to native functions to their error messages. It is disabled by default, but it's worth it in development:

```
Warning: unlink(): No such file or directory in /app/script.php on line 2
```

becomes, with `error_include_args=1`:

```
Warning: unlink('/tmp/does-not-e...'): No such file or directory in /app/script.php on line 2
```

Strings are truncated according to `zend.exception_string_param_max_len` (15 characters by default), and parameters marked with `#[\SensitiveParameter]` stay hidden.

### Deprecations

The full list is in [the PHP 8.6 deprecations RFC](https://wiki.php.net/rfc/deprecations_php_8_6) and in the UPGRADING file. The ones you are most likely to run into:

- returning a value from `__construct()` or `__destruct()`;
- using `return` in a `finally` block;
- the `is_integer()`, `is_long()`, `is_double()` and `doubleval()` aliases, in favor of `is_int()`, `is_float()` and `floatval()`;
- `spl_object_hash()`, to be replaced by `spl_object_id()`;
- the CSV methods of `SplFileObject` (`fgetcsv()`, `fputcsv()`, `setCsvControl()`, `getCsvControl()`);
- the mbregex extension (the `mb_ereg*` functions), because the Oniguruma library is no longer maintained;
- the third argument of `define()`.

```
Deprecated: Returning a value from a constructor is deprecated in /app/Foo.php on line 2
Deprecated: Returning from a finally block is deprecated in /app/Foo.php on line 3
Deprecated: Function is_integer() is deprecated since 8.6, use is_int() instead in /app/Foo.php on line 4
```

ProTip©: most of these deprecations can be fixed mechanically. Enable `E_DEPRECATED` on your CI right now, and you'll be fine the day they become errors.

Finally, a few more discreet changes: `trim()`, `ltrim()` and `rtrim()` now also strip the form feed character (`\f`) by default, and `preg_grep()` returns `false` on a PCRE error instead of a partial array, like the other `preg_*` functions.

## Wrapping up

Partial Function Application completes the PHP 8.5 pipe operator, `Time\Duration` lays the foundations of a new date API, and additions such as `clamp()` or `SortDirection` will remove quite a lot of utility code from our projects.

Happy upgrading! 🚀
