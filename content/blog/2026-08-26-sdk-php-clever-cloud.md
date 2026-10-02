---
title: A modern PHP SDK for Clever Cloud
date: 2026-08-26T09:00:00.000Z
description: "Clever Cloud ships official SDKs for Go and JavaScript, but none for PHP. So I built one, with live log streaming over Server-Sent Events."
tags:
  - php
  - sdk
  - clevercloud
lang: en
---
## Genesis

As Clever Cloud Ambassador, I deploy most of my side projects on [their PaaS](https://www.clever-cloud.com). The day I wanted to script a few things around my apps (list them, tail their logs, flip an environment variable from a small internal tool), I went looking for a PHP SDK. Clever Cloud maintains an official Go client ([`clevercloud-client-go`](https://github.com/CleverCloud/clevercloud-client-go)), a JavaScript client ([`clever-client.js`](https://github.com/CleverCloud/clever-client.js)), and the excellent [`clever-tools`](https://github.com/CleverCloud/clever-tools) CLI. Nothing idiomatic for PHP, though.

So I crafted one and open-sourced it: [`welcomattic/clevercloud-php-sdk`](https://github.com/welcoMattic/clevercloud-php-sdk). It is a community project, not an official Clever Cloud release, but it already covers most of the v2 and v4 REST surface plus the api-bridge gateway used for API tokens. The [coverage matrix](https://github.com/welcoMattic/clevercloud-php-sdk#coverage-matrix) in the README lists exactly what is in and what is not. Here is what makes it worth a look.

## Three lines to a first call

Mint a token from the [Console](https://console.clever-cloud.com/) (section "Personal API tokens"), and you are talking to the API:

```php
use CleverCloud\Sdk\Auth\Credentials;
use CleverCloud\Sdk\ClientBuilder;

$client = (new ClientBuilder())
    ->withCredentials(Credentials::apiToken($_SERVER['CC_API_TOKEN']))
    ->build();

$me = $client->self->get();
echo $me->email, "\n";
```

API tokens are the recommended path. OAuth 1.0a is also supported, three-legged flow included, for consumers that still need it.

## One HTTP client, on purpose

If you read my previous article on the SensioLabs blog about [bringing your own HTTP client](https://sensiolabs.com/blog/2025/bring-your-own-http-client), you might expect this SDK to be transport-agnostic. It is not, and that was a deliberate call.

To be precise: the SDK still speaks PSR-18 and PSR-7 internally. Regular calls go through Symfony's `Psr18Client`, and the request and response hooks are typed against PSR-7 messages. What you cannot swap is the transport underneath, because live log streaming (more on that below) needs Symfony's `EventSourceHttpClient`. The injection point is `HttpClientInterface`, not an arbitrary PSR-18 client.

SSE is not covered by any PSR, and that is the whole problem. Guzzle can read an SSE body with `stream => true`, so raw plumbing is not the blocker: what you do not get is frame parsing, reconnection and `Last-Event-ID` resume, which `EventSourceHttpClient` handles for free. I could have kept PSR-18 for the 95% of calls that are plain request and response, and required Symfony only for `logs->stream()`. That buys you two configuration paths, two retry stories and two testing stories in the same SDK. I took the other trade-off: one coherent API, at the cost of a second HTTP client in your `vendor/` if your application is on Guzzle.

You keep the part that actually matters for testing, though: `MockHttpClient` is a Symfony HttpClient, so you swap it in and drive every response without touching the network:

```php
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

$mock = new MockHttpClient([
    new MockResponse(
        json_encode(['id' => 'app_42', 'name' => 'hello'], JSON_THROW_ON_ERROR),
        ['response_headers' => ['content-type' => 'application/json']],
    ),
]);

$client = (new ClientBuilder())
    ->withCredentials(Credentials::apiToken('test'))
    ->withHttpClient($mock)
    ->build();

$app = $client->applications->get('app_42');

self::assertSame('hello', $app->name); // inside your PHPUnit test case
```

No mocking library, no HTTP recorder, no network in your test suite.

## The fun part: live log streaming

This is the feature I enjoyed building the most. Clever Cloud exposes application logs as Server-Sent Events, and the SDK streams them for you using Symfony's `EventSourceHttpClient` under the hood. You get a plain iterable of typed log entries:

```php
foreach ($client->logs->stream($appId, $orgId) as $entry) {
    echo $entry->message, "\n";
}
```

That is a live `tail -f` on your production logs, in PHP, in a `foreach`. Pass `null` as the organisation id and the SDK resolves your personal one for you, at the cost of one extra `/v2/self` call. Need to filter? Pass a filter string:

```php
foreach ($client->logs->stream($appId, $orgId, ['filter' => 'level:error']) as $entry) {
    echo $entry->message, "\n";
}
```

Need history instead of a live feed? `$client->logs->query(...)` consumes the same stream and hands you a list. Give it a `since` filter, otherwise you only get what happens from now on, and it takes a maximum duration so a quiet application cannot leave you hanging.

## Going further

I kept this one short on purpose. The rest lives in the [documentation](https://welcomattic.github.io/clevercloud-php-sdk/):

- **Retries are on by default**: three attempts, exponential backoff with jitter, capped at five seconds, on 429 and 5xx responses. `RetryPolicy::none()` if you want none of it.
- **Observability**: `onRequest` / `onResponse` hooks on the builder for tracing and metrics, plus a PSR-3 logger with structured context (`attempt`, `method`, `uri`, `status`, `requestId`).
- **Configuration**: user agent, timeouts and the three base URLs, all on a single `Configuration` object.

The SDK also fits nicely in PHP task runners. With [Castor](https://castor.jolicode.com), add it to your Castor project's Composer dependencies (see [remote imports](https://castor.jolicode.com/docs/going-further/extending-castor/remote-imports/), which is how Castor pulls Composer packages into `.castor/vendor/`):

```bash
castor composer require welcomattic/clevercloud-php-sdk
```

Then write the task you actually wanted:

```php
use Castor\Attribute\AsTask;
use CleverCloud\Sdk\Auth\Credentials;
use CleverCloud\Sdk\ClientBuilder;

use function Castor\io;

#[AsTask(description: 'Restart an application')]
function restart(string $appId): void
{
    $client = (new ClientBuilder())
        ->withCredentials(Credentials::apiToken($_SERVER['CC_API_TOKEN']))
        ->build();

    $client->applications->restart($appId);

    io()->success("Restarted {$appId}");
}
```

```console
$ castor restart app_42
```

## Give it a spin

```bash
composer require welcomattic/clevercloud-php-sdk
```

That gets you [2.0](https://github.com/welcoMattic/clevercloud-php-sdk/releases/tag/v2.0.0), the current release. The major bump comes from a pass where I exercised every call against the live API: a handful of my paths, payload shapes and field names did not line up with what the platform returns, and correcting them meant removing public symbols. What you install today matches what Clever Cloud actually serves, and the breaking changes are listed in the release notes.

If you run PHP on Clever Cloud, or just want to automate it from a PHP script, I would love your feedback. Issues, pull requests, and "it would be great if it also did X" are all welcome on [GitHub](https://github.com/welcoMattic/clevercloud-php-sdk).