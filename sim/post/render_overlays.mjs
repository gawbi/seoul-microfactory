// 장면별 투명 오버레이 PNG와 마지막 카드 PNG를 렌더링한다.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const [, , specPath, outDir, htmlDir] = process.argv
const scenes = JSON.parse(fs.readFileSync(specPath, 'utf8'))
fs.mkdirSync(outDir, { recursive: true })
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] })
const p = await b.newPage()
await p.setViewport({ width: 1600, height: 900 })
const here = htmlDir.endsWith('/') ? htmlDir : htmlDir + '/'
for (const s of scenes) {
  const hash = new URLSearchParams(s).toString()
  await p.goto(`file://${here}overlay.html#${hash}`, { waitUntil: 'load' })
  await p.reload({ waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${outDir}/ov_${s.key}.png`, omitBackground: true })
}
for (const k of ['arch', 'title']) {
  await p.goto(`file://${here}final.html#${k}`, { waitUntil: 'load' })
  await p.reload({ waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${outDir}/final_${k}.png` })
}
await b.close()
console.log('overlays done')
