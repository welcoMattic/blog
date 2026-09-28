---
title: "[JoliCode] Fine tune an OpenAPI specification for mocking"
date: 2023-01-06T09:00:00.000Z
description: "More and more often, in the projects I work on, I need to mock APIs. When I’m lucky enough, the API provides an OpenAPI specification, but sometimes it can be heavy. I almost never need to locally mock the whole"
tags:
  - cross-post
  - jolicode
  - api
  - mock
  - openapi
  - prism
lang: en
noindex: true
origin:
  url: https://jolicode.com/blog/fine-tune-an-openapi-specification-for-mocking
  site: JoliCode
---

⌛ This article is now 3 years and 6 months old, a quite long time during which techniques and tools might have evolved. Please [contact us](https://jolicode.com/contact) to get a fresh insight of our expertise!

More and more often, in the projects I work on, I need to mock APIs. When I’m lucky enough, the API provides an OpenAPI specification, but sometimes it can be heavy.

I almost never need to locally mock the whole API, only a few endpoints. Mocking the whole API, with [Prism](https://meta.stoplight.io/docs/prism/f51bcc80a02db-installation) for example, could lead to issues like route priority, or performance. The question is: **how can I filter the specification to only get the needed endpoints?**

Furthermore, for those endpoints, I often need to set response examples (for integration testing). So the second question is : **How can I inject response examples for specific endpoints?**

All of this without manual editing of course.

## Endpoints filtering

The first step is to reduce the size of the specification by filtering on needed endpoints only. To achieve this step, I use the [openapi-format](https://github.com/thim81/openapi-format) CLI tool.

With a short configuration file, I can create a copy of the [OpenAPI PetStore specification](https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml) containing the few endpoints I need (and their dependencies, such as components, tags, etc).

```json
{
    "inverseOperationIds": [
        "getPetById",
        "placeOrder"
    ],
    "unusedComponents": [
        "schemas"
    ]
}
```

This file allows me to have a copy of the OpenAPI specification with only `getPetById` and `placeOrder` operations (I have to filter by `operationId` here, not by `path`, because `openapi-format` does not provide `path` filter). In addition, `openapi-format` will remove all unnecessary schema components, to make the output even lighter.

Let’s see the result of this first step (truncated, to avoid you to deep scroll):

```yaml
{
  "openapi": "3.0.3",
  "info": {...},
  "paths": {
    "/pet/{petId}": {
      "get": {
        "operationId": "getPetById",
        "summary": "Find pet by ID",
        "description": "Returns a single pet",
        "parameters": [...],
        "responses": {...},
        "security": [...],
        "tags": ["pet"]
      }
    },
    "/store/order": {
      "post": {
        "operationId": "placeOrder",
        "summary": "Place an order for a pet",
        "description": "Place a new order in the store",
        "requestBody": {...},
        "responses": {...},
        "tags": ["store"]
      }
    }
  },
  "components": {
    "schemas": {
      "Order": {...},
      "Category": {...},
      "User": {...},
      "Tag": {...},
      "Pet": {...}
    },
    "requestBodies": {...},
    "securitySchemes": {...}
  },
  "tags": [...]
}
```

## Endpoints enriching

Now that I have a light version of the OpenAPI specification, let’s see how I can inject response examples!

After some lost hours spent on looking for the right tool for this step, I resigned myself and wrote mine. Sometimes the best open-source tool is the one you write 😅

This is how [OpenAPI enricher](https://github.com/welcoMattic/openapi-enricher) was released!

This time, no configuration file needed, just the OpenAPI specification and a standalone JSON file containing response examples.

Here, a sample of the examples file I used to inject responses example for the `getPetById` operation:

```json
{
  "paths": {
    "/pet/{petId}": {
      "get": {
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "examples": {
                  "doggie": {
                    "value": {
                      "id": 0,
                      "category": {
                        "id": 0,
                        "name": "string"
                      },
                      "name": "doggie",
                      "photoUrls": [
                        "string"
                      ],
                      "tags": [
                        {
                          "id": 0,
                          "name": "string"
                        }
                      ],
                      "status": "available"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

This file is a bit verbose, but it has the advantage of letting you inject any kind of response example (for any content-type, any status code, any HTTP method, …).

Now I can run `openapi-enricher petstore-light.json --examplesFile petstore-examples.json --output final-petstore.json`!

You can find an example of the final generated file [in /test directory of the GitHub repository](https://github.com/welcoMattic/openapi-enricher/blob/main/test/fixtures/enriched.json).

## To infinity and beyond 🚀

In May 2022, I wrote a blog post entitled [Efficiently Mock APIs Locally With Prism](https://jolicode.com/blog/efficiently-mock-apis-locally-with-prism) . Now, you can mix this blog post with the current one to generate the exact OpenAPI file you need to mock super efficiently any API!
