# Welcome to Hiling

Hiling is a simple cli tool for automating api requests on the go!

## Get Started

`npm i hiling`

## Commands

Here is the list of the commands available.

### Start

Example `hiling start https://google.com`

This creates a get request to google.com

#### Arguments

**URL** - the url to make an HTTP request.

#### Flags

**Timeout** - the timeout in ms per every request sent. Default is `250ms`

**Method** - the HTTP method to request. Default is `GET`

**Max Fails** - the amount of failed request before aborting. Default is `999999`

## Schema

`url` - Only valid HTTP url strings are allowed.

`timeout` - Only positive integers are allowed.
`method` - Only valid HTTP url strings are allowed. `GET POST PUT DELETE PATCH`.
`maxFails` - Only positive integers are allowed.
