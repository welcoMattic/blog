---
title: "[SymfonyCon Disneyland Paris 2022] - Painless authentication with Access Tokens"
date: 2022-11-17T10:50:00.000Z
description: Presentation made during SymfonyCon Disneyland Paris 2022
tags:
  - symfony
  - talk
  - authentication
  - access token
  - security
---

[💬 Slides](https://speakerdeck.com/welcomattic/painless-authentication-with-access-tokens)

Via some simple but real scenarios, we will discover the power of the new AccessToken Authenticator shipped in Symfony 6.2. For example, we are developing a SaaS product, which exposes a private API. Our users can register many applications into their accounts, for each one we will generate an API Token that users must inject in their requests. Now, with a pinch of YAML and a dash of PHP, we will be able to authenticate users from their API Token. In this talk, I will show you how it also works with JWT and some other exotic tokens!
