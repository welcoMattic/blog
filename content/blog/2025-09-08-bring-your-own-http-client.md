---
title: "[SensioLabs] Bring Your Own HTTP client"
date: 2025-09-08T09:00:00.000Z
description: "Break free from rigid dependencies in your PHP SDKs. Learn how to use PSR-7, PSR-17, and PSR-18 standards along with php-http/discovery to allow users to bring their favorite HTTP client, whether i..."
tags:
  - cross-post
  - sensiolabs
lang: en
noindex: true
origin:
  url: https://sensiolabs.com/blog/2025/bring-your-own-http-client
  site: SensioLabs
---
This article is about practical techniques for SDK developers to allow users to bring their own HTTP client instead of forcing utilization of one they did not choose. It is also aimed at users who would like to use their favorite HTTP client within an SDK that already supports it.

You probably know the jungle of HTTP Clients that exist in the PHP ecosystem: Guzzle, Symfony HttpClient, Buzz, CakePHP, HTTP, and so on. As an SDK maintainer, it’s kind of a nightmare to provide support for all those packages. Fortunately, there are abstraction layers and techniques to help us embrace the large majority of them. Let’s explore how to achieve this!

## Genesis

A few months ago, I attended AFUP Day 2025, a one-day French conference, and especially to a talk from my friend Nicolas Grekas about HTTP Client in PHP. The talk was not exactly the way I was thinking of. It placed the audience in the shoes of a SDK developer, facing the dilemma of providing an HTTP client in your source code dependencies:

-   Which HTTP client?
    
-   What if an SDK user already has an HTTP client installed in their dependencies?
    
-   How can an SDK user utilize their own HTTP client instead of the one I provide?
    

Most of these questions have been answered by Nicolas, in an elegant way. Let’s dive into this fascinating topic!

Here is a record of this talk during API Platform Con 2024: [API Platform Conference 2024 - Nicolas Grekas - Consuming HTTP APIs in PHP the Right Way!](https://www.youtube.com/watch?v=ckkr7e_rGgc)

## Equip yourself with the right tools

First, let me introduce you to some PSRs (PHP Standard Recommendations) and (not so magical) PHP packages capable of helping us on our quest.

### PSR

First, here are some PSRs, if you aren’t familiar with this, see them as popular technical recommendations both for library developers and your own application code. These PSRs cover many topics such as coding style, autoloading, cache, container, clock and what we are interested in today: **HTTP**.

[**\[PSR-7: HTTP Message\]**](https://www.php-fig.org/psr/psr-7/)

This one describes interfaces for **Request** and **Response** (and some “sub-types” such as Stream, UploadedFile, etc), and it’s used by PSR-18 as argument type and return type for the `sendRequest` method.

[**\[PSR-18: HTTP Client\]**](https://www.php-fig.org/psr/psr-18/)

This PSR can be resumed as:

> A common interface for sending PSR-7 requests and returning PSR-7 responses.

It provides a **ClientInterface** and 3 Exception interfaces to represent different kinds of failures.

[**\[PSR-17: HTTP Factories\]**](https://www.php-fig.org/psr/psr-17/)

This PSR provides **factories for all** **HTTP message interfaces** described in PSR-7. We will see below how to take advantage of these factories.

### PHP Packages

**psr/http-client**

This package contains the code related to PSR-18 (ClientInterface and 3 exception interfaces). This is exactly what we need to type our code and avoid relying on a concrete implementation.

**php-http/discovery**

This one is both a code library and a Composer plugin (since v1.17). It’s responsible for auto-discovery and auto-installation of packages providing concrete implementations of PSR-17 and PSR-18 interfaces.

It works alongside the next 2 packages.

**psr/http-client-implementation & psr/http-factory-implementation**

These 2 packages are a little bit special, as they are **virtual packages**. They only exist in packagist registry, and are used by “real” packages to indicate that they provide compliant implementations for PSR-17 and/or PSR-18 interfaces.

**A quick note about the concept of virtual packages**: see it like PHP interfaces but at the package level. Here, **psr/http-client-implementation** virtual package as requirement in a SDK composer.json indicates that the SDK needs any package providing a concrete implementation of PSR-18.

As **psr/http-client** directly depends on **psr/http-message**, we don’t need to depend on it to refer to message interfaces such as `RequestInterface`, `ResponseInterface`, etc.

One last useful thing to know is the `provide` property of Composer schema. Here is a concrete usage of this property:

-   For **symfony/http-client** maintainers, this property can be added into composer.json file to indicate to other developers that the symfony/http-client package provides a concrete PSR-18 implementation.
    

```json
"provide": {
    "psr/http-client-implementation": "1.0",
},
```

-   For an SDK developer, you can require this virtual package **psr/http-client-implementation** alongside **php-http/discovery**\` which, as a plugin, will take care of understanding that the SDK requires a PSR-18 implementation. It will then look for one (reading the `provide` property of each dependency) in the composer.json of the application in which it is installed.
    
-   A picture is worth a thousand words, here is a picture:
    

![Scheme showing how HTTP client works with PSRs](/img/sensiolabs/bring-your-own-http-client/3208x1013-httpclient-scheme.png)Thanks to **php-http/http-discovery** required by **foo/sdk**, the developers of both applications can only require their favorite HTTP client and **foo/sdk**. The discovery feature will seek to any package required by the composer.json of the application that provides **psr/http-client-implementation.**To simplify the explanation here, I deliberately omit the **psr/http-factory-implementation** virtual package, but the principle is the same.

## Prepare your code

### SDK code example

```php
<?php

use Http\Discovery\Psr17Factory;
use Http\Discovery\Psr18ClientDiscovery;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Psr\Http\Message\StreamInterface;

namespace Foo\SDK;

final readonly class Api
{
    private const string BASE_URI = 'https://example.com';

    public function __construct(
        private ?ClientInterface $client = null,
        private ?RequestFactoryInterface $requestFactory = null,
        private ?StreamFactoryInterface $streamFactory = null,
    ) {
        $this->client = $client ?: Psr18ClientDiscovery::find();

        $this->factory = new Psr17Factory(
            requestFactory: $requestFactory,
            streamFactory: $streamFactory,
        );
    }

    public function callApi(array $data): ResponseInterface
    {
        $body = $this->factory->createStream(json_encode($data));

        $request = $this->factory->createRequest('POST', self::BASE_URI . '/api/bar')
            ->withHeader('Content-Type', 'application/json')
            ->withBody($body)
        ;

        return $this->client->sendRequest($request);
    }

}
```

Here is a basic example of a Foo class provided by an SDK, taking advantage of PSR-18 and PSR-17 interfaces in its own code. Giving the freedom to SDK users to bring their own HTTP client: 

-   automatically, thanks to `Psr18ClientDiscovery::find()`
    
-   manually by passing a `$client` argument to the constructor
    

Note here that the `Psr17Factory` internally calls the `Psr17FactoryDiscovery` methods to find out existing concrete implementations of Factories needed if null is passed to the constructor.

### User code example

```php
<?php

namespace App;

use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\HttpClient\Psr18Client;

final readonly class FooRelatedService
{
    public function callBar(array $data): void
    {
        // Inside Foo/SDK/Api, Psr18ClientDiscovery will seek for a concrete implementation of PSR-18
        $fooApi = new Foo\SDK\Api();
        $response = $foo->callApi($data);

        // your logic
    }

    public function callBarWithMyOwnHttpClient(array $data): void
    {
        // Standalone instanciation, but dependency injection could be used here.
        $myOwnHttpClient = new Psr18Client(HttpClient::create());

        $fooApi = new Foo\SDK\Api(client: $myOwnHttpClient);
        $response = $foo->callApi($data);

        // your logic
    }

    public function callBarWithMyOwnHttpClientAndFactories(array $data): void
    {
        // Psr18Client implements ClientInterface, RequestFactoryInterface, StreamFactoryInterface and others
        $myOwnHttpClientAndFactories = new Psr18Client(HttpClient::create());

        $fooApi = new Foo\SDK\Api(
            client: $myOwnHttpClientAndFactories,
            requestFactory: $myOwnHttpClientAndFactories
            streamFactory: $myOwnHttpClientAndFactories
        );
        $response = $foo->callApi($data);

        // your logic
    }
}
```

Also a basic example of SDK user code, where they let the SDK find the proper HTTP client (method `callBar`) or they pass manually a client (method `callBarWithMyOwnHttpClient`), even passing the client and the Factories (method `callBarWithMyOwnHttpClientAndFactories`). Of course, before passing those objects you can configure them for your needs (base uri, headers, etc.).

As long as the SDK relies on interfaces, the SDK user is totally free to create their own interface implementations and pass them to the SDK `Api` object.

## Going further

Of course, we've only skimmed the surface of the topic here. A lot more questions could come during the development of an SDK, especially if there comes a moment when you need to rely on a specific feature of a HTTP client, not covered by PSR-18. 

You also can ask yourself what happens if a SDK user doesn’t have a compatible HTTP client in their application dependencies? Should you provide one by default? Which one? How to provide it? How to test your code as an SDK maintainer? 

If you liked this article and you want to go deeper on the topic, let us know! Maybe a second part will come to complete this first chapter!

## Resources

-   [https://getcomposer.org/doc/04-schema.md#provide](https://getcomposer.org/doc/04-schema.md#provide)
    
-   [https://github.com/php-http/discovery](https://github.com/php-http/discovery)
    
-   [https://packagist.org/providers/psr/http-client-implementation](https://packagist.org/providers/psr/http-client-implementation)
    
-   [https://www.php-fig.org/psr/](https://www.php-fig.org/psr/)
    
-   [https://github.com/symfony/http-client/blob/7.3/composer.json#L18](https://github.com/symfony/http-client/blob/7.3/composer.json#L18)
    
-   [https://github.com/guzzle/guzzle/blob/7.9/composer.json#L90](https://github.com/guzzle/guzzle/blob/7.9/composer.json#L90)
