import {chromium} from 'playwright-core'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
const raw=await readFile('/Users/lightgeist/.config/cymbient-forma/prod-e2e.env','utf8')
const pw=raw.match(/^FORMA_TEAM_PASSWORD=(.+)$/m)?.[1]
if(!pw || pw.length<32)throw Error('No secure test credentials')
const dir='docs/evidence'
await mkdir(dir,{recursive:true})
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']})
const context=await browser.newContext({viewport:{width:1440,height:900},httpCredentials:{username:'team',password:pw},recordVideo:{dir,size:{width:1440,height:900}}})
await context.addInitScript(()=>localStorage.setItem('sheet:onboarded','1'))
const page=await context.newPage()
const result={created:false,reloaded:false,reopenedFromDashboard:false,secondBrowser:false,frameAdded:false,errors:[],designUrl:null,steps:[]}
page.on('pageerror',e=>result.errors.push('PAGE:'+e.message))
page.on('response',r=>{if(r.status()>=500) result.errors.push('HTTP:'+r.status()+':'+r.url())})
const save=async n=>{await page.screenshot({path:dir+'/'+n+'.png'});result.steps.push({step:n,url:page.url(),text:(await page.locator('body').innerText()).slice(0,1100)})}
try{
 const resp=await page.goto('https://forma.aifpd.com/app/new',{waitUntil:'domcontentloaded',timeout:30000})
 result.steps.push({httpStatus:resp.status()})
 await page.waitForTimeout(1250)
 await save('prod-dashboard-new')
 const create=page.getByRole('button',{name:/^new file/i})
 await create.first().click({timeout:15000})
 await page.waitForTimeout(1750)
 result.created=/\/design\//.test(page.url())
 result.designUrl=page.url()
 await save('prod-created')
 const add=page.getByRole('button',{name:/add a frame/i})
 if(await add.count()) {await add.first().click();await page.waitForTimeout(700);result.frameAdded=true;await save('prod-frame')}
 await page.reload({waitUntil:'domcontentloaded'})
 await page.waitForTimeout(1450)
 result.reloaded=/\/design\//.test(page.url()) && (await page.locator('body').innerText()).includes('Page 1')
 await save('prod-reloaded')
 await page.goto('https://forma.aifpd.com/app',{waitUntil:'domcontentloaded'})
 await page.waitForTimeout(1400)
 await save('prod-list')
 const listed=(await page.locator('body').innerText()).includes('Untitled')
 if(listed && result.designUrl) {await page.goto(result.designUrl,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(950); result.reopenedFromDashboard=(await page.locator('body').innerText()).includes('Page 1');}
 const other=await browser.newContext({viewport:{width:1280,height:800},httpCredentials:{username:'team',password:pw}})
 await other.addInitScript(()=>localStorage.setItem('sheet:onboarded','1'))
 const otherPage=await other.newPage()
 await otherPage.goto(result.designUrl,{waitUntil:'domcontentloaded'})
 await otherPage.waitForTimeout(1200)
 result.secondBrowser=(await otherPage.locator('body').innerText()).includes('Page 1')
 await otherPage.screenshot({path:dir+'/prod-second-browser.png'})
 await other.close()
}catch(e){result.errors.push('FATAL:'+String(e))}
await writeFile(dir+'/prod-e2e-result.json',JSON.stringify(result,null,2))
await context.close();await browser.close()
console.log(JSON.stringify(result,null,2))
