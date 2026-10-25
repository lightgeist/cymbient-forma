import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
const dir='docs/evidence'
await mkdir(dir,{recursive:true})
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']})
const ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,httpCredentials:{username:'team',password:'forma-local-test-credential-do-not-use'},recordVideo:{dir,size:{width:1440,height:900}}})
await ctx.addInitScript(()=>localStorage.setItem('sheet:onboarded','1'))
const page=await ctx.newPage()
const report={steps:[],errors:[],currentUrl:''}
page.on('pageerror',e=>report.errors.push('page:'+e.message))
page.on('console',e=>{if(e.type()==='error')report.errors.push('console:'+e.text().slice(0,200))})
const capture=async step=>{await page.screenshot({path:dir+'/'+step+'.png'});report.steps.push({step,url:page.url(),text:(await page.locator('body').innerText()).slice(0,1600)})}
try{
 await page.goto('http://127.0.0.1:4184/app/new',{waitUntil:'networkidle'})
 await capture('journey-new')
 const create=page.getByRole('button',{name:/^new file/i})
 console.log('CREATE_COUNT',await create.count())
 if(await create.count())await create.first().click()
 await page.waitForTimeout(1800)
 await capture('journey-created')
 console.log('BUTTONS', (await page.getByRole('button').allTextContents()).slice(0,55))
 console.log('INPUTS',await page.locator('input').evaluateAll(xs=>xs.map(x=>({placeholder:x.placeholder,value:x.value})).slice(0,25)))
 await page.reload({waitUntil:'networkidle'})
 await capture('journey-reloaded')
 if(page.url().includes('/design')) {
    const frames=await page.locator('button').allTextContents()
    console.log('EDITOR_BUTTONS',frames.slice(0,65))
 }
 await page.goto('http://127.0.0.1:4184/app',{waitUntil:'networkidle'})
 await capture('journey-reopen-list')
}catch(e){report.errors.push('exception:'+String(e))}
report.currentUrl=page.url()
await writeFile(dir+'/journey.json',JSON.stringify(report,null,2))
await ctx.close()
await browser.close()
console.log(JSON.stringify(report,null,2))
