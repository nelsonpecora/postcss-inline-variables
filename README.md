# postcss-inline-variables [![Build Status](https://travis-ci.org/nelsonpecora/postcss-inline-variables.svg?branch=master)](https://travis-ci.org/nelsonpecora/postcss-inline-variables)

[![Greenkeeper badge](https://badges.greenkeeper.io/nelsonpecora/postcss-inline-variables.svg)](https://greenkeeper.io/)

[PostCSS](https://github.com/postcss/postcss) plugin for Sass-like variables with inline defaults

# Installation

```
npm install --save-dev postcss-inline-variables
```

# Usage

Write defaults inline or define them at the top of your file:

```css
$background-color: red !default; /* sass-like syntax, tells variable it may be overwritten */

.title {
  background-color: $background-color;
  color: $color or green; /* inline default */
  flex-flow: [$direction or column] [$wrap or wrap]; /* use [brackets] if there's more than one variable in a rule */
}
```

Then define your variables in an object, and pass it in when compiling your styles:

```js
const inlineVariables = require('postcss-inline-variables'),
  myVariables = {
    'background-color': '#fff',
    color: '#000'
    // direction and wrap aren't defined, so the defaults will be used
  };

postcss([inlineVariables(myVariables)])
  .process(css)
  .then((result) => {
    console.log(result.css); // → styles that use the variables!
  })
  .catch((e) => {
    console.log(e.message); // → throws error with the variable name if it has no default value!
  });
```

_Note:_ It might be useful to use [postcss-get-sass-variables](https://github.com/nelsonpecora/postcss-get-sass-variables) to extract them from other css files, if you organize your styleguides purely in css.

# Options

## requirePrefix

By default, this will error if a variable fallback isn't defined (similar to SASS). If you want to be even more strict, you can make it error if the variable isn't prefixed with the file name / folder name it's in. This is useful when building component-based style systems.

For example, imagine you have a `components/foo.css` (that styles the `foo` component):

```css
.title {
  background-color: $color or #fff; /* will error */
  color: $foo-color or #000; /* will pass */
}
```

The `$color` variable will throw an error if you set `requirePrefix: 'file'`:

```js
postcss([inlineVariables(myVariables, { requirePrefix: 'file' })])
  .process(css)
  .catch((e) => {
    console.log(e.message); // → 'No prefix for $color in components/foo.css! Should it be $foo-color?'
  });
```

The same behavior can be used at the folder level, e.g. `components/foo/styles.css`:

```js
postcss([inlineVariables(myVariables, { requirePrefix: 'folder' })])
  .process(css)
  .catch((e) => {
    console.log(e.message); // → 'No prefix for $color in components/foo/styles.css! Should it be $foo-color?'
  });
```

These errors will suggest variable names, to make it easier to diagnose issues with your styles.

## requireDefault

Besides the inline `$variable or default` definitions, you can use SASS's `!default` syntax to write hoisted variable definitions in your files:

```css
$color: #000 !default;

.title {
  color: $color; /* will be #000 if $color isn't passed in */
}
```

This is handy for large css files, but allows you to _overwrite the passed-in variables_ if you don't specify `!default`, e.g. if you simply write `$color: #000`. This maintains the intuitive behavior from SASS, but might be a gotcha for developers who aren't used to it. If you don't want to allow this, use the `requireDefault` option.

For example, `$color: #000` will throw an error if you set `requireDefault: 'flag'`:

```js
postcss([inlineVariables(myVariables, { requireDefault: 'flag' })])
  .process(css)
  .catch((e) => {
    console.log(e.message); // → 'No !default flag set for $color!'
  });
```
This can also be used to disable hoisted variable definitions entirely, requiring developers to write all of their variables inline in the form of `$var or value`:

```js
postcss([inlineVariables(myVariables, { requireDefault: 'inline' })])
  .process(css)
  .catch((e) => {
    console.log(e.message); // → 'Illegal hoisted variable $color! Use "$color or value"'
  });
```

Alternatively, you can specify the exact opposite behavior, requiring _all_ variables to be hoisted (and preventing _all_ inline defaults):

```js
postcss([inlineVariables(myVariables, { requireDefault: 'hoisted' })])
  .process(css)
  .catch((e) => {
    console.log(e.message); // → 'Illegal inline variable $color! Use "$color: value !default"'
  });
```
