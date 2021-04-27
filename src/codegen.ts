/*
 * Copyright (c) 2021 Cynthia K. Rey, All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { Builder } from 'xml2js'

const codegen = {
  dom: {
    dev (xml: any): string {
      const symbol = new Builder({ headless: true, renderOpts: { pretty: false } }).buildObject({ symbol: xml.svg })
      const html = JSON.stringify(`${symbol}<use href='#${xml.svg.$.id}'/>`)

      return `
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('viewBox', '${xml.svg.$.viewBox}')
        svg.innerHTML = ${html}
        export default svg
      `
    },
    prod (viewBox: string, symbol: string): string {
      return `
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use')
        svg.setAttribute('viewBox', '${viewBox}')
        use.setAttribute('href', ${symbol})
        svg.appendChild(use)
        export default svg
      `
    }
  },
  react: {
    dev (xml: any): string {
      const symbol = new Builder({ headless: true, renderOpts: { pretty: false } }).buildObject({ symbol: xml.svg })
      const html = JSON.stringify(`${symbol}<use href='#${xml.svg.$.id}'/>`)

      return `
        import { createElement } from 'react'
        export default () => createElement('svg', { viewBox: '${xml.svg.$.viewBox}', dangerouslySetInnerHTML: { __html: ${html} } })
      `
    },
    prod (viewBox: string, symbol: string): string {
      return `
        import { createElement } from 'react'
        export default () => createElement('svg', { viewBox: '${viewBox}' }, createElement('use', { href: ${symbol} }))
      `
    }
  },
  preact: {
    dev: (xml: any) => codegen.react.dev(xml).replace(/createElement/g, 'h').replace(/react/g, 'preact'),
    prod: (viewBox: string, symbol: string) => codegen.react.prod(viewBox, symbol).replace(/createElement/g, 'h').replace(/react/g, 'preact')
  }
}

export default codegen
