## Table of Contents

-  [What is new in JSCause?](#what-is-new-in-jscause)
-  [What is JSCause?](#what-is-jscause)
-  [Installation](#installation)
    - [Installing standalone JSCause](#installing-standalone-jscause)
    - [Installing JSCause via npm](#installing-jscause-via-npm)
-  [Structure of a JSCause site](#structure-of-a-jscause-site)
    - [The interesting stuff](#the-interesting-stuff)
    - [The important to know stuff](#the-important-to-know-stuff)
    - [The boilerplate stuff](#the-boilerplate-stuff)
-  [jscause.conf: Configuring JSCause to serve your website](#jscauseconf-configuring-jscause-to-serve-your-website)
    - [sites](#sites)
    - [logging](#logging)
    - [requestTimeoutSecs](#requesttimeoutsecs)
    - [allowExeExtensionsInOpr](#allowexeextensionsinopr)
-  [Example jscause.conf configuration](#example-jscauseconf-configuration)
-  [site.json: Configuring your website's details](#sitejson-configuring-your-websites-details)
-  [Example site.json configuration](#example-sitejson-configuration)
-  [Starting up JSCause](#starting-up-jscause)
-  [Stopping JSCause](#stopping-jscause)
-  [The website/ directory: All your website's content](#the-website-directory-all-your-websites-content)
    - [JSCP files](#jscp-files)
    - [JSCM files](#jscm-files)
    - [Index files](#index-files)
-  [Custom 4xx and 5xx errors](#custom-4xx-and-5xx-errors)
    - [All the routing rules](#all-the-routing-rules)
-  [The runtime framework](#the-runtime-framework)
    - [JSCP with Javascript only](#jscp-with-javascript-only)
    - [JSCP with HTML only](#jscp-with-html-only)
    - [JSCP with both HTML and Javascript](#jscp-with-both-html-and-javascript)
    - [The rt.print shortcut: <js= /js>](#the-rtprint-shortcut-js-js)
    - [The rt runtime object](#the-rt-runtime-object)
    - [JSCause modules: JSCM files](#jscause-modules-jscm-files)
    - [rt in modules](#rt-in-modules)
-  [Redirection](#redirection)
-  [Callbacks](#callbacks)
-  [RT Promises](#rt-promises)
-  [Logging features](#logging-features)
    - [Types of data logged](#types-of-data-logged)
    - [Per site logging](#per-site-logging)
    - [Log file compression](#log-file-compression)
-  [HTTPS/SSL configuration](#httpsssl-configuration)
-  [jscvendor: JSCause vendor directory](#jscvendor-jscause-vendor-directory)
-  [Symbolic links in configuration and websites](#symbolic-links-in-configuration-and-websites)
    - [Where symlinks can be used](#where-symlinks-can-be-used)
      - [jscause.conf: rootDirectoryName](#jscauseconf-rootdirectoryname)
      - [Site contents files and directories](#site-contents-files-and-directories)
      - [site.json: tempWorkDirectory](#sitejson-tempworkdirectory)
      - [Logging](#logging-directory)
-  [The rt runtime object reference](#the-rt-runtime-object-reference)
    - [rt.additional](#rtadditional)
    - [rt.contentType](#rtcontenttype)
    - [rt.copyFile()](#rtcopyfile)
    - [rt.deleteCookie()](#rtdeletecookie)
    - [rt.deleteFile()](#rtdeletefile)
    - [rt.fileExists()](#rtfileexists)
    - [rt.getCookie()](#rtgetcookie)
    - [rt.getCurrentPath()](#rtgetcurrentpath)
    - [rt.getParams](#rtgetparams)
    - [rt.header()](#rtheader)
    - [rt.module()](#rtmodule)
    - [rt.moveFile()](#rtmovefile)
    - [rt.postParams](#rtpostparams)
    - [rt.print()](#rtprint)
    - [rt.printJSON()](#rtprintjson)
    - [rt.readFile()](#rtreadfile)
    - [rt.redirectTo()](#rtredirectto)
    - [rt.requestMethod](#rtrequestmethod)
    - [rt.resetRedirectTo()](#rtresetredirectto)
    - [rt.runAfter()](#rtrunafter)
    - [rt.setCookie()](#rtsetcookie)
    - [rt.unsafePrint()](#rtunsafeprint)
    - [rt.uploadedFiles](#rtuploadedfiles)
    - [rt.waitFor()](#rtwaitfor)
-  [FAQ and Troubleshooting JSCause](#faq-and-troubleshooting-jscause)
    - [Why doesn't JSCause complain when a certificate or key file is invalid?](#why-doesnt-jscause-complain-when-a-certificate-or-key-file-is-invalid)
    - [`site.json` accepts a hostName that could already be used in another site's json.  Is this a bug?](#sitejson-accepts-a-hostname-that-could-already-be-used-in-another-sites-sitejson--is-this-a-bug)
    - [JSCause says a file does not exist, but I can see it in the file system.  Why?](#jscause-says-a-file-does-not-exist-but-i-can-see-it-in-the-file-system--why)
    - [My question is not answered here.](#my-question-is-not-answered-here)
-  [List of common errors and warnings reported by JSCause](#list-of-common-errors-and-warnings-reported-by-jscause)
    - [Configuration](#configuration)
    - [Related to sites, content and run-time](#related-to-sites-content-and-run-time)
    - [HTTP errors](#http-errors)
    - [Non-logged errors and warnings (terminal only)](#non-logged-errors-and-warnings-terminal-only)
    - [Critical errors](#critical-errors)
-  [Testing JSCause's integrity](#testing-jscauses-integrity)
-  [More resources](#more-resources)
-  [Credits](#credits)
-  [License](#license)


## What is new in JSCause?

Please refer to the project's CHANGELOG.md file for project updates.  Check out the ROADMAP.md file to learn more about planned future features and additions.

You can also check the ROADMAP.md file to learn more about planned future features and additions.


## What is JSCause?

JSCause is a web framework and engine built on top of NodeJS which can be used to create simple websites.  Or complex ones, if you so desire.

JSCause can serve HTML, CSS and JS files for a browser to render, just like a regular HTTP server such as Apache or nginx.  It can also preprocess files on the server side, much like how ASP Classic and PHP do.

For example, in ASP Classic, you can have an `index.asp` file which, among other things, could contain the following:

```
<h1>Hello from ASP</h1>
<p><% Response.Write("Hello, World") %></p>
```

In PHP, that would be an `index.php` file:

```
<h1>Hello from PHP</h1>
<p><?php echo 'Hello, World'; ?></p>
```

In JSCause, it would be `index.jscp`:

```
<h1>Hello from JSCause</h1>
<p><js rt.print('Hello, World'); /js></p>
```

The `jscp` extension stands for "[J]ava[S]cript [C]ompiled [P]age."


## Installation

JSCause requires [NodeJS](https://nodejs.org).  Please make sure you have it installed in your system.  Any version equal or above 12.x should be fine.

There are two types of installation: standalone JSCause, and installation via npm.

### Installing standalone JSCause

Download the [standalone JSCause zip](https://github.com/eighthjouster/jscause/releases/download/v0.9.4-alpha/jscause_standalone-0.9.4.zip) file and uncompress it anywhere in your system.

### Installing JSCause via npm

Open a terminal window and run the following command:

```
sudo npm install -g jscause
```

If you need a project template for your site, you can use the one [available in the release](https://github.com/eighthjouster/jscause/releases/download/v0.9.4-alpha/jscause_site_template-v1.zip).

**Important note:**  The project template include example SSL certificates, so you can use HTTPS.  These certificates are **not** suitable for production!  If you use these certs, your users will get a security warning in their browsers.  You must provide your own certificates.

**For more advanced users:**  If you ever add JSCause as a package dependency to your project (i.e. `npm install --save jscause`), JSCause will be available from `./node_modules/.bin/jscause`.


## Structure of a JSCause site

A typical JSCause installation will have the following file and directory structure:

```
 ./jscause.js
 ./jscause.conf
 ./jscvendor/
 ./logs/
 ./sites/mysite/
 ./sites/mysite/configuration/site.json
 ./sites/mysite/configuration/certs/
 ./sites/mysite/localLogs/
 ./sites/mysite/website/
 ```

### The interesting stuff

- `sites/mysite`: This subdirectory contains your site's actual content, configuration and logs.  It can be renamed in `jscause.conf` (read below.)

- `sites/mysite/website/`:  This subdirectory will contain your website's files and resources to be served to the browser and other web clients:  All your HTML, CSS and Javascript files go in here.  Other assets go here as well; such as images and files to be downloaded.  Dynamic `.jscp` files also go here.  These will be parsed and executed by JSCause, and the result of said execution will be sent to the web client.  [Read more about this directory here](#the-website-directory-all-your-websites-content).
 
- `sites/mysite/configuration/site.json`: In this file you can configure the details of your website: host name and port, upload limits, logging, etc. [Read more about this file in the site.json section](#sitejson-configuring-your-websites-details).

- `sites/mysite/configuration/certs`: If you site uses a secure connection (HTTPS), you will have to place your certificate files in this location.  More information in [the HTTPS/SSL configuration section](#httpsssl-configuration), as well as in [the site.json section](#sitejson-configuring-your-websites-details).

- `sites/mysite/localLogs/`:  In this subdirectory, JSCause will log access and error entries pertaining to your website.

### The important to know stuff

- `jscause.conf`: This file holds JSCause's general configuration.  You can specify here where your content and log files are, whether to accept secure HTTPS connections, etc.  It may also hold configuration options that apply to, and prevail over, a website's `site.json` configuration.  You can [read more about this file here](#jscauseconf-configuring-jscause-to-serve-your-website).

- `logs/`: This directory contains the server access and error logs.

### The boilerplate stuff

- `jscause.js`: This file contains the actual JSCause node application.  You use it when running node to start serving your website (`node jscause.js`). You won't normally need to edit this file, ever.

- `jscvendor/`:  This directory contains the third-party dependencies that support specific JSCause features, such as HTML form handling and cookies.  You won't normally need to edit the contents of this directory.  "But I thought JSCause didn't have any dependencies!" you may be thinking.  What we mean by that is that JSCause is self-contained.  Once you download and unzip it, it's good to go.  [Read more about the jscvendor directory here](#jscvendor-jscause-vendor-directory).


## jscause.conf: Configuring JSCause to serve your website

When JSCause is invoked, it reads the `jscause.conf` file for configuration options. The options are declared as a _JscJSON_ object.  JscJSON objects differ from regular JSON objects in one area only:  JscJSON objects allow comments (designated by `//`), whereas true JSON ones do not.

The options, in the form of attributes, are case insensitive (i.e. `sites` can be written as `Sites`, `SITES`, `sItEs`, etc.)  They are listed below:

### sites:

This is an array of object declarations, each representing a site to be served by JSCause:

```
"sites": [
  {
    // First site configuration goes here.
  },
  {
    // Second site configuration goes here.
  }
  // etc.
]
```

A site entry can contain the following attributes:

___name___

This is the site's name.

```
"name": "My Site"
```

"_name_" must be unique.  If JSCause ever needs to notify or log some event related to the site, it will refer to it by this name.

___port___

This is the network port JSCause will listen for client connections.

```
"port": 3000
```

More than one site can share the same port, as long as they also have a unique host name (read [the site.json section](#sitejson-configuring-your-websites-details)) and a unique root directory name (read the next section about `rootDirectoryName`.)

___rootDirectoryName___


This is the name of the subdirectory the website files are located at inside the `sites/` directory.

```
"rootDirectoryName": "mysite"
```

The above states that the site is under `sites/mysite`.

More than one site can share the same root directory name, as long as they use different ports.

___enableHTTPS___

This attribute indicates whether the site is served as either HTTPS (`true`) or HTTP (`false`).

```
"enableHTTPS": true
```

If HTTPS is enabled, you must provide JSCause with your certificate file, as well as your certificate's public key file.  Check out these resources: [httpsCertFile and httpsKeyFile section on site.json](#sitejson-configuring-your-websites-details), and the [HTTPS/SSL configuration section](#httpsssl-configuration).

### logging:

This is a list of attributes to indicate what JSCause will log, and how:

```
"logging": {
  "general": {
    // Attributes pertaining application-wide logging.
  },
  "perSite": {
    // Attributes pertaining per-site-wide logging.
  }
}
```

This attribute is optional.  However, if you omit it, some options will be assumed as default.  For example, console output will be enabled, and file output will be enabled server-wide; `./logs` will be assumed as the logging directory as well, so make sure it exists.

To learn more about what type of data JSCause logs, please check out the [Logging Features](#logging-features) section.

___general___

A "_general_" entry can contain the following attributes:

**- fileOutput**

This attribute indicates whether the log data should be written to the file system.

```
"fileOutput": "enabled"
```

There are two valid values:
 * `enabled`:  Create log files and write to them.  You must provide a valid `directoryName` entry (read below.)
 * `disabled`:  No creating log files or writing to them.  In this case, `directoryName` can be optional.

Log files have the following file name format: `jsc_YYYY-MM-DD_HH-00-00.log`.  For example:  `jsc_2020-02-08_22-00-00.log` indicates a log file for Feb 08, 2020, at 10pm.  When the hour changes (in our example, from 10pm to 11pm), a new log file is created (in our case, `jsc_2020-02-08_23-00-00.log`)

**- directoryName**

This is the path of the directory to be used to store JSCause's log data.

```
"directoryName": "./logs"
```

The path can be absolute (e.g. `/home/user_name/server_data/logs`) or relative (e.g. `./logs`).  If relative, it will be relative to the directory where JSCause is installed.

A missing or empty `directoryName` will be assumed `./logs`. Regardless of whether `fileOutput` is true or false, `directoryName` must point to an existing directory.

**- consoleOutput**

This attribute indicates whether the log data should be printed to the terminal.

```
"consoleOutput": "enabled"
```

There are two valid values:
 * `enabled`:  Print to the terminal.
 * `disabled`:  No printing to the terminal whatsoever.

**- logFileSizeThreshold**

This attribute indicates the maximum size in bytes the log file can reach before being compressed and archived away.

```
"logFileSizeThreshold": 131072 // 128 * 1024 = 128 KB
```

When the threshold is reached, JSCause will stop writing to the log file, and compress it.  Then, it will create a new log file, and use it to continue logging.

For example, let's say that the current log file is `jsc_2020-02-08_09-00-00.log`, indicating that it was created on Feb 8, 2020 at 9am.  Let's suppose that the log file has reached the size threshold at 9:14am.  JSCause will compress `jsc_2020-02-08_09-00-00.log` and rename it to `jsc_2020-02-08_09-00-00.log.gz`, and continue logging to a new file named `jsc_2020-02-08_09-00-00--1.log`.  Notice the `--1` suffix.  If new files are needed, the suffix value will increment as well (`--2`, `--3`, etc.), until the time changes (in our example, to 10am).  As you can see, the time in the log files refers to the current hour.  Minutes and seconds are ignored.

You can read more information about how JSCause handles log files and thresholds in the [Log file compression](#log-file-compression) section.


___perSite___

This section pertains to site logging.  "_perSite_" logging captures events related to the website only (for instance, whenever it is accessed, if the site threw an error, or if the user application logs to the console.)  This is different from "_general_", which only logs events related to JSCause as an application (for instance, whether it started successfully, what ports are listening, if all the sites and up and running, etc.)

Administrators can indicate whether individual sites can have their own logging configuration or not (e.g., they can disable logging to terminal for all sites, but leave the decision of logging to file to each individual site.)

A "_perSite_" entry can contain the following attributes:

**- fileOutput**

This attribute indicates whether the site's log data should be written to the file system.

```
"fileOutput": "enabled"
```

There are three valid values:
 * `enabled`:  Create log files and write to them.  You must provide a valid `directoryName` entry in the site's `site.json` configuration file.  [Read more in the site.json section](#sitejson-configuring-your-websites-details).
 * `disabled`:  No creating log files or writing to them.  In this case, `directoryName` can be optional.
 * `perSite`:  Leave it to the sites' `site.json` configuration.

**- consoleOutput**

This attribute indicates whether the site's log data should be printed to the terminal.

```
"consoleOutput": "enabled"
```

There are three valid values:
 * `enabled`:  Print to the terminal.
 * `disabled`:  No printing to the terminal whatsoever.
 * `perSite`:  Leave it to the sites' `site.json` configuration.

### requestTimeoutSecs:

This attribute sets the time in seconds JSCause will wait for a request to be handled.

```
"requestTimeoutSecs": 60
```

The timing starts when the request is created due to a web client contacting JSCause.  It includes the time it takes for the client to finish sending the request (including POST bodies and file uploads), and the time it takes for the website (read, JSCP files) to process the request and send a response.  It also includes the time JSCause takes giving the response for the operating system (OS) to send back to the web client.

So, when JSCause gives the whole response for the operating system to handle, `requestTimeoutSecs` stops applying.  This means that the response could take longer than the time specified in `requestTimeoutSecs`, simply because it's not longer under JSCause's control, but that of the operating system.

If the request exceeds the time specified by `requestTimeoutSecs`, JSCause will respond with an HTTP 408 (request timeout) error.

If `requestTimeoutSecs` is 0, no timeout is set and, therefore, the request can take as long as it needs.

### allowExeExtensionsInOpr:

TO-DO: EXPLAIN HERE.

```
"allowExeExtensionsInOpr": false
```

TO-DO: EXPLAIN HERE MORE.

Here is an example configuration:


## Example jscause.conf configuration

```
{
  "sites": [
    {
      "name": "My Site",
      "port": 3000,
      "rootDirectoryName": "mysite",
      "enableHTTPS": false // If true, provide cert information in site.json
    }
  ],
  "logging": {
    "general": {
      "directoryName": "./logs",
      "fileOutput": "enabled",
      "consoleOutput": "enabled"
    },
    "perSite": {
      "fileOutput": "per site",
      "consoleOutput": "per site"
    }
  },
  "requestTimeoutSecs": 60
}
```


## site.json: Configuring your website's details

Once JSCause completes initialization via the `jscause.conf` file, it will proceed to read the configuration of the website (or websites, if there is more than one.)  JSCause knows how to find this configuration thanks to the `rootDirectoryName` attribute declared for each website in `jscause.conf`.  `rootDirectoryName` indicates where JSCause can find a subdirectory with all the website information.  Such subdirectory will be inside the `sites` directory found in the same directory `jscause.js`, the main JSCause application, is in.  Once in it, it will then proceed to look for a `configuration` subdirectory, then look inside it for a `site.json` file.

So, in the example in the previous section, the website has a `rootDirectoryName` of "mysite".  Therefore, JSCause will look for, and read the `sites/mysite/configuration/site.json` file.

Just like with `jscause.conf`, `site.json` is in reality a _JscJSON_ object (comments are allowed; they start with `//`.)

The options, in the form of attributes, are case insensitive (i.e. `hostName` can be written as `hostname`, `Hostname`, `HOSTNAME`, etc.)  They are listed below:

___hostName:___

This is the site's host name.

```
"hostName": "example.com"
```

The host name must coincide with the web client's request host name for JSCause to serve the contents from this site.  So, if `hostName` is `jscausesite1` but the client requests content from `othersite1`, even if it's the same IP address, JSCause will not respond.

More than one site can share the same host name, as long as they use different ports.

___canUpload:___

This attribute determines whether a site can accept POST requests or file uploads, or not.

```
"canUpload": true
```

The valid values are `true` and `false`.

If `true`, POST requests and uploads are accepted.  If `false`, the server will attempt to respond with an HTTP 403 (forbidden) error.  At the same time as the response attempt, it will certainly and immediately close the connection.

___maxPayloadSizeBytes:___

This attribute determines the size in bytes of the upload payload in a POST request or file upload.

```
"maxPayloadSizeBytes": 1024
```

If a payload size exceeds the amount specified in `maxPayloadSizeBytes`, JSCause will attempt to respond with an HTTP 413 (payload too large) error.  At the same time as the response attempt, it will certainly and immediately close the connection.  If this is not desired, it is advised that an upper limit is set and handled within the application.  Also, the application could warn the visitor beforehand.

If `maxPayloadSizeBytes` is 0, then JSCause assumes no payload size limit (use this with caution.)  If it's less than 0, JSCause will treat is as if `canUpload` is `false`.

___jscpExtensionRequired:___

This attribute determines whether a query string, or route, must include `.jscp` to refer to a JSCP file.

As an example, let's assume we have the `mysite/page_one.jscp` file.  If `jscpExtensionRequired` is set as `always`, then the URL referring to the index file must include `.jscp` in it:  `http://example.com/page_one.jscp`.

```
"jscpExtensionRequired": "optional"
```

There are three valid values:
* `never`:  The URL must _never_ include `.jscp`.  So, in the example above, `http://example.com/page_one.jscp` will throw an HTTP 404 (not found) error.  `http://example.com/page_one` will work.

* `always`:  The URL must _always_ include `.jscp`.  In the example above, `http://example.com/page_one` will throw an HTTP 404 (not found) error.  `http://example.com/page_one.jscp` will work.

* `optional`:  The URL may include `.jscp`, but it's not required to.  In the example above, both `http://example.com/page_one` and `http://example.com/page_one.jscp` will work and refer to the same `page_one.jscp` file.

___httpPoweredByHeader:___

This attribute determines whether JSCause will include the following header entry in a response: `X-Powered-By: jscause`

```
"httpPoweredByHeader": "include"
```

There are two valid values:
* `include`:  Include the `X-Powered-By` header entry in the response.

* `excluse`:  Omit the `X-Powered-By` header entry from the response.

___httpsCertFile:___

This attribute indicates the name of your certificate file, which is required for HTTPS.

```
"httpsCertFile": "your-cert-file.pem"
```

This file must be placed inside the `configuration/certs` subdirectory, which is relative to the site's `rootDirectoryName`.  For example,  if JSCause is installed in `/home/user_name/jscause/`, `rootDirectoryName` is `mysite`, and `httpsCertFile` is `your-cert-file.pem`, then the latter will be intepreted as `/home/user_name/jscause/sites/mysite/configuration/certs/your-cert-file.pem`.

Note: The default installation of JSCause includes an example cert file called `jscause-cert.pem`.  Do *NOT* use this in production!  User's browsers will emit a security warning.

___httpsKeyFile:___

This attribute indicates the name of your certificate's private key file, which is required for HTTPS.

```
"httpsKeyFile": "your-key-file.pem"
```

This file must be placed inside the `configuration/certs` subdirectory, which is relative to the site's `rootDirectoryName`.  For example,  if JSCause is installed in `/home/user_name/jscause/`, `rootDirectoryName` is `mysite`, and `httpsCertFile` is `your-key-file.pem`, then the latter will be intepreted as `/home/user_name/jscause/sites/mysite/configuration/certs/your-key-file.pem`.

Note: The default installation of JSCause includes an example key file called `jscause-key.pem`.  Do *NOT* use this in production!  User's browsers will emit a security warning.

___tempWorkDirectory:___

This attribute indicates the location of a temporary directory JSCause can use for internal operation purposes (e.g. file uploads.)  Avoid reading or manipulating this directory directly in your application.

```
"tempWorkDirectory": "./workbench"
```

Make sure that this directory is writeable by JSCause.

The path MUST be relative (e.g. `./workbench`).  It will be relative to the site's `rootDirectoryName`.

For example:  if JSCause is installed in `/home/user_name/jscause/`, `rootDirectoryName` is `mysite`, and `tempWorkDirectory` is `./workbench`, then the latter will be located at `/home/user_name/jscause/sites/mysite/workbench`.

`rootDirectoryName` must be valid if `canUpload` is `true`.

___mimeTypes:___

This attribute sets a list of MIME types JSCause can associate to certain file/resource extensions.  For example, the `.html` file extension is associated with the `text/html` MIME type, then JSCause reports this to the requesting client (browser or otherwise) when responding to a request.

```
"mimeTypes": {
  "include": {
    // Mime types to accept.
  },
  "exclude": {
    // Mime types to exclude or reject.
  }
}
```

**- include**

This is an object with file extensions as keys, and MIME types as values.  When a client requests a resource with a file extension, JSCause will include in the response the type of file indicated in this list.  For example:

```
  "include": {
    "png": "image/png",
    "some_other_type": "some_other_value"
  }
```

In the example above, when the client requests a PNG resource, JSCause will respond indicating that the resource is of type `image/png`.

If you specify an empty string as a value, it will be assumed `application/octet-stream`, and a warning will be shown in the server console during startup.

There are a few MIME types that JSCause will handle automatically, so they don't need to be added to the `"include"` list.  Those are:

* `css`: `text/css; charset=utf-8`
* `eot`: `application/vnd.ms-fontobject`
* `gif`: `image/gif`
* `html`: `text/html; charset=utf-8`
* `ico`: `image/x-icon`
* `jpg`: `image/jpg`
* `js`: `text/javascript; charset=utf-8`
* `json`: `application/json; charset=utf-8`
* `mp4`: `video/mp4`
* `otf`: `application/font-otf`
* `png`: `image/png`
* `svg`: `application/image/svg+xml; charset=utf-8`
* `ttf`: `application/font-ttf`
* `txt`: `text/plain; charset=utf-8`
* `wav`: `audio/wav`
* `woff`: `application/font-woff`

**- exclude**

Unlike `"include"`, this attribute is an _array_, listing all the file extensions that JSCause must _not_ send a specific MIME type for.

```
"exclude": {
  ["jpg", "docx", "etc"]
}
```

An `application/octet-stream` will be sent instead, which may prompt a web browser to download the resource instead of attempting to display it (this, of course, will depend on the browser.)

If the same mime type is added to both `"include"` and `"exclude"` lists, the lattermost list will prevail (i.e. if `"exclude"` is defined after `"include"`, then the MIME type will be excluded.)

If a MIME type is defined more than once in the `"include"` list, JSCause makes no guarantees as to which value is ultimately used.

___logging:___

Just like in [`site.conf`](#logging), this is a list of attributes to indicate what aspects of the website JSCause will log, and how:

```
"logging": {
  // Attributes pertaining website logging.
}
```

**- fileOutput**

This attribute indicates whether the log data should be written to the file system.

```
"fileOutput": "enabled"
```

There are two valid values:
 * `enabled`:  Create log files and write to them.  You must provide a valid `directoryName` entry (read below.)
 * `disabled`:  No creating log files or writing to them.  In this case, `directoryName` can be optional.

**- directoryName**

This is the path of the directory to be used to store JSCause's website log data.

```
"directoryName": "./localLogs"
```

The path can be absolute (e.g. `/home/user_name/server_data/mysite/localLogs`) or relative (e.g. `./localLogs`).  If relative, it will be relative to the website directory.

If you specify a `directoryName`, then it _must_ exist regardless of whether `fileOutput` is true or false.  However, and unlike its counterpart in `jscause.conf`, if `fileOutput` is false, `directoryName` is optional (and therefore, it can be omitted.)

**- consoleOutput**

This attribute indicates whether the log data should be printed to the terminal.

```
"consoleOutput": "enabled"
```

There are two valid values:
 * `enabled`:  Print to the terminal.
 * `disabled`:  No printing to the terminal whatsoever.

To learn more about what type of data JSCause logs for websites, please check out the [logging section](#logging).


## Example site.json configuration

```
{
  "hostName": "example.com",
  "canUpload": true,
  "maxPayloadSizeBytes": 0,
  "jscpExtensionRequired": "optional",
  "httpPoweredByHeader": "include",
  "httpsCertFile": "jscause-cert.pem", // Use your own cert file.
  "httpsKeyFile": "jscause-key.pem", // Use your own key file.
  "tempWorkDirectory": "./workbench",
  "mimeTypes": {
    "include": {
        "abw": "application/x-abiword",
        "mid": "audio/midi"
    },
    "exclude": [
        "odp",
        "zip"
    ]
  },
  "logging": {
    "directoryName": "./localLogs",
    "consoleOutput": "enabled",
    "fileOutput": "enabled"
  }
}
```


## Starting up JSCause

Once you have configured JSCause and your website, you can run it by changing to the JSCause directory and issuing the following command:

```
node jscause
```

Or if you installed JSCause via npm:

```
jscause
```

JSCause will print out the following (may differ depending on your configuration):

```
*** JSCause Server version [VERSION NUMBER HERE]
INFO: Reading configuration for site 'My Site' from 'sites/mysite'
INFO: Site 'My Site' at https://example.com:80/ assigned to server 0
INFO: ************ All sites' configuration read at this point ********************
INFO: The following sites were set up successfully:
INFO: 'My Site'
INFO: Will start listening.
INFO: Server 0 listening on port 80
```

If the last line is about a server listening on a port, then everything was configured correctly.  Having said that, do check for warning messages (for example: `WARNING: Site configuration: Site 'My Site' has file logging enabled while the server has per-site file logging disabled.`)

If you get a warning or an error, refer to the [troubleshooting section](#faq-and-troubleshooting-jscause) to find out how to address it.


## Stopping JSCause

You can stop JSCause simply by issuing Control+C in the terminal:

```
^C
Received interrupt signal.  Cleaning up before exiting...
Terminated.
```

Or you can send the SIGTERM signal to the JSCause process via the `kill` command:

```
$ killall node jscause
Received interrupt signal.  Cleaning up before exiting...
Terminated.

[1]+  Done                    node jscause
```

When JSCause is instructed to terminate, it will close the log files. If there are any log files being compressed at that very moment, it will wait until the operation completes.  Any pending log files compression will be ignored after that (but resumed once JSCause is started again.)

If JSCause receives a second Control+C keyboard combination during termination and cleanup, it will display the following message:

```
Still cleaning on exit.  Try again to exit right away...
```

At that point, if you press Control+C again (a third time), JSCause will terminate immediately, interrupting any cleanup operation.  Avoid getting to this point as much as possible, since compressed log files being created at that point may be rendered unusable.


## The website/ directory: All your website's content

JSCause will serve everything you place inside the `website` directory to the public.  The directory tree of this directory will map the routing tree of your website.

For example, let's assume that you have a website configured for `https://www.example.com`.

If you have the following three files inside `website`:

* `website/index.html`
* `website/scripts/app.js`
* `website/css/styles.css`

Then JSCause will deliver their content when a web client (like a web browser) hits these corresponding urls:

* `https://www.example.com/index.html`
* `https://www.example.com/scripts/app.js`
* `https://www.example.com/css/styles.css`

### JSCP files

JSCP files end in `.jscp`, and are considered executable.  Therefore, they are _run_ instead of having their content delivered.

For example, if you have an `index.jscp` file with the following content:

```
rt.print('Hello, number ' + (2 + 2).toString());
```

Then visiting `https://www.example.com/index.jscp` in a web browser will display:

```
Hello, number 4
```

JSCause will only run JSCP files only if they are located in a site's `website` directory.  If you need to run files outside of `website`, [use symlinks](#site-contents-files-and-directories) (use this feature with caution.)
 
**Important**: JSCP file names are case-sensitive (if the file system allows it.)  A file will be considered JSCP only if its extension is lower case (that is, `.jscp` is valid, but `.JSCP` is not.)

### JSCM files

Files ending in `.jscm` are considered executable modules, which can be called by `.jscp` files.

JSCM files will never be served directly.  JSCause will issue an HTTP 404 error if it receives a direct request for one.

`https://www.example.com/module.jscp --> 404 error`

JSCause will only run JSCM files only if they are located in a site's `website` directory.  If you need to run files outside of `website`, [use symlinks](#site-contents-files-and-directories) (use this feature with caution.)

**Important**: Just like JSCP file names, JSCM file names are case-sensitive (if the file system allows it.)  A file will be considered JSCM only if its extension is lower case (that is, `.jscm` is valid, but `.JSCM` is not.)

### Index files

An `index.jscp` file is considered an _index file_, and serve as the default when a resource/file is omitted in a url (**Note**: `index.html` will not work as an index file.  This might be allowed in a future version.)

For example, if your website is hosted at `https://www.example.com` and it has the following file:

`website/index.jscp`

Then a web browser can request said file with either `https://www.example.com/index.jscp` or just `https://www.example.com`

Another example:

If the following file exists:

`website/stories/index.jscp`

Then it can be requested via `https://www.example.com/stories/index.jscp` or just `https://www.example.com/stories`

## Custom 4xx and 5xx errors

When JSCause cannot find a request because the resource doesn't exist, or encounters an error while running a JSCP file, it will respond to the client by setting the response's status code accordingly (e.g., HTTP 404 error, or HTTP 500 error.)  The web client handles how to inform the visitor.

You can instruct JSCause to display a specific page when such HTTP errors occur.

In order to do this, follow these steps:

- For HTTP 404 errors and similar, create a custom error file named `error4xx.html`.  For HTTP 500 errors and similar, create a file named `error5xx.html`.
  - You can create `error4xx.jscp` and `error5xx.jscp` instead.  Notice that if both `error4xx.html` and `error4xx.jscp` exist, JSCause will use the HTML version.  Same goes to `error5xx.html` and `error5xx.jscp`.
- Place the custom error files __on the root directory__ of your site.
  - For example, if your site is located at `sites/mysite/website/`, your custom error files must be located at `sites/mysite/website/error4xx.html` and `sites/mysite/website/error5xx.html` (or their JSCP counterparts.)
  - If your site has subdirectories, and you attempt to place custom error files in those (e.g. `sites/mysite/website/my_subdir/error4xx.html`), JSCause will ignore said files.

There are cases in which, even though a custom 4xx or 5xx page is configured, JSCause will not display them and just send the response error as if there was no custom errors at all.  This is by design.  Here are such cases:

   - When the web client attempts to use an unrecognized HTTP method.
   - When file uploads are not allowed.
   - When the upload payload limit is exceeded.
   - When the site (domain name) is not recognized.
   - When either a form upload or json body upload parsing fails.
   - When delivering a non-cached static file fails (e.g., the file was available when JSCause started, but became unavailable later.)

JSCause will throw a default (non-custom) HTTP 404 error if a web client attempts to directly access the custom error files. For example, given the file `sites/mysite/website/error5xx.jscp`, when a web client tries to access `https://example.com/error5xx.jscp`, JSCause will respond that the file is not found.

If you give a subdirectory a custom error name, it will throw a default (non-custom) HTTP 404 error, unless a slash is added.  This is by design.  For example, if your site has the following path: `sites/mysite/website/error4xx.html/index.html`, and the web client tries to access `https://example.com/error4xx.html`, JSCause will respond that the file is not found.  However, `https://example.com/error5xx.jscp/` (notice the trailing slash) will work.

**Note**:  If either `error4xx.jscp` or `error5xx.jscp` has a compile/runtime error, a generic (non-custom) HTTP 500 error will be delivered to the web client.  For example: if JSCause encounters an HTTP 404 error, and the `error4xx.jscp` file has in itself an error, JSCause will return an HTTP 500 error instead.

### All the routing rules

When JSCause receives a request, it applies the following rules to determine which file to serve:

1. If the url is `/`, `/index.jscp` will be assumed (see #5.)

2. If the url is `/name.jscp` (or `/directory/name.jscp`), JSCause will check for the file.  If it exists, and _`jscpExtensionRequired`_ is either `optional` or `always`, it will run it (see #5.)  If it doesn't, or if the url ends in `/` (e.g. `/directory/name/` or, if _`jscpExtensionRequired`_ is either `optional` or `always`, `/directory/name.jscp/`), it will assume it's a directory (see #4.)

3. If the url is `/name` (or `/directory/name`), and if _`jscpExtensionRequired`_ is either `never` or `optional`, JSCause will check for the file `/name.jscp` (or `/directory/name.jscp`.)  If it exists, it will run it (see #5.)  If the file name does not exist, or if the url ends in `/`, it will assume it's a directory (see #4.)

4. If the url refers to a directory (e.g. `/name` or `/name/`), check for `/name/index.jscp`.  This check happens regardless of the value of _`jscpExtensionRequired`_.

5. If the extension is `.jscp` (e.g. `/name.jscp` or `/directory/name.jscp`), and again, if _`jscpExtensionRequired`_ is either `optional` or `always` (unless we're coming from #3, in which case `never` is overriden), then JSCause will run the contents and serve its output.

7. If the url is `/name.extension`, with the extension being neither `.jscp` nor `.jscm` (or not present), JSCause will check for the file.  If it exists, JSCause will serve the contents of it (i.e., it is assumed a static resource.)

8. If the extension is `.jscm`, serve an HTTP 404 error.

9. If none of the above applies, serve an HTTP 404 error.


## The runtime framework

When a web client requests a JSCP file (a file ending in `.jscp`), JSCause will execute it, then sends the result of the execution as a response.

JSCP files combine HTML and Javascript.  Let's go through three different scenarios.

### JSCP with Javascript only

A JSCP file can contain just Javascript code.  To send a response back to the web client, use the command `rt.print`:

```
// This is a valid JSCP program
rt.print('Hello, Javascript');
```

When a browser access this file (e.g. `index.jscp`), it will display `Hello, Javacript` back to the user.

### JSCP with HTML only

To let JSCP know that the whole file contents is HTML, start it with `<html />`:

```
<html />
<html>
  <head><title>Sample HTML document</title></head>
  <body><h1>Hello, HTML</h1></body>
</html>
```

When a browser access this file (e.g. `index.jscp`), it will display `Hello, HTML` back to the user.

Of course, at this point you could just use a regular `.html` file.  JSCause will happily render it whole, and more efficiently.

Technically, you can still embed Javascript code in a file starting with `<html />`.  It's just that, if it's all HTML only, `<html />` is needed, otherwise JSCause will complain.

Note: You can replace `<html />` with `<js/js>` and achieve the same thing above.

### JSCP with both HTML and Javascript

Enclose your Javascript code within `<js>` tags (`<js` and `/js>`).  Anything outside of the tags will be considered HTML.

Here's an example - The value of PI:

```
<html>
  <head><title>Sample HTML document</title></head>
  <body>
    <h1>Hello, PI</h1>
    <p>PI is: <js rt.print(Math.PI); /js>
</body>
</html>
```

Notice that there is no need to include `<html />` at the top of a file if it contains executable Javascript code.

Another example - Children 3 years and under enter the theater for free:

```
<js const randomAge = Math.floor(Math.random() * 120); /js>
<p>John's age is: <js rt.print(randomAge); /js></p>
<js if (randomAge <= 3) { /js>
  <p>John can enter the theater for free.</p>
<js } else { /js>
  <p>John will need a ticket in order to enter the theater.</p>
<js } /js>
```

Alternatively:

```
<js
  const randomAge = Math.floor(Math.random() * 120);
  const message = (randomAge <= 3) ?
    'John can enter the theater for free.' :
    'John will need a ticket in order to enter the theater.';
/js>
<p>John's age is: <js rt.print(randomAge); /js></p>
<p><js rt.print(message); /js></p>
```

### The implicit rt.print shortcut: <js= /js>

A single Javascript `<js rt.print(value); /js>` call embedded within HTML can be replaced with the shorter `<js= value /js>` version.

So, in the examples in the previous section, the following lines:

```
<p>PI is: <js rt.print(Math.PI); /js>

<p>John's age is: <js rt.print(randomAge); /js></p>

<p><js rt.print(message); /js></p>
```

Could be rewritten as:

```
<p>PI is: <js= Math.PI /js>

<p>John's age is: <js= randomAge /js></p>

<p><js= message /js></p>
```

#### Quirk warning

JSCause does a simple replacement when dealing `<js= /js>`.  So, again:

The following statement:

```
<h1><js= title /js>
```

is interpreted as:

```
<h1><js rt.print(title) /js>
```

That means that one could cleverly add `);` to the value and run more code:

```
<js='1');rt.print('23'/js>
```

Will print `123` because it's interpreted as:

```
<js rt.print('1');rt.print('23') /js>
```

Please notice that this quirk may be fixed in a future version of JSCause, so you're advised not to use it.

### The rt runtime object

`rt` stands for "runtime," and it's the object that contains a library of convenient methods and variables to make things easier for you, the developer.

`rt` exists in every JSCP file.  To use it in JSCM modules, the calling JSCP file will need to pass it `rt` as a parameter - see the previous section, [rt in modules](#rt-in-modules).

A complete reference [can be found here](#the-rt-runtime-object-reference).

### JSCause modules: JSCM files

JSCM files have the `.jscm` extension.  They are essentially regular Javascript modules.  You can import them in your program with the `rt.module()` instruction:

```
const myModule = rt.module('myModule');
```

Example:

Let's create a `sum.jscm` module file with the following contents:

```
module.exports = {
  addTwo(a, b)
  {
    return a + b;
  },
  numberFive: 5
};
```

And an `index.jscp` file with the following contents:

```
const sumModule = rt.module('sum');

rt.print(sumModule.addTwo(1, 2));
rt.print(' and ');
rt.print(sumModule.numberFive);
```

When we hit `/index.jscp` in the browser, the following will be displayed in the browser window:

```
3 and 5
```

### rt in modules

You may notice that `rt` is not available in modules, at least, not directly.  So, instructions such as `rt.print` are not available.

Consider this module:

```
module.exports = {
  twoSum(a, b)
  {
    rt.print(a,b);
  }
};
```

If we import it in our code as `printSum`, and attempt to use `twoSum()`:

```
  const printSum = rt.module('printSum');
  printSum.twoSum(1, 2);
```

JSCause will report an HTTP error 500 back to the browser, and print something similar to the following to the console:

```
ERROR: Site: My Site: Runtime error on file /index.jscp: rt is not defined at line 1
ReferenceError: rt is not defined
    at Object.addTwo (/jscause_path/sites/mysite/website/sum.jscm:5:7)
    at ... [etc]
Fri, 17 Jan 2020 05:05:26 GMT - example.com - GET: / - 500
```

To overcome that, we can pass the `rt` object to the module as a function parameter:

```
module.exports = function(rt)
{
  return {
    twoSum(a, b) {
      rt.print(a,b);
    }
  };
};
```

Then we modify our main code:
```
  const printSum = rt.module('printSum')(rt);
  printSum.twoSum(1, 2);
```

We'll no longer get an HTTP error 500, and the browser will display `3`.


## Redirection

To redirect to a different URL, use [`rt.redirectTo()`](#rtredirectto).

Example:

```
rt.redirectTo('https://www.example.com', 5); // Redirect after five seconds.
```

The redirection will happen right after JSCause executes all the code in the current JSCP file. That's when the content is delivered to the web browser, including the redirection instruction.

If, later in your code, it is determined that you no longer need to redirect, you can use [`rt.resetRedirectTo()`](#rtresetredirectto).

Example:

```
rt.redirectTo('https://www.example.com');

const coinFlipIsTails = (Math.random() >= 0.5);
if (coinFlipIsTails) {
  rt.resetRedirectTo();
}
```


## Callbacks

If your code invokes callbacks, chances are they won't be run in time before JSCause delivers the response to the web client.

Take this example:

```
function andThree() {
  rt.print('And three!');
}

rt.print('One! ');
setTimeout(andThree, 10);
rt.print('Two! ');
```

When making this request, the browser will display the following:

```
One! Two!
```

We were expecting to see "One! Two! And three!".  The `andThree()` callback _ did run_, but too late - JSCause had already sent the response to the browser.

We must signal JSCause that it must wait for the callback to complete.  We do that by enclosing it with [`rt.waitFor()`](#rtwaitfor):

```
function andThree() {
  rt.print('And three!');
}

rt.print('One! ');
setTimeout(rt.waitFor(andThree), 10);
rt.print('Two! ');
```

When making this request, the browser will correctly display the following:

```
One! Two! And three!
```

Notice that `rt` methods, such as `rtOnSuccess()`, do _not_ require their callbacks to be enclosed with `rt.waitFor()`:

```
function reportSuccess() {
  rt.print('File read successfully!');
}
rt.readFile('my_source.txt', 'utf-8')
  .rtOnSuccess(reportSuccess); // This is correct.  No need for rt.waitFor() here.
```

You can read more about this behavior in the next section about [RT Promises](#rt-promises).

**Important!** 

We advise you to _always_ use `rt.waitFor()` with callbacks (unless you're using them with `rt` methods, as mentioned above.)  If you don't, then make sure you catch all the potential errors by using Javascript's `try / catch` blocks.  If an error occurs, and you don't catch it, **the whole JSCause application will crash, and your website will become unavailable**.  This is not a limitation of JSCause, but rather a behavior of NodeJS/Javascript by design.  Another way to deal with this is by using an external monitor that watches JSCause's process, and restarts it when it goes down.


## RT Promises

RT Promises refers to the mechanism some `rt` methods use to deal with the asynchronous nature of their operations.  They seek to emulate Javascript's Promises.  One important difference is that RT Promises will always involve two methods, `rtOnSuccess()` and `rtOnError()`.

Here's an example.  First, let's use regular Javascript promises.  Let's assume that `promisedReadFile()` reads a file and returns a Promise object.  In that case, we can write the following code:

```
promisedReadFile('some_file.txt')
  .then((response) => {
    console.log('File reading succeeded:');
    console.log(response);
  })
  .catch((err) => {
    console.log('File reading failed:');
    console.log(err);
  });
```

The JSCause way to do the above would be:
```
rt.readFile('some_file.txt')
  .rtOnSuccess((response) => {
    console.log('File reading succeeded:');
    console.log(response);
  })
  .rtOnError((err) => {
    console.log('File reading failed:');
    console.log(err);
  });
```

As mentioned, RT Promises, instead of expecting a `then()/catch()` chains, they expect `rtOnSuccess()/rtOnError()` chains.  Apart from the name, the major distinction is that the callbacks are guaranteed to complete before JSCause sends a response to the web client.  That is, operations involving RT Promises do not need callbacks to be enclosed with `rt.waitFor()` - see the previous section about [Callbacks](#callbacks).

Here is a list of JSCause methods that use RT Promises:

 - [rt.copyFile()](#rtcopyfile)
 - [rt.deleteFile()](#rtdeletefile)
 - [rt.fileExists()](#rtfileexists)
 - [rt.moveFile()](#rtmovefile)
 - [rt.readFile()](#rtreadfile)

In summary:

Chain any of the above calls with `.rtOnSuccess(callback)` to examine the result (or response).  `callback` has a parameter (`response`) with the result of the operation.

Chain it with `.rtOnError(callback)` to handle any errors in the operation.  `callback` has a parameter (`err`) with the error in question.

Notes:

These types of operations can be nested.  For example:

```
rt.copyFile('my_file.txt', 'my_copied_file.txt')
  .rtOnSuccess(() => {
    console.log('File copying succeeded.  Let\'s read the copy.');
    rt.readFile('my_copied_file.txt')
      .rtOnSuccess((contents) => {
        console.log('File reading succeeded!');
        console.log(contents);
      })
      .rtOnError(() => {
        console.log('File reading failed.');
      });
  })
  .rtOnError((err) => {
    console.log('File copying failed:');
    console.log(err);
  });
```

Both `rtOnSuccess()` and `rtOnError()` can be omitted.  But if any error occurs, the server will throw a runtime error:

```
  rt.copyFile('my_file.txt', 'my_copied_file.txt');
  // The above operation is fine.
  // However, if an error occurs, the web client will inform of
  // an HTTP 500 (internal server error) error.
```

Both `rtOnSuccess()` and `rtOnError()` can omit their parameter, that is, their callback.  Although allowed, this is not advisable from an application development standpoint.  For example, you may want to handle any potential errors.


## Logging features

When JSCause is running, it can log the activity related to requests, application messages and errors to the terminal and/or to files for archiving, later review or analysis.

Notice:  Any console output from the actual user application (e.g. `console.log()` from `index.jscp`) will never be captured in the log files, and will always be printed in the terminal.

JSCause can log activity in a global way, or per site.

The [configuration of global logging](#logging) resides in the `jscause.conf` file.

When JSCause receives a request, it will generate a log entry indicating the time of the request, the type (e.g. GET or POST), the path requested, and the type of HTTP response generated and to be sent when the request completes (e.g. 200 OK, 404, etc.)

Here is a sample:

```
Sun, 23 Feb 2020 00:21:17 GMT - example.com - GET: /some_folder - 200
```

Depending on the configuration, said entry will be added to a file store in the directory specified by `directoryName` in the `jscause.conf` file, and only if `fileOutput` is set to `enabled`.  Read more about the characteristics of this file in the following section about [file compression](#log-file-compression).

If `consoleOutput` is also `enabled`, the entry will be printed to the terminal window JSCause is running in.

When configuring logging, you must specify what operations occur globally, and what operations occur per site.

Operations occurring globally are configured inside the `logging` / `general` section of the `jscause.conf` file:

```
"logging": {
  "general": {
    // Attributes pertaining application-wide logging.
  }
}
```

Here you can specify `consoleOutput` to `enabled` if you want the logging to appear in the terminal, or `disabled` if not.  `fileOutput` is the same as `consoleOutput`, but with all the logging being saved to a directory specified by `directoryName`.  Here's an example configuration:

```
  "logging": {
    "general": {
      "directoryName": "./logs",
      "fileOutput": "enabled",
      "consoleOutput": "enabled"
    }
  }
```

### Types of data logged

* Whenever JSCause is started.  Example:

```
INFO: Site 'My Site' at https://example.com:3000/ assigned to server 0
INFO: Server 0 listening on port 3000
```

* Client requests will be logged, as well as their HTTP response status.  Example:

```
Sun, 23 Feb 2020 00:21:17 GMT - example.com - GET: /some_folder - 200
```

* Runtime errors.  Example:

```
ERROR: Site: My Site: Runtime error on file /some_file.jscp: some_invalid_funcion is not defined at line 17
ReferenceError: some_invalid_funcion is not defined
Sun, 23 Feb 2020 00:32:04 GMT - jscausesite1 - GET: /some_file.jscp - 500
```

### Per site logging

You can also dictate whether individual sites must do logging or not.  This is done under the `logging` / `perSite` section.  It's similar to `general`, except that no `directoryName` can be defined here (this is done in each site's individual `site.json` configuration file.)  Also, both `fileOutput` and `consoleOutput` allow a third option, `per site`, to indicate that each site will determine wheteher to log or not (again, in their corresponding `site.json` file.)

Here's a typical configuration:

```
  "logging": {
    "general": {
      // General options here.
    },
    "perSite": {
      "fileOutput": "enabled", // Every site must log to a file.
      "consoleOutput": "per site"
    },
  }
```

When sites are allowed to determine their own logging configuration, JSCause will examine their corresponding `site.json` for a `logging` section:

```
  "logging": {
    // Site options here.
  }
```

Just like in `jscause.conf` file, here you can specify three values for `consoleOutput` (`enabled`, `disabled`), `fileOutput` (`enabled`, `disabled`) and `directoryName`.

Another difference is, `directoryName` must be relative to the site's `rootDirectoryName`.  For example:  if JSCause is installed in `/home/user_name/jscause/`, `rootDirectoryName` is `mysite`, and `directoryName` is `./localLogs`, then the latter will be intepreted as `/home/user_name/jscause/sites/mysite/localLogs`.  Here is an example:

```
  "logging": {
    "directoryName": "./localLogs",
    "consoleOutput": "disabled",
    "fileOutput": "enabled"
  }
```

Finally, these values will only apply if they are marked as `per site` in the global `perSite` configuration.  Otherwise, they will have no effect (will be overridden.)  For example, consider the following `jscause.conf` example:

```
  "logging": {
    "perSite": {
      "fileOutput": "enabled",
      "consoleOutput": "per site"
    },
  }
```

And `site.json`:

```
  "logging": {
    "fileOutput": "disabled",
    "consoleOutput": "disabled",
    "directoryName": "./localLogs"
  }
```

In this case, the site's `fileOutput` will be `enabled`, and `consoleOutput` will be `disabled`.

### Log file compression

Log files have the following file name format: `jsc_YYYY-MM-DD_HH-00-00.log` (YYYY represents the current year, MM the current month, DD the current day, HH the current hour in 24-hour format,)  For example, a log file with the name `jsc_2020-02-08_09-00-00.log` indicates that it was created on Feb 08, 2020 at 9am.

When the hour changes (in hour example, from 9am to 10am), JSCause creates a new file with the new hour, and continues logging in it.

Since minutes and seconds are ignored, then if only a few web requests per hour are made, a new log file will be created once per hour.  If no requests are made at a specific hour, then no log file will be generated for that particular hour.

On the other hand, high volume sites may generate a lot of logging in one hour.  If you want to keep log files from getting too large, you can instruct JSCause to divide them up.  This is helpful for administration operations such as backing up.

To ensure that log files don't go past a certain size, use the `logFileSizeThreshold` logging configuration option in `jscause.conf` (this option is not allowed in `sites.json`.)  It receives a numeric value representing the maximum size a log file can be - in bytes.  When this size is reached, JSCause will stop using it, and will create another empty log file, and continue logging in it.

The new file will be appended a numeric suffix to distinguish it from the old file, if it's generated in the same hour.  For example, if it's 5pm, then the log file may have a name such as `jsc_2020-02-08_17-00-00.log` (17:00, or 5pm.)  If the file reaches its maximum size at 5:25pm, then a new log file will be created, and named `jsc_2020-02-08_17-00-00--1.log`.  If that one gets filled up at 5:55pm, then a new log file is created with the name `jsc_2020-02-08_17-00-00--2.log`.  At 6pm, a new log file is then created with the name `jsc_2020-02-08_18-00-00.log` (18:00, or 6pm), and the cycle resets.

JSCause will compress old log files in order to save space.  When they are compressed, they are renamed so they have the `.log.gz` extension (for example, `jsc_2020-02-08_09-00-00--3.log.gz`.)  They will become smaller.  However, you should regularly move these older files to a backup media (or delete them, if you consider you don't need them anymore), so that the storage medium they are being created on will not fill up.  A file rotation feature, in which only the most recent N files are kept, will be added in a future version.

**Important notes:**

- If there are file reading/writing errors during logging, then no further logging operations will take place until it's time to compress/rotate the files.  If console output is enabled, the server will emit warnings in these cases.

- Compression of log files will happen four at a time.  If more than four files need to be compressed, the remaining will be queued.

- The process of determining log compressing on a specific site will happen only when there is something to log.  For example: If there are uncompressed log files, and the site is never accessed, or nothing is logged, the files will remain uncompressed.

- If you move compressed log files to another location, and JSCause is writing to a suffixed file (e.g., `jsc_2020-02-08_22-00-00--2.log`), then it will reset writing to a non-suffixed file.  This will cause log entries that will appear as out of sync with the files they're in.  And because of the file name reset, backing it up could lead to the newer file overwriting the older one.  To avoid this, your move procedure should not move any the compressed suffixed files associated with the current (non-compressed) log file.  For example, given the following list of files: `jsc_2019-12-31_23-00-00.log.gz`, `jsc_2020-01-01_00-00-00.log.gz` and `jsc_2020-01-01_00-00-00--1.log`, just move `jsc_2020-12-31_23-00-00.log.gz`.  This will be fixed in a future version.


## HTTPS/SSL configuration

To enable secure HTTPS connections on your site, you must follow these steps:

**Step 1**: Have your certificate files ready:

  - Your SSL certificate file.  For example, `my_site.crt`.
  - Your certificate's private key file.  For example, `private.key`.
  - Your certificate file from a Certificate Authority, if you have one.  For example, `cert_authority.crt`.

Notice that the extensions of the files above may differ.  `.pem`, `.der` and `.cer` are also typical.

**Step 2**: Place your certificate files in the `configuration/certs` subdirectory of your site:

The `configuration/certs` subdirectory is relative to the site's `rootDirectoryName`.

For example,  if JSCause is installed in `/home/user_name/jscause/` and `rootDirectoryName` is `mysite`, then your files must reside in the following paths:

```
/home/user_name/jscause/sites/mysite/configuration/certs/my_site.crt
/home/user_name/jscause/sites/mysite/configuration/certs/private.key
/home/user_name/jscause/sites/mysite/configuration/certs/cert_authority.crt
```

Note: The default installation of JSCause includes example files called `jscause-cert.pem` and `jscause-key.pem`.  Do *NOT* use this in production!  User's browsers will emit a security warning.

**Step 3**: Configure your cert files in your site's `site.json` configuration file:

Add the `httpsCertFile` and `httpsKeyFile` entries in the configuration file (or modify them, if they already exist):

```
  "httpsCertFile": "my_site.crt",
  "httpsKeyFile": "private.key",
```

Notice that you must only provide the file names here.  JSCause already knows it has to look for them under `configuration/certs`.

**Step 4**: Enable HTTPS connections in `jscause.conf`:

Add the `enableHTTPS` to the server's `jscause.conf` configuration file (or modify it), with a value of `true`:

```
"enableHTTPS": true
```

Note: If you set `enableHTTPS` to `true`, both `httpsCertFile` and `httpsKeyFile` are required.  If you set `enableHTTPS` to `false`, then the entries can be omitted.  However, should you decide to include them, they must be valid, non-empty strings.  Otherwise, JSCause will not start.

**Step 5**: If JSCause is running, restart it.

**Important notes**:

- Each HTTPS site should use its own port.  JSCause will emit a warning if two HTTPS sites share the same port, or if an HTTP site shares the port with an already configured HTTPS site.

- For security purposes, an HTTPS site cannot share the same port with an HTTP site.  If an HTTPS site tries to share the port of an already configured HTTP site (listed first in `jscause.conf`), JSCause will emit an error and stop running.

- If two HTTPS sites share the same port, only the `httpsCertFile` and `httpsKeyFile` of the first site listed in `jscause.conf` will be taken into account to configure the SSL connection.


## jscvendor: JSCause vendor directory

In a typical installation workflow, all you need to get JSCause up and running is to download the zip file, unzip it and run it.  No need to run an `npm install` command, or generate some usually big `node_modules/` directory that requires maintaining.

Of course, if you prefer to install via `npm`, [you can still do so]({% link download.md %}).


## Symbolic links in configuration and websites

JSCause allows the use of symbolic links (symlinks) in many circumstances.  This allows you to have more flexibility on where to place your configuration files, as well as your website's files, be it in the same storage media, or a different one.

It is important to note that JSCause will be constrained to the rules of both of the operating system and the file system where the symlinks reside.

### Where symlinks can be used

Symlinks can be used in practically any scenario in which the underlying operating system (OS) allows them.  However, JSCause does extra checks (e.g. preemptively detecting circular references) in the following scenarios:

#### jscause.conf: rootDirectoryName

Your website's root directory can be a symlink.

For example, let's assume that the location of your site is in `/mnt/great_sites/a_great_site`, and your JSCause installation is in `/home/user_name/jscause`.  This would mean that the `sites` directory is in `/home/user_name/jscause/sites`.  You can create a symlink to `a_great_site` by issuing the following in the terminal:

```
$ ln -s /mnt/great_sites/a_great_site /home/user_name/jscause/sites/a_great_site_link
```

Then you can configure the root directory name as:

```
"rootDirectoryName": "a_great_site_link"
```

#### Site contents files and directories

You can use symlinks in place of files and directories within your site's `website` directory.  JSCause will treat them as if they were being called right on the symlink's spot.

For example, let's assume that your website uses a JSCP file located at `/mnt/great_sites/utlities/time.jscp`.  However, the actual website is located at `/home/user_name/jscause/sites/a_great_site/website/`.  You can create a symlink to `time.jscp` by issuing the following command in the terminal:

```
$ ln -s /mnt/great_sites/utlities/time.jscp /home/user_name/jscause/sites/a_great_site/website/time_link.jscp
```

Then, assuming your site's domain name is `example.com`, you can refer to that file from a web browser by visiting: `http://example.com/time_link.jscp`.

Please note that we're using a `_link` suffix here for demonstration purposes.  In reality, you can name the symlink any way you want.

#### site.json: tempWorkDirectory

You can use a symlink for your website's temporary work directory.  For example:

```
$ ln -s /mnt/great_sites/one_great_site/workbench /home/user_name/jscause/sites/a_great_site/workbench_link
```

**Be mindful about where you place this directory.**  It should be a location outside of your site's `/website` directory.  It should never be public.

#### Logging directory

You can use a symlink when specifying a logging directory, in both a server-wide scenario as well as a site-wide scenario.

Here are two examples:

In the case of server-wide logging, let's assume that your logging directory is at `/mnt/all_server_logging/logging/`, and the JSCause installation is at `/home/user_name/jscause/`.  You can create a symlink to the logging directory by issuing the following command in the terminal:

```
$ ln -s /mnt/all_server_logging/logging /home/user_name/jscause/server_logs_link
```

Then on `jscause.conf`, you can configure the logging directory as:

```
  "logging": {
    "general": {
      "directoryName": "./server_logs_link",
      // etc
    }
  }
```

A similar procedure can be done for site-wide configurations.  Let's assume that your site's logging directory is at `/mnt/all_sites_logging/my_site/logging`, and your site is at `/home/user_name/jscause/sites/mysite`.  You can create a symlink to the logging directory by issuing the following command in the terminal:

```
$ ln -s /mnt/all_sites_logging/my_site/logging /home/user_name/jscause/sites/mysite/logs_link
```

Then on `site.json` you can configure the logging directory as:

```
  "logging": {
    "directoryName": "./logs_link",
    // etc
  }
```


## The rt runtime object reference

Here's the complete list of methods and variables available in the `rt` object:

### rt.additional

_Type_: Object.

It contains additional values related to a previously run JSCause operation, or an error.

At the moment, the only value available is `rt.additional.jsonParseError`, which will be set to `true` if an incoming request includes a JSON-formatted payload, and JSCause was unable to parse it )(for instance, if it was malformed.)

Example:

```
<html>
<head></head>
<body>
<js if (rt.additional.jsonParseError) {
      rt.print('Sorry, the upload JSON object was not understood');
    }
/js>
</body>
```

See also:
 - [rt.postParams](#rtpostparams)

### rt.contentType

_Type_: String.

It contains the content type of the request.  For example, `text/plain`.

Having said that, there are three cases which will set `contentType` to values unique to JSCause:

- `formData`: When the request contains a submitted HTML form.
- `formDataWithUpload`:  When the request contains a submitted HTML form and/or uploaded files.
- `jsonData`: When the request is submitted as JSON.

See also:
 - [rt.postParams](#rtpostparams)
 - [rt.uploadedFiles](#rtuploadedfiles)
 - [rt.moveFile](#rtmovefile)
 - [rt.readFile](#rtreadfile)
 - [rt.requestMethod](#rtrequestmethod)
 
### rt.copyFile()

_Type_: Method.

_Syntax_: `rt.copyFile(source:String, destination:String[, overwrite:Boolean = true])`

_Returns_: RT Promise.

It copies a file from `source` to `destination`.  `overwrite` is optional, and `true` by default.

Example:

```
rt.copyFile('my_file.txt', 'my_copied_file.txt')
  .rtOnSuccess(() => { rt.print('File copied successfully!'); })
  .rtOnError((err) => { rt.print(`There was an error: ${err}`); });
```

`source` and `destination` can be either absolute or relative paths.

If a relative path, it will be relative to the site's `rootDirectoryName`.  For example:  if JSCause is installed in `/home/user_name/jscause/`, `rootDirectoryName` is `mysite`, and `source` is `./folder/file.txt`, then the latter will be intepreted as `/home/user_name/jscause/sites/mysite/folder/file.txt`.

If `destination` exists prior to the copy operation, JSCause will check the value of `overwrite`.  If `overwrite` is `true`, then the copy operation will overwrite whatever is in `destination`.  If `overwrite` is `false`, then JSCause will _not_ proceed with the copy operation, and will emit an `EEXISTS` error instead.

`rt.copyFile` returns an RT Promise, which consists in two chainable methods, `rtOnSuccess()` and `rtOnError()`.  Only one of them will apply depending on whether the copy operation succeeds or fails.  When the copy operation succeeds, JSCause will invoke the callback specified by `rtOnSuccess()`.  If it fails, JSCause will invole the callback specified by `rtOnError()`.

This method relies on node's `fs.copyFile`.  Any strengths and limitations of the latter will apply to `rt.copyFile` as well.

Notes:

- You will read elsewhere in this document that callbacks must be wrapped with `rt.waitFor()`.  When you use `rtOnSuccess()` and `rtOnError()`, no such wrapping is necessary.  You can [read more about RT Promises here](#rt-promises).

- If `overwrite` is `false` and the destination exists, the error thrown, `err`, is not native.  JSCause will try to mimmick what `copyFile` does as much as possible.  The `errno` attribute won't be available.  This is because the POSIX's `rename` operation will always overwrite.  JSCause checks for file existence first, then acts accordingly.

See also:
 - [rt.moveFile](#rtmovefile)
 - [rt.readFile](#rtreadfile)
 - [rt.deleteFile](#rtdeletefile)
 - [rt.fileExists](#rtfileexists)
 - [rt.uploadedFiles](#rtuploadedfiles)
 - [rt.runAfter](#rtrunafter)
 - [Server configuration: `allowExeExtensionsInOpr`](#allowexeextensionsinopr)
 - [RT Promises](#rt-promises)
 
### rt.deleteCookie()

_Type_: Method.

_Syntax_: `rt.deleteCookie(name:String)`

_Returns_: Object.

It deletes a browser cookie.

Example:

```
rt.deleteCookie('my_cookie');
```

`rt.deleteCookie` returns an object representing the result of the cookie deletion operation.  Always check its value to make sure that everything went well.

If the operation succeeds, `rt.deleteCookie` will return `{ success: true }`.

If the operation fails, `rt.deleteCookie` will return `{ error: '<message>' }`, where `error` is a string explaining the issue.

The `error` messages could be the following (list not complete):

  - `Invalid cookie name. String expected.`

See also:
 - [rt.getCookie](#rtgetcookie)
 - [rt.setCookie](#rtsetcookie)
 
### rt.deleteFile()

_Type_: Method.

_Syntax_: `rt.deleteFile(filePath:String)`

_Returns_: RT Promise.

It deletes a file specified by `filePath`.

Example:

```
rt.deleteFile('my_file.txt')
  .rtOnSuccess(() => { rt.print('File deleted successfully!'); })
  .rtOnError((err) => { rt.print(`There was an error: ${err}`); });
```

`filePath` can be either absolute or relative.

`rt.deleteFiles()` will not delete directories.

Please see the notes on [rt.copyFile()](#rtcopyfile) for more information on file operations on relative paths, as well as the RT Promise type.

This method relies on node's `fs.unlink`.  Any strengths and limitations of the latter will apply to `rt.deleteFile` as well.

See also:
 - [rt.copyFile](#rtdeletefile)
 - [rt.moveFile](#rtmovefile)
 - [rt.readFile](#rtreadfile)
 - [rt.fileExists](#rtfileexists)
 - [rt.uploadedFiles](#rtuploadedfiles)
 - [rt.runAfter](#rtrunafter)
 - [Server configuration: `allowExeExtensionsInOpr`](#allowexeextensionsinopr)
 - [RT Promises](#rt-promises)
 
### rt.fileExists()

_Type_: Method.

_Syntax_: `rt.fileExists(filePath:String)`

_Returns_: RT Promise.

It determined whether a file specified by `filePath` exists or not.

Example:

```
rt.fileExists('my_file.txt')
  .rtOnSuccess(() => { rt.print('File exists!'); })
  .rtOnError((err) => { rt.print((err === 'ENOENT') ? 'File does not exist' : `There was an error: ${err}`); });
```

`filePath` can be either absolute or relative.

As seen from the example above, `rtOnSuccess` is called if file exists.  `rtOnError` will be called if file does not exist, but _also_ if some other error happens.  Always check the error.  When the file does not exist, the error will be `ENOENT`.  Anything different from `ENOENT` should be addressed.

Please see the notes on [rt.copyFile()](#rtcopyfile) for more information on file operations on relative paths, as well as the RT Promise type.

This method relies on node's `fs.stat`.  Any strengths and limitations of the latter will apply to `rt.fileExists` as well.

See also:
 - [rt.copyFile](#rtdeletefile)
 - [rt.moveFile](#rtmovefile)
 - [rt.readFile](#rtreadfile)
 - [rt.deleteFile](#rtdeletefile)
 - [rt.uploadedFiles](#rtuploadedfiles)
 - [rt.runAfter](#rtrunafter)
 - [Server configuration: `allowExeExtensionsInOpr`](#allowexeextensionsinopr)
 - [RT Promises](#rt-promises)
 
### rt.getCookie()

_Type_: Method.

_Syntax_: `rt.getCookie(name:String[, options:Object])`

_Returns_: String.

It reads the value of a browser cookie. `options` is optional, and it contains additional instructions to decode the cookie value before returning it.

Example:

```
const cookieValue1 = rt.getCookie('my_cookie');
const cookieValue2 = rt.getCookie('my_cookie', { decodeURIValue: false });
```

`options` may contain the `decodeURIValue` attribute, which is `true` by default. When `true`, the cookie value is URI-decoded before being returned.

Example:

Let's assume that the `my_cookie` cookie has a raw value of `a%3Db`. In an URI, `%3D` refers to the `=` character:

```
console.log(rt.getCookie('my_cookie'));  // ---> Returns: "a=b"
console.log(rt.getCookie('my_cookie'), { decodeURIValue: false }); // --> Returns `a%3Db`.
```

If `name` is not a string, `rt.getCookie` will return an empty string.

See also:
 - [rt.setCookie](#rtsetcookie)
 - [rt.deleteCookie](#rtdeletecookie)
 
### rt.getCurrentPath()

_Type_: Method.

_Syntax_: `rt.getCurrentPath()`

_Returns_: String.

It yields the client request's path without the resource (file name) portion.

```
const currentPath = rt.getCurrentPath();
```

For example, if the request url is `/some/directory/hello.jscp`, rt.getCurrentPath() will return `'/some/directory'`.

### rt.getParams

_Type_: Object.

This is an object containing the client request's GET query parameters.

```
const name = rt.getParams['txt_name'];
```

For example, if the request's url is `https://www.example.com/home?message=hello`, then `rt.getParams['message']` will contain `'hello'`.

See also:
 - [rt.postParams](#rtpostparams)

### rt.header()

_Type_: Method.

_Syntax_: `rt.header(name:String, value:String)`; `rt.header(collection:Object)`

_Returns_: Nothing (`undefined`).

It sets a response's HTTP header entry.

```
rt.header('Last-Modified', 'Fri, 20 Dec 2020 12:00:00 GMT');
```

You can set up multiple header entries if you provide an object as a parameter:

```
{
  <Header name 1>: <value 1>,
  <Header name 2>: <value 2>,
  etc
}
```

For example:

```
rt.header({
  'Last-Modified': 'Fri, 20 Dec 2020 12:00:00 GMT',
  'Content-Language': 'en',
  'X-App-Greeting': 'hello!'
});
```

You can call `rt.header` as many times as needed.

See also:
 - [rt.getCookie](#rtgetcookie)
 - [rt.setCookie](#rtsetcookie)
 - [rt.deleteCookie](#rtdeletecookie)
 - [rt.contentType](#rtcontenttype)
 - [rt.redirectTo](#rtredirectto)
 - [rt.resetRedirectTo](#rtresetredirectto)
 - [rt.requestMethod](#rtrequestmethod)

### rt.module()

_Type_: Method.

_Syntax_: `rt.module(moduleName:String)`

_Returns_: Any value (typically an object or function.)

It imports a module.  It technically is syntactic sugar for: `require('./moduleName.jscm')`.

```
const sumModule = rt.module('sum.jscm');
```

`moduleName` may omit the file module's `.jscm` extension.  Its path is relative to the website directory.  Absolute paths are not permitted.  Attempting to use an absolute path will log an error and cause `rt.module()` to return `null` (a future version may throw an HTTP error 500.)

See also:
 - [JSCause modules: JSCM files](#jscause-modules-jscm-files)

### rt.moveFile()

_Type_: Method.

_Syntax_: `rt.moveFile(source:String, destination:String[, overwrite:Boolean = true])`

_Returns_: RT Promise.

It moves a file from `source` to `destination`.  `overwrite` is optional, and `true` by default.

Example:

```
rt.moveFile('my_source.txt', 'my_destination.txt')
  .rtOnSuccess(() => { rt.print('File moved successfully!'); })
  .rtOnError((err) => { rt.print(`There was an error: ${err}`); });
```

`source` and `destination` can be either absolute or relative paths.

Please see the notes on [rt.copyFile()](#rtcopyfile) for more information on file operations on relative paths, as well as the RT Promise type, and overwrite errors.

This method relies on node's `fs.rename`.  Any strengths and limitations of the latter will apply to `rt.rename` as well.

See also:
 - [rt.copyFile](#rtcopyfile)
 - [rt.readFile](#rtreadfile)
 - [rt.deleteFile](#rtdeletefile)
 - [rt.fileExists](#rtfileexists)
 - [rt.uploadedFiles](#rtuploadedfiles)
 - [rt.runAfter](#rtrunafter)
 - [Server configuration: `allowExeExtensionsInOpr`](#allowexeextensionsinopr)
 - [RT Promises](#rt-promises)
 
### rt.postParams

_Type_: Object.

This is an object containing the client request's POST form-encoded parameters or JSON parameters.

```
const name = rt.postParams['txt_name'];
```

For example, given the following form in a web browser:

```
<form method="post">
  Name: <input type="text" name="txt_name" value="" />
  <input type="submit" name="b_submit" value="Send" />
</form>
```

If a user fills the "Name" field with "Mary," then submits the form, then `rt.postParams['txt_name']` will contain `'Mary'`.

If the POST request has a mime type of `application/json`, `postParams` will contain the parsed JSON payload.  If for some reason the JSON payload cannot be parsed, `rt.addidional.jsonParseError` will be set to `true`.

For example, given a POST request with the following payload:

```
{
  "some_data": ["a", "b", "c]
}
```

Then `postParams['some_data']` will contain the following array `['a', 'b', 'c']`.

If the request contains file uploads, they'll be available via [rt.uploadedFiles](#rtuploadedfiles).

See also:
 - [rt.getParams](#rtgetparams)
 - [rt.additional](#rtadditiona)
 - [rt.uploadedFiles](#rtuploadedfiles)

### rt.print()

_Type_: Method.

_Syntax_: `rt.print(value:String)`

_Returns_: Undefined.

It prints to the response body.  A web browser will display `value` in the page it renders.

Example:

```
rt.print('Hello, world');
```

Use `rt.print` as many times as you need to render dynamic content to a page:

Another example:

```
<h1><js rt.print('Hello, ', rt.postParams['txt_name']); /js></h1>
<p><js
rt.print(`The value of PI is: ${Math.PI}`);
/js></p>
```

`rt.print` will escape symbols such as '<' and '>' so that they can be safely printed as such (the web browser will not erroneously render them as part of an HTML tag.)
For instance, the following:

```
<js rt.print('<b>Hello</b>'); /js>
```

Will output `&lt;b&gt;Hello&lt;b&gt;`.  Instead of printing it as bold <b>Hello</b>, a web browser will literally display it as `<b>Hello</b>`.

If you want to print without escaping, use [rt.unsafePrint()](#rtunsafeprint) instead (but please be careful and know what you're doing.)

List of escaped symbols:
 - `&` (ampersand): Escaped as `&amp;`.
 - `<` (less-than symbol): Escaped as `&lt;`.
 - `>` (greater-than symbol): Escaped as `&gt;`.
 - `"` (double quotation mark): Escaped as `&quot;`.
 - `\` (backslash): Escaped as `&#39;`.
 - `/` (slash): Escaped as `&#x2F;`.
 - \` (backtick): Escaped as `&#x60;`.
 - `=` (equals sign): Escaped as `&#x3D;`.

See also:
 - [rt.unsafePrint](#rtunsafeprint)
 - [rt.printJSON](#rtprintjson)
 
### rt.printJSON()

_Type_: Method.

_Syntax_: `rt.printJSON(value:JSON object)`

_Returns_: Undefined.

It sends a JSON object to the web client.  It will automatically set the `Content-Type` header entry to `application/json`, even if it was previously set to a different value.

Example:

```
rt.printJSON({
  randomNumber: `${Math.random()}`
});
```

A couple of things to take into account:

- If you invoke `rt.printJSON()` multiple times in your program, only the value of the last one will be sent to the web client (that is, the previous ones will be discarded.)  This is by design.  Otherwise, the resulting chain of JSON objects would not be valid JSON.

- Unless you now exactly what you're doing, make sure that your program does not modify `Content-Type` after invoking `rt.printJSON()`, especially if it modifies to something other than `application/json`. Otherwise, the resulting output response may be invalid and the web client might parse it incorrectly.

See also:
 - [rt.header](#rtheader)
 - [rt.print](#rtprint)
 - [rt.unsafePrint](#rtunsafeprint)
 
### rt.readFile()

_Type_: Method.

_Syntax_: `rt.readFile(path:String, encoding:String)`

_Returns_: RT Promise.

It reads the contents of a file specified by `path`.  `encoding` is optional, and `null ` by default.

Example:

```
rt.readFile('my_source.txt', 'utf-8')
  .rtOnSuccess((response) => { rt.print('File read successfully!'); console.log(response); })
  .rtOnError((err) => { rt.print(`There was an error: ${err}`); });
```

`path` can be either absolute or relative.

`encoding` indicates the file encoding (e.g. 'utf-8', usually good for text data).  If not specified, then raw bytes are assumed (good for binary files.)

Please see the notes on [rt.copyFile()](#rtcopyfile) for more information on file operations on relative paths, as well as the RT Promise type, and overwrite errors.

This method relies on node's `fs.readFile`.  Any strengths and limitations of the latter will apply to `rt.readFile` as well.

Notice that this version of JSCause will accept an `encoding` object that can be passed directly to `rt.readFile`.  This _will_ change. Future versions of JSCause will only accept a string.

See also:
 - [rt.copyFile](#rtcopyfile)
 - [rt.moveFile](#rtmovefile)
 - [rt.deleteFile](#rtdeletefile)
 - [rt.fileExists](#rtfileexists)
 - [rt.uploadedFiles](#rtuploadedfiles)
 - [rt.runAfter](#rtrunafter)
 - [Server configuration: `allowExeExtensionsInOpr`](#allowexeextensionsinopr)
 - [RT Promises](#rt-promises)
 
### rt.redirectTo()

_Type_: Method.

_Syntax_: `rt.redirectTo(redirectUrl:String[, delayInSeconds:Number])`

_Returns_: Undefined.

It instructs the web client to redirect to a different url via an HTTP 302 (Found) code.

Example:

```
rt.redirectTo('https://www.example.com', 5);
```

The redirection will happen after all the JSCP code is run.  This includes all pending callbacks, for example, from timers and file operations.

`delayInSeconds` is optional, and will instruct the web client to wait that many seconds before performing the actual redirection.  This time is in addition to the time the JSCP code is run, as previously stated.  Its value must be a number.  Otherwise, it will be ignored.

JSCause sets an HTTP 302 (found) status code to perform the redirect.  It also typically sets the `Location` HTTP header.  If delayInSeconds is provided and is valid, the `Refresh` header will be used instead.  This is not a standard header, although most modern browsers support it.

If more than one `rt.redirectTo` call is made, only the last one will be taken into account.

The value of the `redirectUrl` parameter should be of the string type.  Numbers can be used, but they will be converted to strings.  Anything else will be converted to its `.toString()` equivalent.  For instance, objects will be assumed `"[object Object]"`, arrays will be converted to a string with its values comma-separated (e.g. `"[1,2,3]"`).  You most likely don't want to do this, so make sure you pass a string.

See also:
 - [rt.resetRedirectTo](#rtresetredirectto)
 - [rt.header](#rtheader)
 - [rt.runAfter](#rtrunafter)
 - [rt.waitFor](#rtwaitfor)
 - [Redirection](#redirection)

### rt.requestMethod

_Type_: String.

It contains the type of the HTTP request.  The supported values are `get` and `post`.

The HTTP requests PUT and DELETE are not supported.  Therefore, if a web client attempts to make a request with them, JSCause will return an HTTP (method not allowed) 405 error.

See also:
 - [rt.contentType](#rtcontenttype)

### rt.resetRedirectTo()

_Type_: Method.

_Syntax_: `rt.resetRedirectTo()`

_Returns_: Undefined.

It instructs will cancel any redirections scheduled via `rt.redirectTo()`.  If there are no scheduled redirections, this method has no effect.

See also:
 - [rt.redirectTo](#rtredirectto)
 - [Redirection](#redirection)

### rt.runAfter()

_Type_: Method.

_Syntax_: `rt.runAfter(callback:Function)`

_Returns_: Undefined.

It will enqueue the call to `callback` after all `rt.waitFor()` callbacks are run.  `rt.runAfter()` is especially useful for file operations.

Both implicit and explicit `rt.waitFor()` callbacks are taken into account before running `rt.runAfter()` code.  Most JSCause methods that expect a callback (e.g. `rt.readFile()`) imply a `rt.waitFor()` call.

`rt.runAfter()` can be called more than once.  Each callback will be run sequentially (i.e., not concurrently) and in the order that were specified.

`rt.waitFor()` can be used inside `rt.runAfter()` callbacks.  Because the former takes precedence, any enqueued `rt.runAfter()` callbacks will again wait until those new `rt.waitFor()` callbacks are run.

See also:
 - [rt.waitFor](#rtwaitfor)
 - [Callbacks](#callbacks)

### rt.setCookie()

_Type_: Method.

_Syntax_: `rt.setCookie(name:String, value:String[, options:Object])`

_Returns_: Object.

It sets the value of a browser cookie. `options` is optional, and it contains additional instructions to create or update the cookie.

Example:

```
const cookieValue1 = rt.setCookie('my_cookie');
const cookieValue2 = rt.getCookie('my_cookie', { path: '/' });
```

`options` can be:

- `domain`

  e.g. `domain: 'example.com'`.

- `encodeURIValue`

  Optional. If `true`, then `value` will be URI-encoded.

  Default: `true`.

- `expires`

  e.g. `expires: new Date(Date.now() + 300000)`.
  
  If omitted, the cookie will last as long as the current browser session lasts).  If a value is passed, it must be a date object; otherwise a runtime exception will be thrown.

- `httpOnly`
   
  Optional. Boolean or equivalent truthy/falsy value.

  e.g. `httpOnly: true`.
   
  Default: `true`.

- `maxAge`
   
  Expiration in milliseconds from date of creation. This attribute is recommended over `expires`.  If `maxAge` is not a number, it will be ignored.  And if both `expires` and a valid `maxAge` are present, `expires` will be ignored.

  e.g. `maxAge: 300000` (in milliseconds.)

- `path`
   
  e.g. `path: '/example_path'`
   
  Default: `/`.

  Use `rt.getCurrentPath()` if you want to set the cookie for the request's (current) path (e.g. `my_folder/`).  Use `null` if you want to omit setting up a path completely.

- `sameSite`

  Optional.  However, if provided, it must be either `lax` or `strict`.

  e.g. `sameSite: "lax"`.

  Any value other than `"lax"` or `"strict"` will throw an exception.

- `secure`
   
  Optional. Boolean or equivalent truthy/falsy value.

  e.g. `secure: true`.

  An exception will be thrown if `secure` is `true` in non-HTTPS request.

`rt.setCookie` returns an object representing the result of the cookie setting operation.  Always check its value to make sure that everything went well.

If the operation succeeds, `rt.setCookie` will return `{ success: true }`.

If the operation fails, `rt.setCookie` will return `{ error: '<message>' }`, where `error` is a string explaining the issue.

The `error` messages could be one of the following (list not complete):

  - `Invalid cookie name. String expected.`

  - `Invalid expired value.  Date object expected.`

  - `Invalid sameSite value.  'strict' or 'lax' expected.`

  - `Cookie is secure but the connection is not HTTPS.  Will not send.`
  
The values of the `value` parameter, as well as those of the `domain` and `path` attributes of `option`, should be of the string type.  Numbers can be used, but they will be converted to strings.  Anything else will be converted to its `.toString()` equivalent.  For instance, objects will be assumed `"[object Object]"`, arrays will be converted to a string with its values comma-separated (e.g. `"[1,2,3]"`).

See also:
 - [rt.getCookie](#rtgetcookie)
 - [rt.deleteCookie](#rtdeletecookie)
 
### rt.unsafePrint()

_Type_: Method.

_Syntax_: `rt.unsafePrint(value:String)`

_Returns_: Undefined.

It prints to the response body.  A web browser will display `value` in the page it renders.

Example:

```
rt.unsafePrint('Hello, world');
```

Use `rt.unsafePrint` as many times as you need to render dynamic content to a page.

Unlike `rt.print`, `rt.unsafePrint` will not escape `value`, or alter it in any way.

Be sure to know all the risks, and that you know what you are doing when using this method.  Be cautious; avoid XSS attacks; never trust data coming from outside, like user input! If you need to print content that could be deemed unsafe, or expose your application to vulnerabilities (e.g. to print back user input), use `rt.print` instead.

See also:
 - [rt.print](#rtprint)
 - [rt.printJSON](#rtprintjson)
 
### rt.uploadedFiles

_Type_: Object.

This is an object containing the client request's POST multipart form-encoded file uploads.

Each form file element's name is represented as a key is `rt.uploadedFiles`.

For example, given the following form:

```
<form method="post" enctype="multipart/form-data">
  <input name="myFile" type="file" value="" />
  <input type="submit" name="uploadIt" value="Upload" />
</form>
```

The uploaded file would be available via `rt.uploadedFiles['myFile']`:

```
rt.print(`The uploaded file's name is: ${rt.uploadedFiles['myFile']}`);
```

Each value in `rt.uploadedFiles` is either an object containing the file's information, or an array of files, if the form accepts multiple files per field.

Examples:
```
  const oneFileName = rt.uploadedFiles['myFile'].name;
  const anotherFileName = rt.uploadedFiles['multipleFileField'][0].name;
  const yetAnotherFileName = rt.uploadedFiles['multipleFileField'][1].name;
```

A file object contains:

- `name`:  The file's name.  The name has been sanitized to avoid common XSS attacks.  The sanitization is based on the `sanitize-filename` NPM package.
- `unsafeName`:  The file's name without sanitization.  Use with caution.
- `path`:  The file's location in the filesystem after it has been uploaded.  This path is temporary (see below.)
- `size`:  The file's size in bytes.
- `type`:  The file's MIME type.
- `lastModifiedDate`:  the file's last modified date in the form of a Date object.

The file's `path` refers to a temporary location (specified by the `tempWorkDirectory` configuration value) and random file name (assigned by JSCause).  This random file name differs from the file name specified by the client during uploading, and thus is different from `.name` and `.unsafeName`.

If the application needs to preserve the uploaded files, it must either move it or copy to a different location.  Once the script is done (and all the `rt.waitFor()` callbacks completed), the files will be deleted from their temporary location.  The most performant way to preserve the files would be to move them asynchronously (in combination with `rt.waitFor()`, if needed.)

See also:
 - [rt.readFile](#rtreadfile)
 - [rt.moveFile](#rtmovefile)
 - [rt.copyFile](#rtcopyfile)
 - [rt.postParams](#rtpostparams)
 - [rt.requestMethod](#rtrequestmethod)
 - [rt.contentType](#rtcontenttype)

### rt.waitFor()

_Type_: Method.

_Syntax_: `rt.waitFor(callback:Function)`

_Returns_: A callback function.

It will signal JSCause that it must wait for `callback` to complete before sending a response back to the web client.  `rt.waitFor()` must usually be used in any circumstance in which a callback is expected.  For example, with `setTimeout()`.

Example:

Instead of doing this:
```
  setTimeout(() => { console.log('Send response after 2 seconds.'); }, 2000);
```

Do:
```
  setTimeout(rt.waitFor(() => { console.log('Send response after 2 seconds.'); }), 2000);
```

If a callback is not enclosed with `rt.waitFor()`, JSCause will not wait for it to complete, which may be undesirable if its operation is needed to return a correct response back to the web client.

`rt.waitFor()` will correctly rely the arguments it receives to its callback parameter:

```
  // Assuming that someAsyncOperation() requires a callback handling a "response" parameter.
  someAsyncOperation(rt.waitFor((response) => { console.log(`The response is: ${response}`); }));
```

`rt.waitFor()` can be nested.  For example:

```
  setTimeout(rt.waitFor(() => {
    console.log('2 seconds have passed.  Let\'s wait for 2 more seconds.');
    setTimeout(rt.waitFor(() => {
      console.log('Send response after 4 seconds.');
    }), 2000);
  }), 2000);
```

`rt` methods expecting a callback, such as file operations, must not use `rt.waitFor()`:

```
// This is incorrect:
rt.readFile('my_source.txt', 'utf-8')
  .rtOnSuccess(rt.waitFor(() => { rt.print('File read successfully!'); }));

// This is correct:
rt.readFile('my_source.txt', 'utf-8')
  .rtOnSuccess(() => { rt.print('File read successfully!'); });
```

If a runtime exception happens while a callback is still pending, JSCause will wait until the blocking operation completes.  When it does, it won't execute the code inside the callback:

```
  const timeInSeconds = 10;
  setTimeout(() => {
    console.log('JSCause will wait ${timeInSeconds} seconds for the setTimeout() to complete.');
    console.log('However, if a runtime error happened in that period, these two console outputs will never occur');
  }, timeInSeconds * 1000);
```

Remember that the [`requestTimeoutSecs`](#requesttimeoutsecs) (`requesttimeoutsecs`) server config value dictates how many seconds the JSCause will wait for a request to complete.

**Note:** `rt.waitFor()` can only be used when the callback will be used once only.  Instructions like `setInterval()` which run the callback more than one time will not work well with JSCause.  JSCause will only wait for the first callback to complete, then move on towards ending the request.  The following callbacks will continue to happen, but JSCause may have already sent a response.

There is a trick to work around this limitation, though.  Since `rt.waitFor()` returns a callback, then create such callback _outside_ of the block that will be called several times.  When the multiple-call operation ends, make sure to call that originally created callback.  Here's an example:

```
let t=1; // Let's increase this variable by 1 in an interval, until it reaches 10.

const appEnd = rt.waitFor(); // JSCause will not send a response until appEnd() is called.

const timerId = setInterval(() => { // Notice that we're enclosing this callback with an rt.waitFor() here.
  // We should be enclosing the following with a try/catch block, for more robustness.
  console.log(`Tick-tack... ${t}`);
  rt.print(`${t} `);
  if (t++ >= 10) {
    clearInterval(timerId);
    appEnd(); // Done counting.  Signal JSCause to stop waiting for us.
  }
}, 500);
```

Please note the following:  As stated in the comments in the example above, since the callback in not enclosed inside an `rt.watchFor()`, we should be using a `try/catch` error within it.  Otherwise, **any errors produced inside it will crash JSCause**, bringing your site down.  You'll need to manually restart JSCause if this happens.

See also:
 - [rt.runAfter](#rtrunafter)
 - [requestTimeoutSecs](#requesttimeoutsecs)
 - [Callbacks](#callbacks)


## FAQ and Troubleshooting JSCause

### Why doesn't JSCause complain when a certificate or key file is invalid?

You may have configured the site as HTTP, not HTTPS.  When the site is configured as HTTP, JSCause will ignore these files.

If the site is indeed HTTPS, then another reason could be that it's sharing the port with another, correctly configured HTTPS site.  In this case, the browser will alert the end users about the misconfiguration.

### `site.json` accepts a hostName that could already be used in another site's site.json.  Is this a bug?

This is fine as long as both sites use different ports.

### JSCause says a file does not exist, but I can see it in the file system.  Why?

It may be a broken symlink that doesn't point to a valid file anymore.  Also, check the spelling and the case-sensitivity.  For example, if your file is named `newPage.jscp`, make sure you're typing it as is in the web client; `NEWPAGE.JSCP`, `newpage.jscp`, `NewPage.jscp`, etc, won't work.

Also, for now, whenever you add a new file, or rename/move it, restart JSCause so it picks it up.  And make sure that it's stored inside the `website` directory.

### My question is not answered here.

Check out more [Frequently Asked Questions](https://jscause.org/faq.html) in our dedicated page.


## List of common errors and warnings reported by JSCause

Here is an excerpt of the most commonly encountered errors and warnings, as well as some obscure ones, and how to potentially address them.
Since this list is not completely exhaustive, it may not include errors that are fairly easy to fix (e.g. "Missing rootDirectoryName.")

### Configuration:

Message:
```
warning: Site configuration: Site <site name> has <file or console> logging <enabled | disabled> while the server has per-site file logging <disabled | enabled>. - Server configuration prevails.
```

Explanation:
There is a discrepancy between a global logging configuration, and a specific site logging configuration.  For example, in `jscause.conf` there might be a configuration indicating that all sites' file logging be enabled; and if there is one site indicating that its file logging be disabled, JSCause will emit this warning.  That way, JSCause lets the site owner know that logging will be enabled since that's the prevailing global configuration.


Message:
```
warning: Site configuration: Site <site name 1> is HTTPS, and would be sharing HTTPS port <port> with <site name 2>
```

Explanation:
Usually, different HTTPS sites use different ports.  So when two HTTPS sites have the same port in common, it may be a mistake.  It may not be, but JSCause warns about this just in case.  To avoid this warning, make sure that each HTTPS site has their own port.


Message:
```
warning: Site configuration: Site <site name> is HTTP, and is sharing HTTPS port <port> with <site name>
```

Explanation:
Usually, an HTTP site and an HTTPS site use different ports.  If the HTTP site uses port that was already assigned to an HTTPS site, it may be that its traffic will go through HTTPS and not HTTP.  Or that the HTTPS site masks all requests intended to the HTTP site.  To avoid this warning, make sure that both sites use different ports.


Message:
```
error: Invalid <file name> file format.
```

Explanation:
The file is not valid JSON or JscSON (which is JSON with comments allowed.)  Make sure that the file contents is correctly constructed (no extra commas, no typos, every key and value enclosed in double quotes, etc.)


Message:
```
error: Temporary work directory path <path> must be specified as relative to <site name>.
```

Explanation:
Temporary work directories must be inside its site's directory.  Therefore, any paths to define them must be relative to the site's path.  See the `tempWorkDirectory` entry in the [site.json section](#sitejson-configuring-your-websites-details) section for more information.


Message:
```
error: Site configuration: Site name <site name>: Missing rootdirectoryname.
```

Explanation:
Every site configuration must specify the directory it will reside on.  This is done in the `jscause.conf` file.  Read the `rootdirectoryname` entry in the [jscause.conf configuration](#jscauseconf-configuring-jscause-to-serve-your-website) section for more information.


Message:
```
error: Site configuration: Site name <site name>: <key name> cannot be empty.
```

Explanation:
This means that a specific configuration key has been assigned an empty string.  Certain configuration keys, like `rootdirectoryname`, not only needs to exist in the configuration file, but it also must hold a valid value.  Here is (an incomplete) list of keys that cannot be empty:
 - `rootdirectoryname`
 - `httppoweredbyheader`
 - `mimetype`
 - `tempworkdirectory`
 - `httpscertfile`
 - `httpskeyfile`
 - `jscpextensionrequired`
 - `directoryname` (logging.)
 
 Some keys will give a hint on which values they expect.  For example, if the error is related to `jscpextensionrequired`, JSCause will suggest to use `'never'`, `'optional'` or `'always'`.


Message:
```
error: Site configuration: Site name <site name>: <key name> expects a <type> value.
```

Explanation:
Make sure that the mentioned key configuration receives a value of the type indicated.  For example, directory names must be specified as strings; so using any other types, like numbers or objects, will trigger this error.


Message:
```
error: Site configuration:  Site name <site name>: Invalid <key name>.
```
Or:
```
error: Site configuration:  Site name <site name>: Invalid <key name> value.
```

Similar to `<key name> expects a <type> value.`  Make sure that the mentioned configuration key is assigned a value it expects.  This message may be emitted when configuring any of the following keys:
 - `rootdirectoryname`
 - `jscpextensionrequired`
 - `maxpayloadsizebytes`
 - `httppoweredbyheader`

Some keys will give a hint on which values they expect.  For example, if the error is related to `jscpextensionrequired`, JSCause will suggest to use `'never'`, `'optional'` or `'always'`.


Message:
```
error: Site configuration: Site name '<name>' is not unique.
```

Explanation:
Make sure every site configured in `jscause.conf` has a unique `name`.  For example:

```
{
  "sites": [
    {
      "name": "My Site", // First configured site.
      [etc]
    },
    {
      "name": "My Other Site", // This is OK.
      [etc]
    },
    {
      "name": "My Site", // This will yield an error since "My Site" is already being used.
      [etc]
    }
  ],
  [etc]
}
```


Message:
```
error: Site configuration: Missing site name.
```

Explanation:
Make sure every site configured in `jscause.conf` has a `name`.


Message:
```
error: Site configuration: Site name <site name> is missing port.
```

Explanation:
Make sure the site <site name> defined in `jscause.conf` has a `port`.


Message:
```
error: Site configuration: <site name>: Site root directory name <directory name> cannot be specified as an absolute path.  Directory name expected.
```

Explanation:
Site root directories are specified by the `rootDirectoryName` key in `jscause.conf` for every site defined.  Absolute paths, e.g. `/home/user/mySite`, are not allowed.  Read more about `rootDirectoryName` in the [JSCause configuration file section](#jscauseconf-configuring-jscause-to-serve-your-website).


Message:
```
error: Site configuration: Both sites <site name 1> and <site name 2> have the same root directory and port combination - '<path>', <port>
error: Site configuration: <site name 2> is attempting to use an already existing root directory and port combination - '<path>', <port>
```

Explanation:
No two sites can have the same root directory and the same port simultaneously.  Check your `jscause.conf` file and make sure that `<site name 1>` and `<site name 2>` either have different root directories or different ports.


Message:
```
error: Site configuration: Both sites <site name 1> and <site name 2> have the same host name and port combination - '<host name>', <port>
error: Site configuration: <site name 2>: <port> is already in use
```

Explanation:
No two sites can have the same host name and the same port simultaneously.  Check your `jscause.conf` file and make sure that `<site name 1>` and `<site name 2>` either have different host names or different ports.


Message:
```
error: Site configuration: Site <site name 2> is HTTPS, and would be sharing HTTP port <port> with <site name 1>
error: Site configuration: Site <site name 2> is attempting to use HTTPS in an already assigned HTTP port, <port>
```

Explanation:
JSCause detects using an HTTP port for HTTPS traffic as invalid.  Make sure that `<site name 2>` uses its own, secure HTTPS port.


Message:
```
error: Server <name> could not start listening on port <port>.
```

Explanation:
This error usually occurs when the port JSCause is trying to listen to a port that is busy or unavailable (EADDRINUSE).  Another program may already be using it.  JSCause will try and provide more information.


Message:
```
error: Site <site name>: An error occurred while attempting to start HTTP server.
```
Or:
```
error: Site <site name>: An error occurred while attempting to start HTTPS server.
```

Explanation:
It is rare when this error occurs, especially since other errors will be emitted for similar causes.  JSCause will provide more information at the time this error occurs.  Probable causes are, the port is already in use, or there is not enough memory to run JSCause. 


Message:
```
error: Cannot find <name> file.
```

Explanation:
JSCause cannot find a configuration file, typically `jscause.conf` or one of the `site.json` files.  If `jscause.conf` can't be found, make sure it is in the same directory as the JSCause executable, `jscause.js`.  If a `site.json` file can't be found, make sure it is inside the `configuration` subdirectory of your website's directory.  [Read more in the site.json section](#sitejson-configuring-your-websites-details).


Message:
```
error: <name> is a directory.
```

Explanation:
JSCause is either trying to read a configuration file, such as `jscause.conf` or `site.json`, but the name refers to a directory instead.  Make sure that `jscause.conf` and every `site.json` file is actually a file and not a directory.


Message:
```
error: Cannot load <name> file.
```

Explanation:
JSCause attempted to read an existing configuration file, such as `jscause.conf` or `site.json`, and was unable to do so.  Make sure that JSCause has all the necessary access and permissions to read these files.


Message:
```
error: Site: Parsing error, possibly internal.
```

Explanation:
JSCause may contain a bug.  If you get this error, [please let us know](#more-resources).


Message:
```
error: Site: Cannot find source file: <path>
```

Explanation:
A source file, be it a JSCP or JSCM one, could not be found or read.  Check that JSCause has read permissions to access it.


Message:
```
error: Site: Entry point is a directory: <path>
```

Explanation:
`<path>` looks like a file (for instance, it has a JSCP or JSCM file extension), but it is in reality a directory, so JSCause cannot read it. Normally, JSCause would just enter the directory and parse its contents, so it would be quite rare to get this error message.


Message:
```
error: Site: Cannot load source file: <path>
```

Explanation:
A source file, be it a JSCP or JSCM one, could not be read.  Check that JSCause has all the necessary permissions to read it.


Message:
```
error: Site: Compile error: <error> - Could not compile code for <path>.
```

Explanation:
JSCause could not compile your program.  It is possibly due to a syntax error.  JSCause will try to display as much information about the error as possible.


Message:
```
error: Site <site name>: Cannot read '<file name>' SSL key file.
```

Explanation:
The SSL key file provided is missing or not found in the directory JSCause was expecting.  Refer to the `httpsKeyFile` sub-section of [the site.json section](#sitejson-configuring-your-websites-details) for more information.


Message:
```
error: Site <site name>: Cannot read '<file name>' SSL cert file.
```

Explanation:
The SSL cert file provided is missing or not found in the directory JSCause was expecting.  Refer to the `httpscertfile` sub-section of [the site.json section](#sitejson-configuring-your-websites-details) for more information.


Message:
```
error: Cannot find link:
error: <path> --> <linkedFileName>
```
Or:
```
error: Site <site name>: Cannot find link:
error: <path> --> <linkedFileName>
```

Explanation:
JSCause failed to follow the `<path>` symlink (symbolic link) when processing the configuration files or the site contents.  Make sure that the file or directory it links to, `<linkedFileName>` is correct.


Message:
```
error: Site <site name>: Circular symbolic link reference:
error: <symlinkPath>
```

Explanation:
JSCause attempted to retrieve the file or directory indicated by the symlink, but it either refers to itself, or it goes to yet another symlink or symlinks that in the end refer to each other, indefinitely.  Make sure that `<symlinkpath>` leads to a valid file or directory.


Message:
```
error: Site <site name>: Too many files and/or directories (> 2048) in directory (circular reference?):
error: <path>
```
Or:
```
error: Too many directories processed so far (> 4096) (circular reference?):
error: <path>
```
Or:
```
error: Too many directories left to process (> 1024) (circular reference?):
error: <path>
```

Explanation:
Just like the error indicates, JSCause found too many files and/or subdirectories inside of `<path>`.  Make sure that the number of files and directories are below the limit.  If there are fewer than that, and JSCause still shows the error, it may be a malformed symlink or symlinks that refer to each other indefinitely.  If there are symlinks inside of `<path>`, make sure that they all refer to valid files or directories.

### Related to sites, content and run-time:

Message:
```
warning: Site: <html/> keyword found in the middle of code.  Did you mean to put it in the beginning of an HTML section?
```

Explanation:
The `<html/>` keyword is intended to be placed [at the top of the file](#jscp-with-html-only).  JSCause will ignore it if it's anywhere else, but will emit this warning just in case it was not placed at the top, be it by accident or on purpose.


Message:
```
warning: Site <site name>: <error4xx/error5xx file> detected in <path> subdirectory. Only error files in the root directory will be used to display custom errors.
```

Explanation:
You placed an error file, such as `error4xx.html` or `error4xx.jscp` in a site subdirectory.  JSCause will not use them in order to display custom 4XX (e.g. 404) or 5XX (e.g. 500) errors.  For this, it will only take into account the ones placed in the root of the site.  So, if an error 500 happens when trying to access `/mypath/some_resource.jscp`, and there are two custom error files, one located at `/mypath/error5xx.jscp` and another located at `/error5xx.jscp`, JSCause will use the latter in order to display the custom error.  More info in the [custom errors](#custom-4xx-and-5xx-errors) section.


Message:
```
warning: Could not delete unhandled uploaded file: <file name>
(CONT) On the file system as: <path>
```

Explanation:
JSCause failed deleting an uploaded file.  It may not have permissions to do so, or there is a problem with the file system.  If the file still exists, it will be located at `<path>`.  You may want to manually delete it.  Note that the file name specified in `<file name>` will most likely differ from `<path>`.


Message:
```
warning: Site <site name>: attempted to process already sent response (retriggered timer?)
```

Explanation:
Your program may have a retriggering timer (set up via `setInterval()` or a retriggering `setTimeout()`) with a callback enclosed in an `rt.waitFor()`.  The original request has been handled, and JSCause has moved on to the next request.  When the phantom timer from the previous request gets triggered again, its callback is invoked, and JSCause attempts to "end this request."  But because the request has already been ended, there is nothing left for JSCause to do.  Having said that, this phantom timer will live on (causing a memory leak!), therefore JSCause emits the warning.


Message:
```
error: Could not rename unhandled uploaded file: <file name>
(CONT) Renaming from: <old path>
(CONT) Renaming to: <new path>
```

Explanation:
This occurs right after uploading a file to a site.  When a file is uploaded, it is first stored in a temporary location.  When the upload completes, JSCause moves it to a different location so that the JSCP program can access it.  This error indicates that the file moving failed.  It's probably because the target directory is read-only, or the disk is full/became unavailable.


Message:
```
error: Site: <name>: Application error when processing <file name>.
```

Explanation:
This occurs right after JSCause finishes running a JSCP program which received a request with a file upload.  If the JSCP program ignores the upload, JSCause will safely delete it after it sends a response back to the client.  This error indicates that the deletion failed.  It's probably related to permissions, or a disk-related issue.


Message:
```
error: Form upload related error.
```

Explanation:
An error occurred while receiving the contents of an HTML form.  Usually this error is followed by more details about it, for example, an interrupted connection.


Message:
```
error: Site: <name>: Runtime error on file <file name>: <error description>
```

Explanation:
An error occurred during the execution of the JSCP program in the specified file.  JSCause will provide more details, including the type of error and the line number.


Message:
```
error: Site <site name>: Cannot serve <path> file.
```

Explanation:
JSCause attempted to serve a requested static file, but it was no longer available.  It was probably deleted or unavailable after JSCause was launched.  If JSCause is not configured to watch for changes in the file system (note: this feature is yet to be implemented), make sure that all files that are present when JSCause launches, keep being present throughout the run time of the application.


Message:
```
error: Module name and path <module path> must be specified as relative.
```

Explanation:
When importing a module via `rt.module(<module path>)`, make sure that `<module path>` is a path relative to its site's directory.  Absolute paths, for example `/home/users/misc/` are not allowed.  See the [JSCM files section](#jscause-modules-jscm-files) section for more information.


Message:
```
error: Request related error.
```

Explanation:
An error occured while receiving or processing a client request.  Usually this error is followed by more details about it.  For example, the cause could be that the connection was interrupted before the request was completed.


### HTTP errors:

Message:
```
HTTP error 413: Payload exceeded limit of <amount> bytes
```

Explanation:
The request includes a POST payload (e.g. a form upload) that exceeds the size limits configured in JSCause.  The limit is determined by `maxPayloadSizeBytes` in the website configuration.  See the `maxPayloadSizeBytes` entry in the [site.json section](#sitejson-configuring-your-websites-details) section for more information.


Message:
```
HTTP error 408: Timeout exceeded limit of <amount> seconds
```

Explanation:
The request took too long to be handled.  See the [`requestTimeoutSecs`](#requesttimeoutsecs) (`requesttimeoutsecs`) server configuration value for more information.


Message:
```
HTTP error 403: Uploading is forbidden
```

Explanation:
The website has the `canUpload` configuration value set to `false`.  See the `canUpload` entry in the [site.json section](#sitejson-configuring-your-websites-details) section for more information.


### Non-logged errors and warnings (terminal only):

Message:
```
Unrecognized command line switch. Server not started.
```

Explanation:
You used a command line switch that JSCause didn't recognize. At the time of writing this manual, only the [`runtests`](#testing-jscauses-integrity) command line switch is valid.  For example, this is valid:

```
node jscause.js runtests
```

This is invalid:
```
node jscause.js --not-recognized
```

Message:
```
WARNING! Log message queue full.  No entries are being logged to file.  Check permissions, storage space and/or filesystem health.
```

Explanation:
JSCause has too many log entries pending to be written do disk.  This could be due to a slow-responding storage media, a change of disk permissions, or because the disk is full.  10 MiB of pending logs will trigger this warning.


Message:
```
WARNING!  Reached the amount of log termination retries due to pending callbacks (30).  Giving up.
```

Explanation:
While JSCause is terminating, it's attempting to complete some tasks related to logging.  For instance, writing pending logs to disk or compressing old logs.  If these operations take too long (more than 30 seconds), JSCause will issue this warning and immediately exit.

### Critical errors:

Message:
```
CRITICAL: Cannot load <vendor file path> file.
CRITICAL: Failed to load vendor module <vendor file path>. The JSCause installation might be corrupted.
CRITICAL: One or more vendor modules did not load.  JSCause will now terminate.
```

Explanation:
JSCause failed to load at least one of its dependencies when starting.  The dependencies reside under the `/jscvendor` subdirectory (alongside the `/sites` subdirectory.)  Make sure `/jscvendor` can be read by JSCause.  If the problem persists, reinstall JSCause.


Message:
```
CRITICAL: Could not compile vendor module <vendor file path>.
CRITICAL: Failed to load vendor module <vendor file path>. The JSCause installation might be corrupted.
CRITICAL: One or more vendor modules did not load.  JSCause will now terminate.
```

Explanation:
JSCause failed to load at least one of its dependencies when starting.  The dependencies reside under the `/jscvendor` subdirectory (alongside the `/sites` subdirectory.)  For some reason, some dependencies could not be initialized.  This might be an indication of a corrupted installation.  Reinstall JSCause.


Message:
```
CRITICAL: Cannot load <file path> vendor template file.
CRITICAL: Failed to load vendor module <vendor file path>. The JSCause installation might be corrupted.
CRITICAL: One or more vendor modules did not load.  JSCause will now terminate.
```

Explanation:
JSCause cannot find a critical component required to load dependencies.  This might be an indication of a corrupted installation.  Try to recover and restore the file indicated by <file path>.  It may have been accidentally deleted, for example.  If the problem persists, reinstall JSCause.


## Testing JSCause's integrity

JSCause can run a battery of self-tests in order to ensure that it can perform all theits functionality in a reliable way.  As a user, you don't typically need to do this.  But this is useful when you upgrade to a more recent version of NodeJS, for example.

To run the self-tests, run the following from your command line:

```
node jscause.js runtests
```

JSCause should report that all tests passed.  If it didn't, please contact us.

Note:  Some JSCause installations may not have the self-tests available.


## More resources

Please visit our [Github repository](https://github.com/eighthjouster/jscause).


## Credits

JSCause uses and wants to give thanks to: [Node Formidable](https://github.com/felixge/node-formidable), [sanitize-filename](https://github.com/parshap/node-sanitize-filename) and 
the [Cookies NodeJS module](https://github.com/pillarjs/cookies).


## License

Copyright 2020 - Rafael A. Pacheco-Palencia (@eighthjouster)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
