---
title: "[JoliCode] Efficiently Mock APIs Locally With Prism"
date: 2022-05-30T09:00:00.000Z
description: "It's quite common to have to mock an API locally during the development of an application. Although it wasn’t easy the first few times we had to do it, we have learnt and now it's time to share! So let's dive into"
tags:
  - cross-post
  - jolicode
  - api
  - jane
  - rest
  - mock
  - openapi
lang: en
noindex: true
origin:
  url: https://jolicode.com/blog/efficiently-mock-apis-locally-with-prism
  site: JoliCode
---

It’s quite common to have to mock an API locally during the development of an application. Although it wasn’t easy the first few times we had to do it, we have learnt and now it’s time to share! So let’s dive into the amazing world of API mocking!

## OpenAPI Specification

The [OpenAPI Initiative GitHub](https://github.com/OAI/OpenAPI-Specification/) page says:

> The OpenAPI Specification (OAS) defines a standard, programming language-agnostic interface description for HTTP REST APIs, which allows both humans and computers to discover and understand the capabilities of a service without requiring access to source code, additional documentation, or inspection of network traffic. When properly defined via OpenAPI, a consumer can understand and interact with the remote service with a minimal amount of implementation logic. Similar to what interface descriptions have done for lower-level programming, the OpenAPI Specification removes guesswork in calling a service.

At JoliCode, we are fond of OAS, so much so that we have developed [Jane](https://github.com/janephp/janephp/), a set of PHP libraries designed to generate code for API. Among other features, it can consume an OAS to produce a fully functional PHP Client for the described API.

Well, if an API is well enough described to generate the client, it should be possible to generate a server implementation, right?

## Prism

[Prism](https://stoplight.io/open-source/prism) is a free and open-source project written in TypeScript. It can eat an OpenAPI Specification and serve a complete mock of the described API, with dynamic responses, error cases, even dynamic content responses. The more well written and complete your OAS file is, the more accurate and complete the mock server will be.

Let’s try it!

The Petstore API is a common example used by OpenAPI Initiative, let’s use it:

Read the petstore.yaml openapi specification

```
# petstore.yaml
openapi: 3.1.0
servers:
    - url: http://localhost:4010
paths:
    /pets:
        get:
            summary: List all pets
            operationId: listPets
            tags:
                - pets
            responses:
                '200':
                    description: An array of pets
                    content:
                        application/json:
                            schema:
                                $ref: "#/components/schemas/Pets"
                default:
                    description: unexpected error
                    content:
                        application/json:
                            schema:
                                $ref: "#/components/schemas/Error"
        post:
            summary: Create a pet
            operationId: createPets
            tags:
                - pets
            responses:
                '201':
                    description: Null response
                default:
                    description: unexpected error
                    content:
                        application/json:
                            schema:
                                $ref: "#/components/schemas/Error"
    /pets/{petId}:
        get:
            summary: Info for a specific pet
            operationId: showPetById
            tags:
                - pets
            parameters:
                - name: petId
                  in: path
                  required: true
                  description: The id of the pet to retrieve
                  schema:
                      type: string
            responses:
                '200':
                    description: Expected response to a valid request
                    content:
                        application/json:
                            schema:
                                $ref: "#/components/schemas/Pet"
                default:
                    description: unexpected error
                    content:
                        application/json:
                            schema:
                                $ref: "#/components/schemas/Error"
components:
    schemas:
        Pet:
            type: object
            required:
                - id
                - name
            properties:
                id:
                    type: integer
                    format: int64
                name:
                    type: string
                tag:
                    type: string
        Pets:
            type: array
            items:
                $ref: "#/components/schemas/Pet"
        Error:
            type: object
            required:
                - code
                - message
            properties:
                code:
                    type: integer
                    format: int32
                message:
                    type: string
```

This OAS describes a little API with 3 endpoints:

-   1 GET to list all pets;
-   1 POST to create a new pet;
-   1 GET to retrieve a pet by its ID.

It also describes the schema of objects returned in responses: `Pet`, `Pets` and `Error`.

Now, you can start a Prism server in a Docker container to mock the Petstore API:

```bash
$ docker run --init --rm -v ~/petstore.yaml:/tmp/petstore.yaml -p 4010:4010 stoplight/prism:4 mock -h 0.0.0.0 "/tmp/petstore.yaml"
```

Let’s test it with [httpie](https://httpie.io/)

```bash
$ http GET http://localhost:4010/pets Accept:application/json
HTTP/1.1 200 OK
[
    {
        "id": 9223372036854776000,
        "name": "string",
        "tag": "string"
    }
]
```

### Get control of the response content 😺 🐶

Prism tries to guess possible values for each field in the response, but it’s not very smart. Let’s see how you can improve this, with examples.

Get the `GET /pets` endpoint description. Here you can add a list of examples that Prism can use to generate responses:

```
/pets:
        get:
            summary: List all pets
            operationId: listPets
            tags:
                - pets
            responses:
                '200':
                    description: An array of pets
                    content:
                        application/json:
                            schema:
                                $ref: "#/components/schemas/Pets"
                            examples:
                                cats:
                                    summary: List of cats
                                    value:
                                        - id: 1
                                          name: Fluffy
                                          tag: cat
                                        - id: 2
                                          name: Felix
                                          tag: cat
                                dogs:
                                    summary: List of dogs
                                    value:
                                        - id: 3
                                          name: Rex
                                          tag: dog
                                        - id: 4
                                          name: Snoopy
                                          tag: dog
```

There are two examples, one with a list of two cats, the other with a list of two dogs.

By default, Prism will return the first example, here is the cats one:

```bash
$ http GET http://localhost:4010/pets Accept: application/json
HTTP/1.1 200 OK
[
    {
        "id": 1,
        "name": "Fluffy",
        "tag": "cat"
    },
    {
        "id": 2,
        "name": "Felix",
        "tag": "cat"
    }
]
```

But, you can force Prism to return a specific example, by using the `Prefer` header:

```bash
$ http GET http://localhost:4010/pets Accept:application/json Prefer:example=dogs
HTTP/1.1 200 OK
[
    {
        "id": 3,
        "name": "Rex",
        "tag": "dog"
    },
    {
        "id": 4,
        "name": "Snoopy",
        "tag": "dog"
    }
]
```

Writing examples for all your endpoints could be boring to do, and quite tough if your API exposes complex data structures. Once again, Prism can help you with the magic `Prefer: dynamic=true` header:

### Randomising the response content 🎲

```bash
$ http GET http://localhost:4010/pets Accept:application/json Prefer:dynamic=true
HTTP/1.1 200 OK
[
    {
        "id": 254730108841844740,
        "name": "culpa ",
        "tag": "voluptate"
    },
    {
        "id": 3800864714174849000,
        "name": "nulla",
        "tag": "aliqua laborum"
    },
    {
        "id": 5571987800389345000,
        "name": "nisi aliquip",
        "tag": "laborum"
    },
    {
        "id": 4021086226085548000,
        "name": "eu exercitation Ut",
        "tag": "id"
    }
]
```

Each time you call this endpoint with the `Prefer: dynamic=true` header, Prism will generate a new set of fake data to build the response. If this behavior suits your needs for all your API endpoints, you can enable it by default with `-d` option:

```bash
$ docker run --init --rm -v ~/petstore.yaml:/tmp/petstore.yaml -p 4010:4010 stoplight/prism:4 mock -h 0.0.0.0 -d "/tmp/petstore.yaml"
```

### Force error as response ❌

Examples can also live under the components key:

```yaml
components:
    schemas:
        # Pet ...
        # Pets ...
        Error:
            type: object
            required:
                - code
                - message
            properties:
                code:
                    type: integer
                    format: int32
                    example: 404
                message:
                    type: string
                    example: Pet not found
```

Still using the `Prefer` header, you can force Prism to respond you an error:

```bash
$ http GET http://localhost:4010/pets Accept:application/json Prefer:code=404
HTTP/1.1 404 Not Found
{
    "code": 404,
    "message": "Pet not found"
}
```

## Going further 🚀

Beyond these features, Prism can also help you with more complex scenarios like payments or notifications with callbacks, [the documentation](https://meta.stoplight.io/docs/prism/ZG9jOjk4-mocking-callbacks-with-prism) is quite clear about this.

You have now a preview of how Prism can help you during the development process of applications that consume external APIs. It can be very useful to develop your API and their clients in parallel, after having designed the OpenAPI Specification. Many more features are handled by Prism, take a look, you will certainly find something to fit your needs!

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/efficiently-mock-apis-locally-with-prism', max\_shown\_comments: 20, theme: 'light', page\_title: "Efficiently Mock APIs Locally With Prism", locale: 'en', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Nos articles sur le même sujet

### [Fine tune an OpenAPI specification for mocking](https://jolicode.com/blog/fine-tune-an-openapi-specification-for-mocking)

More and more often, in the projects I work on, I need to mock APIs. When I’m lucky enough, the API provides an OpenAPI specification, but sometimes it can be heavy. I almost never need to locally mock the whole…

06/01/2023

par Mathieu Santostefano

## Ces clients ont profité de notre expertise
