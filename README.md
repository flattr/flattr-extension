# Flattr extension

[![Build Status][circleci-image]][circleci-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]

Monetize your content effortlessly. https://flattr.com

## Development

Clone this repo first, then run `npm install`.  This will install dependencies.

### Bundling

This extension uses [`browserify`](http://browserify.org) in order to utilize
[`npm`](https://www.npmjs.com) modules.

Use `npm run bundle` to bundle the files necessary to run this extension in to
the `devenv` subdirectory of the directory where this repository is cloned to.

### Debug

Use `npm run debug` to bundle the extension with source maps for local testing.

#### Chrome

To use the extension created above in Chrome, follow these steps:

1) Open Chrome.
2) Go to `chrome://extensions/`.
3) Select the check box labeled **Developer mode** in the upper-right corner.
4) Click **Load unpacked extension**.
5) Select the `devenv` subdirectory of the directory where you cloned this repository.

#### Firefox

To use the extension created above in Firefox, follow these steps:

1) Open Firefox.
2) Go to `about:debugging#addons`.
3) Click **Load Temporary Add-on**.
4) Select the `devenv` subdirectory of the directory where you cloned this repository.

### Watching

Use `npm run watch` to watch for changes to the extension and
automatically bundle the changes to `devenv` directory.

### Building

When building this extension, it is first bundled, then a `.zip` file
is created.

Use `npm run build` to build the extension. You can specify which build to
create by supplying the `FP_BUILD_TYPE` environment variable
(see [Deployment](#deployment)).

### Building for Firefox

The extension works as-is on recent versions of Firefox. However, in order to
have it signed on addons.mozilla.org, a special build is currently needed. You
can create it by setting the `FP_BUILD_TARGET` environment variable, i.e.:

`FP_BUILD_TARGET=gecko npm run build`

### Generating icons

Whenever there are any changes to icons (e.g. colors or changes to the SVG), it is necessary to run `npm run icons` to generate the according PNG files for the extension and replace the existing icons.

### Linting

Use `npm run lint` to review the code for potential errors.

### Testing

Use `npm test` to run tests:

- Use `--exclude foo` to run all tests except from files with "foo" in their name.
- Use `--include foo` to run only tests from files with "foo" in their name.
- Use `--nobuilds` to run only tests that don't require builds.

### Clean build directory

Use `npm run clean` to clean up the build directory.

## Deployment

Use `npm run upload` to build the extension and deploy it to the
Chrome Web Store or addons.mozilla.org. You can control where the extension gets
deployed by setting the following environment variables:

- `FP_BUILD_TARGET`
  - `chromium` (default)
  - `gecko`

- `FP_BUILD_TYPE`
  - `development` (default)
  - `staging`
  - `release`
  - `usertesting`

### Deploying to the Chrome Web Store

You can deploy to the Chrome Web Store by setting `FP_BUILD_TARGET` to
`chromium`. In addition, you need to set the following environment variables:

- `FP_CWS_[TYPE]_CLIENT_ID` (replace `[TYPE]` with build type)
- `FP_CWS_[TYPE]_CLIENT_SECRET` (replace `[TYPE]` with build type)
- `FP_CWS_[TYPE]_REFRESH_TOKEN` (replace `[TYPE]` with build type)
- `FP_CWS_[TYPE]_EXTENSION_ID` (replace `[TYPE]` with build type)

### Deploying to addons.mozilla.org

You can deploy to addons.mozilla.org by setting `FP_BUILD_TARGET` to `gecko`.
In addition, you need to set the following environment variables:

- `FP_AMO_KEY`
- `FP_AMO_SECRET`
- `FP_AMO_ID`
- `FP_FX_DOWNLOAD_BASE_URL`
- `FP_FX_UPLOAD_SERVER`
- `FP_FX_UPLOAD_PATH`

[circleci-url]: https://circleci.com/gh/flattr/flattr-extension
[circleci-image]: https://circleci.com/gh/flattr/flattr-extension.png

[snyk-url]: https://snyk.io/test/github/flattr/flattr-extension
[snyk-image]: https://snyk.io/test/github/flattr/flattr-extension/badge.svg
