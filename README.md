# postcss-inline-variables [![Build Status][https://travis-ci.org/nelsonpecora/postcss-inline-variables.svg]][https://travis-ci.org/nelsonpecora/postcss-inline-variables]

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
  .process(styles)
  .then((result) => {
    console.log(result.css); // → styles that use the variables!
  })
  .catch((e) => {
    console.log(e.message); // → throws error with the variable name if it has no default value!
  });
```

_Note:_ It might be useful to use [postcss-get-sass-variables](https://github.com/nelsonpecora/postcss-get-sass-variables) to extract them from other css files, if you organize your styleguides purely in css.

# Options

## requiredPrefix

By default, this will error if a variable fallback isn't defined (similar to SASS). If you want to be even more strict, you can make it error if the variable isn't prefixed with the file name / folder name it's in. This is useful when building component-based style systems.

For example, imagine you have a `components/foo.css` (that styles the `foo` component):

```css
.title {
  background-color: $color or #fff; /* will error */
  color: $foo-color or #000; /* will pass */
}
```

The `$color` variable will throw an error if you set `requiredPrefix: 'file'`:

```js
postcss([inlineVariables(myVariables, { requiredPrefix: 'file' })])
  .process(styles)
  .catch((e) => {
    console.log(e.message); // → 'No prefix for $color in components/foo.css! Should it be $foo-color?'
  });
```

The same behavior can be used at the folder level, e.g. `components/foo/styles.css`:

```js
postcss([inlineVariables(myVariables, { requiredPrefix: 'folder' })])
  .process(styles)
  .catch((e) => {
    console.log(e.message); // → 'No prefix for $color in components/foo/styles.css! Should it be $foo-color?'
  });
```

These errors will suggest variable names, to make it easier to diagnose issues with your styles.
