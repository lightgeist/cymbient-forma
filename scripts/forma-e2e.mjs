import {chromium} from 'playwright-core'
import {mkdir,writeFile} from 'node:fs/promises'
const output='docs/evidence'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true,
  args:['--no-sandbox']
})
const ctx=await browser.newContext({
  viewport:{width:1440,height:900},
  deviceScaleFactor:1,
  httpCredentials:{username:'team',password:'forma-local-test-credential-do-not-use'},
  recordVideo:{dir:output,size:{width:1440,height:900}}
})
const page=await ctx.newPage()
const errors=[]
page.on('pageerror',err=>errors.push('PAGE:'+err.message))
page.on('console',msg=>{if(msg.type()==='error') errors.push('CONSOLE:'+msg.text())})
page.on('response',resp=>{if(resp.status()>=500) errors.push('HTTP:'+resp.status()+' '+resp.url().slice(0,180))})
const log=[]
const snap=async name=>{await page.screenshot({path:output+'/'+name+'.png',fullPage:true});log.push(name+':'+(await page.locator('body').innerText()).slice(0,1200).replace(/\n/g,' | '))}
try {
await page.goto('http://127.0.0.1:4184/app',{waitUntil:'domcontentloaded',timeout:20000})
await page.waitForTimeout(2000)
await snap('forma-onboarding')
for(let i=0;i<7;i++){
 const dialog=page.getByRole('dialog')
 if(await dialog.count()===0)break
 const next=dialog.getByRole('button',{name:/continue|next|finish|start|done|get started/i})
 if(await next.count()>0){await next.first().click();await page.waitForTimeout(350);continue}
 const all=await dialog.getByRole('button').allTextContents()
 log.push('DIALOG BUTTONS:'+all.join(', '))
 break
}
await snap('forma-dashboard')
const buttons=await page.getByRole('button').allTextContents()
const links=await page.getByRole('link').allTextContents()
log.push('BUTTONS:'+buttons.slice(0,50).join(' | '))
log.push('LINKS:'+links.slice(0,50).join(' | '))
const newFile=page.getByText('New file',{exact:true})
if(await newFile.count()){
 await newFile.first().click()
 await page.waitForTimeout(1500)
 await snap('forma-new-file')
}
await writeFile(output+'/smoke.json',JSON.stringify({url:page.url(),log,errors},null,2))
} catch(e) {
 log.push('FATAL:'+String(e))
 await writeFile(output+'/smoke.json',JSON.stringify({url:page.url(),log,errors},null,2))
}
await ctx.close()
await browser.close()
console.log(JSON.stringify({url:page.url(),log,errors},null,2))
