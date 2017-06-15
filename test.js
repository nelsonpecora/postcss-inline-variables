'use strict';
const postcss = require('postcss'),
  _ = require('lodash'),
  lib = require('./');

function run(input, output, variables, options) {
  return postcss([lib(variables, options)]).process(input, { from: '/foo/bar.css', to: '/foo/bar.css' })
    .then((result) => {
      expect(result.css).to.equal(output);
      expect(result.warnings().length).to.equal(0);
    });
}

function runWithErrors(input, error, variables, options) {
  return postcss([lib(variables, options)]).process(input, { from: '/foo/bar.css', to: '/foo/bar.css' })
    .then(() => {
      /* istanbul ignore next */
      throw new Error('No errors caught!');
    })
    .catch((e) => {
      expect(e.message).to.eql(error);
    });
}

describe('inline-variables', () => {
  it('errors if no default value for a variable', () => {
    return runWithErrors('a { color: $color; }', 'inline-variables: /foo/bar.css:1:12: $color not defined!');
  });

  it('passes through non-variable styles', () => {
    return run('a { content: "$1"; }', 'a { content: "$1"; }');
  });

  // requirePrefix

  it('errors if unprefixed hoisted default when file prefix is required', () => {
    return runWithErrors('$color: red !default;', 'inline-variables: /foo/bar.css:1:1: No prefix for $color! Should it be $bar-color?', {}, { requirePrefix: 'file' });
  });

  it('errors if unprefixed hoisted default when folder prefix is required', () => {
    return runWithErrors('$color: red !default;', 'inline-variables: /foo/bar.css:1:1: No prefix for $color! Should it be $foo-color?', {}, { requirePrefix: 'folder' });
  });

  it('errors if unprefixed hoisted variable when file prefix is required', () => {
    return runWithErrors('$color: red;', 'inline-variables: /foo/bar.css:1:1: No prefix for $color! Should it be $bar-color?', {}, { requirePrefix: 'file' });
  });

  it('errors if unprefixed hoisted variable when folder prefix is required', () => {
    return runWithErrors('$color: red;', 'inline-variables: /foo/bar.css:1:1: No prefix for $color! Should it be $foo-color?', {}, { requirePrefix: 'folder' });
  });

  it('errors if unprefixed inline default when file prefix is required', () => {
    return runWithErrors('a { color: $color or red; }', 'inline-variables: /foo/bar.css:1:12: No prefix for $color! Should it be $bar-color?', {}, { requirePrefix: 'file' });
  });

  it('errors if unprefixed inline default when folder prefix is required', () => {
    return runWithErrors('a { color: $color or red; }', 'inline-variables: /foo/bar.css:1:12: No prefix for $color! Should it be $foo-color?', {}, { requirePrefix: 'folder' });
  });

  it('does not error if prefixed hoisted variable when file prefix is required', () => {
    return run('$bar-color: red;', '', {}, { requirePrefix: 'file' });
  });

  it('does not error if prefixed hoisted variable when folder prefix is required', () => {
    return run('$foo-color: red;', '', {}, { requirePrefix: 'folder' });
  });

  it('does not error if prefixed inline variable when file prefix is required', () => {
    return run('a { color: $bar-color or red; }', 'a { color: red; }', {}, { requirePrefix: 'file' });
  });

  it('does not error if prefixed inline variable when folder prefix is required', () => {
    return run('a { color: $foo-color or red; }', 'a { color: red; }', {}, { requirePrefix: 'folder' });
  });

  // requireDefault

  it('errors if unflagged hoisted variable when !default flag is required', () => {
    return runWithErrors('$color: red;', 'inline-variables: /foo/bar.css:1:1: No !default flag set for $color!', {}, { requireDefault: 'flag' });
  });

  it('errors if hoisted default when hoisting is disabled', () => {
    return runWithErrors('$color: red !default;', 'inline-variables: /foo/bar.css:1:1: Illegal hoisted variable $color! Use "$color or value"', {}, { requireDefault: 'inline' });
  });

  it('errors if hoisted variable when hoisting is disabled', () => {
    return runWithErrors('$color: red;', 'inline-variables: /foo/bar.css:1:1: Illegal hoisted variable $color! Use "$color or value"', {}, { requireDefault: 'inline' });
  });

  it('errors if inline default when hoisting is required', () => {
    return runWithErrors('a { color: $color or red; }', 'inline-variables: /foo/bar.css:1:12: Illegal inline variable $color! Use "$color: value !default"', {}, { requireDefault: 'hoisted' });
  });

  it('errors if inline grouped default when hoisting is required', () => {
    return runWithErrors('a { border: [$width or 1px] solid [$color or black]; }', 'inline-variables: /foo/bar.css:1:14: Illegal inline variable $width! Use "$width: value !default"', {}, { requireDefault: 'hoisted' });
  });

  // variable replacement

  it('uses inline defaults', () => {
    return run('a { color: $color or red; }', 'a { color: red; }');
  });

  it('overwrites inline defaults', () => {
    return run('a { color: $color or red; }', 'a { color: blue; }', { color: 'blue' });
  });

  it('uses grouped inline defaults', () => {
    return run('a { border: [$width or 1px] solid [$color or black]; }', 'a { border: 1px solid black; }');
  });

  it('overwrites grouped inline defaults', () => {
    return run('a { border: [$width or 1px] solid [$color or black]; }', 'a { border: 2px solid green; }', { width: '2px', color: 'green' });
  });

  it('uses hoisted defaults', () => {
    return run('$color: red;\na { color: $color; }', 'a { color: red; }');
  });

  it('overwrites hoisted defaults', () => {
    return run('$color: red !default;\na { color: $color; }', 'a { color: blue; }', { color: 'blue' });
  });

  it('does not overwrite hoisted variable', () => {
    return run('$color: red;\na { color: $color; }', 'a { color: red; }', { color: 'blue' });
  });

  it('uses grouped hoisted defaults', () => {
    return run('$width: 1px;\na { border: $width solid [$color or black]; }', 'a { border: 1px solid black; }');
  });

  it('overwrites grouped hoisted defaults', () => {
    return run('$width: 1px !default;\na { border: $width solid [$color or black]; }', 'a { border: 2px solid green; }', { width: '2px', color: 'green' });
  });

  it('does not overwrite grouped hoisted variable', () => {
    return run('$width: 1px;\na { border: $width solid [$color or black]; }', 'a { border: 1px solid green; }', { width: '2px', color: 'green' });
  });

  // some fun edge cases

  it('replaces variables in calc statements', () => {
    return run('a { width: calc(100% - $width); }', 'a { width: calc(100% - 50px); }', { width: '50px' });
  });

  it('allows inline defaults in calc statements', () => {
    return run('a { width: calc(100% - [$width or 50px]); }', 'a { width: calc(100% - 50px); }');
  });
});
