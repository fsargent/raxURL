raxURL
======

URL Shortner for rax.io

Canonical Information in https://github.rackspace.com/feli4039/raxURL/wiki

## Installation

Most everything is contained in the package.json. Run:

    npm install

Grab default settings:

    cp settings.example.js settings.js

#### One Exception: node-qr

To use node-qr, you will first need to install the libqrencode C library.

For Mac OS X (assumed MacPorts installed)

    port install qrencode

For Ubuntu Linux

    apt-get install qrencode

#### Run

    npm start
