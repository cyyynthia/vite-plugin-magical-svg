# Magical SVG 🪄
[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/G2G71TSDF)<br>
[![License](https://img.shields.io/github/license/cyyynthia/vite-plugin-magical-svg.svg?style=flat-square)](https://github.com/cyyynthia/vite-plugin-magical-svg/blob/mistress/LICENSE)

An all-in-one [Vite](https://vitejs.dev/) plugin that magically makes working with SVGs and bundling them a breeze.

Inspired by a [tweet](https://twitter.com/_developit/status/1382838799420514317) from Preact's creator Jason Miller,
I've been looking at plugins that would let me work with SVGs, as I myself did the error of embedding SVGs as React
components. Shame!

What I wanted was a plugin that would let me import SVGs, and make a sprite of symbols and give me the identifier I
can use in `<use href='???'/>`. And I couldn't find any decent plugin that makes working with them easy. They all had
a problem that made using them a pain, or outright impractical. Here's a list of the problems I encountered:

 - References in SVG files are never processed. `<image href='...'/>` would never get processed and the referenced asset is ignored.
 - The generated sprite include ALL icons, even unused ones. Just picking the right icons from a pack isn't an option.
 - There are no options to output to a separate file and reference it. Inlining is apparently the only way.
 - Selectively tell to not process a specific SVG isn't possible (e.g.: A logo, or SVGs that break when encapsulated in a symbol).
 - You can't make different sprites, it's only all-in-one.

So I decided to make my own tool to solve all this problems. Introducing: the Magical SVG plugin. 🪄

## Install
The plugin isn't ready yet for use. Soon!
<!--
```
pnpm i vite-plugin-magical-svg
yarn add vite-plugin-magical-svg
npm i vite-plugin-magical-svg
```
-->
