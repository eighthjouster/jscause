# JSCause

Current version: **0.9.4**.  Current version of the website template: **v1**.

(Excerpt from the documentation:)


## What is JSCause?

JSCause is a web framework and engine built on top of NodeJS, which can be used to create simple websites - or complex ones, if you so desire.

JSCause can serve HTML, CSS and JS files for a web browser to render, just like a regular HTTP server such as Apache or nginx.  It can serve other files as well, such as images and documents.

It can also run server-side Javascript code.  Think of ASP Classic and PHP.

JSCause uses the `.jscp` extension (for example: `index.jscp`) to identify programs that must run server-side.

The `jscp` extension stands for "[J]ava[S]cript [C]ompiled [P]age."

In a simple Hello World example, our `index.jscp` file could look like the following:

```
<h3>Hello from JSCause</h3>
<p><js rt.print('Hello, World'); /js></p>
```

When visitors go to the page in a web browser, they will see the following:

---

### Hello from JSCause
Hello, World

---


## Requirements

JSCause requires that [NodeJS](https://nodejs.org) 8.x or above is installed in the server.


## Installing JSCause

JSCause can be installed as stand-alone, with its only dependency being NodeJS:

- Download it directly from [the JSCause.org website](https://jscause.org/download.html).

- Or, go to the [Releases section](https://github.com/eighthjouster/jscause/releases) and download and unzip the file called `jscause_standalone-X.Y.Z.zip` (where X.Y.Z. is whatever the current version is.)
- Once downloaded, unzip it, `cd` to it on a terminal window, and type `node jscause`.


If you prefer to use `npm`, you can install it with `npm install -g jscause`.

- A ready-to use site template can be downloaded from [the JSCause.org website](https://jscause.org/download.html), or from the [Releases section](https://github.com/eighthjouster/jscause/releases) (it's called `jscause_site_template-vN.zip`, where N is whatever the current version number is.)
- Once downloaded, unzip it, `cd` to it on a terminal window, and type `jscause`.


## Ready to learn more?

Please visit [the JSCause.org website](https://jscause.org) for documentation, tutorials and downloads.

Or you can check out the `Documentation.md` file in this repository as well.

Happy coding!
