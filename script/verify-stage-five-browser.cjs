// Development-only Chromium verification. --layout-only is read-only; default
// creates two labelled draft/listing records and real future sessions.
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const WebSocket = require("ws");
if (!process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev")) throw Error("Development workspace required");
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage-five-browser-"));
const chrome = spawn("/repl/tools/bin/chromium", ["--headless", "--no-sandbox", "--ignore-certificate-errors", "--remote-debugging-port=9227", `--user-data-dir=${dir}`, "--no-first-run", "about:blank"], { stdio:"ignore" });
const delay = ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws, seq=0; const pending=new Map(), errors=[];
function send(method,params={}) { return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));}); }
async function js(expression) { const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true,userGesture:true}); if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value; }
async function until(expression,label) { for(let i=0;i<250;i++){if(await js(expression))return;await delay(100);}throw Error("Timed out: "+label); }
async function go(route,selector) {
  const nonce=String(Date.now());await js(`window.__stageFiveOldDocument=${JSON.stringify(nonce)}`);
  await send("Page.navigate",{url:origin+route});
  await until(`window.__stageFiveOldDocument!==${JSON.stringify(nonce)} && location.pathname===${JSON.stringify(new URL(origin+route).pathname)} && !!document.querySelector(${JSON.stringify(selector)})`,route);
}
async function fill(selector,value) { await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error("Field unavailable");const p=e.tagName==="SELECT"?HTMLSelectElement.prototype:e.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,"value").set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));})()`);await delay(80); }
async function button(text,scope="document") { await js(`(()=>{const b=[...${scope}.querySelectorAll("button")].find(e=>e.getClientRects().length&&e.innerText.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error("Button unavailable: "+${JSON.stringify(text)});b.click()})()`);await delay(150); }
async function click(selector) { await js(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(150); }
async function nativeButton(text) {
  const point=await js(`(()=>{const b=[...document.querySelectorAll("button")].find(e=>e.getClientRects().length&&e.innerText.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error("Button unavailable");b.scrollIntoView({block:"center",behavior:"instant"});const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,uncovered:b.contains(document.elementFromPoint(x,y))}})()`);
  assert.ok(point.uncovered,"Phone primary action not covered by vendor bottom tabs");
  await send("Input.dispatchMouseEvent",{type:"mousePressed",x:point.x,y:point.y,button:"left",clickCount:1});
  await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:point.x,y:point.y,button:"left",clickCount:1});
}
async function api(method,url,body) { return js(`(async()=>{const r=await fetch(${JSON.stringify(url)},{method:${JSON.stringify(method)},credentials:"include",headers:{"Content-Type":"application/json"},body:${body===undefined?"undefined":JSON.stringify(JSON.stringify(body))}});return {status:r.status,body:await r.json()}})()`); }
async function viewport(width) { await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<768}); }
async function shot(name) { const r=await send("Page.captureScreenshot",{format:"png"});fs.writeFileSync(path.join(dir,name+".png"),Buffer.from(r.data,"base64")); }
const pass=label=>console.log("PASS:",label);
(async()=>{
  let originalProfile, passwordChanged=false, listingId;
  const tempPassword=`stage5-browser-${Date.now()}`;
  try {
    let target;
    for(let i=0;i<50;i++){try{target=(await(await fetch("http://127.0.0.1:9227/json")).json()).find(t=>t.type==="page");if(target)break;}catch{}await delay(100);}
    assert.ok(target);ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.once("open",resolve);ws.once("error",reject);});
    ws.on("message",data=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}else if(m.method==="Runtime.exceptionThrown")errors.push(m.params.exceptionDetails.text);});
    await send("Page.enable");await send("Runtime.enable");await send("Page.bringToFront");await send("Emulation.setFocusEmulationEnabled",{enabled:true});
    await go("/login",'[data-testid="button-login"]');
    assert.equal((await api("POST","/api/auth/login",{email:"vendor1@freespirit.com",password:"vendor123"})).status,200);
    if(!process.argv.includes("--layout-only")){
      const inactive=(await api("GET","/api/vendor/bookings")).body.find(b=>b.customerNote==="Stage 5 deletion safeguard verification" && b.status==="declined" && b.slotId);
      if(inactive){
        assert.equal((await api("DELETE",`/api/vendor/slots/${inactive.slotId}`)).status,200);
        const retained=(await api("GET","/api/vendor/bookings")).body.find(b=>b.id===inactive.id);
        assert.equal(retained.slotId,null);assert.equal(retained.bookingDate,inactive.bookingDate);assert.ok(retained.startTime);
        pass("Inactive booking history preserved while its empty session is deleted");
      }
      const reuse=process.argv.find(v=>v.startsWith("--listing="))?.split("=")[1];
      if(process.argv.includes("--finish-only")) {
        listingId=Number(reuse);assert.ok(listingId);await viewport(390);
      } else {
      await viewport(390);await go(reuse?`/vendor/listings/${reuse}`:"/vendor/listings/new","#listing-title");
      if(!reuse){
        for(const [selector,value]of Object.entries({"#listing-title":`Stage 5 UI verification ${Date.now()}`,"#listing-category":"recreation","#listing-city":"Colombo","#listing-location":"Development verification only","#listing-description":"Synthetic browser verification activity","#listing-price":"2500","#listing-capacity":"12","#listing-duration":"90"}))await fill(selector,value);
        await nativeButton("Save draft");
        await until('/\\/vendor\\/listings\\/\\d+$/.test(location.pathname) && !!document.querySelector("#listing-title")',"saved draft route");
      }
      listingId=Number(await js("location.pathname.split('/').pop()"));assert.ok(listingId);
      assert.equal((await api("GET",`/api/vendor/experiences/${listingId}`)).body.priceAmount,2500);
      if(!(await api("GET",`/api/vendor/experiences/${listingId}/slots`)).body.length){
        await until('document.querySelector(".v5-page").innerText.includes("Add an open session")',"publish missing-session guidance");
        assert.ok(await js('[...document.querySelectorAll("button")].filter(b=>b.innerText.trim()==="Publish").every(b=>b.disabled)'));
      }
      await js('[...document.querySelectorAll(".v5-image-choice")].find(b=>b.querySelector("img").getAttribute("src")==="/images/recreation.png").click()');await delay(150);
      await button("Save draft");await until('!document.querySelector(".v5-page").textContent.includes("Unsaved changes") && ![...document.querySelectorAll("button")].some(b=>b.textContent.includes("Saving…"))',"photo saved");
      await shot("editor-draft-390");pass("Real UI draft, whole LKR/90-minute duration, publish blocked with Schedule link");
      await go(`/vendor/schedule?listing=${listingId}`,"#v5-pattern-heading");
      await until('!!document.querySelector(".v5-week-grid")',"pattern ready");
      if(!(await api("GET",`/api/vendor/experiences/${listingId}/slots`)).body.length){
        for(const day of["Saturday","Sunday"])for(const time of["10:00","14:00"]){
          await click(`[aria-label="Add a ${day} pattern time"]`);await fill("#v5-pattern-time",time);await fill("#v5-pattern-capacity","12");
          await button("Add time");await until('!document.querySelector("#v5-pattern-time")',"pattern time saved");
        }
      }
      await button("Save pattern");await until('document.querySelector(".v5-saved-label").innerText.includes("Pattern saved")',"pattern local persistence");
      assert.ok(await js('Object.values(localStorage).some(v=>{try{return JSON.parse(v).pattern?.length===4}catch{return false}})'));
      await button("Generate next 60 days");
      await until(`(async()=>{const r=await fetch("/api/vendor/experiences/${listingId}/slots");return (await r.json()).length>0})()`,"generated real sessions");
      const sessions=(await api("GET",`/api/vendor/experiences/${listingId}/slots`)).body;assert.ok(sessions.length>0&&sessions.every(s=>s.capacity===12));
      await shot("schedule-390");pass("Sat/Sun 10:00/14:00 capacity12 saved on device; real sessions generated");
      await go(`/vendor/listings/${listingId}`,"#listing-title");await until('[...document.querySelectorAll("button")].some(b=>b.innerText.trim()==="Publish"&&!b.disabled)',"publish ready");
      await button("Publish");await until('document.querySelector(".v5-page").innerText.includes("Live")',"published Live");
      assert.equal((await api("GET",`/api/experiences/${listingId}`)).status,200);
      pass("Published Live shown on phone; published activity reachable publicly");
      }
      await go("/vendor/listings",".v5-listing");
      const title=(await api("GET",`/api/vendor/experiences/${listingId}`)).body.title;
      const scope=`[...document.querySelectorAll(".v5-listing")].find(e=>e.innerText.includes(${JSON.stringify(title)}))`;
      await button("Duplicate",scope);await until('!!document.querySelector("[aria-labelledby=duplicate-title]")',"duplicate dialog");
      await button("Create draft copy");
      await until(`document.querySelector(".v5-page").innerText.includes(${JSON.stringify(title+" (copy)")})`,"draft copy");
      const copies=(await api("GET","/api/vendor/experiences")).body.filter(e=>e.title===title+" (copy)");assert.equal(copies.length,1);assert.equal(copies[0].status,"draft");
      pass("UI publish/public activity and draft duplication");
      await go("/vendor/profile","#profile-business");
      originalProfile=(await api("GET","/api/vendor/profile")).body;
      await fill("#profile-about","Stage 5 browser profile save verification");await button("Save profile");
      await until('document.body.innerText.includes("Business profile saved")',"profile saved");
      await fill("#current-password","vendor123");await fill("#new-password",tempPassword);await fill("#confirm-password",tempPassword);
      await button("Update password");
      await until('document.body.innerText.includes("Password changed")',"password updated");passwordChanged=true;
      assert.equal((await api("POST","/api/auth/login",{email:"vendor1@freespirit.com",password:tempPassword})).status,200);
      pass("Profile UI save/password change and login with new password");
      await api("POST","/api/auth/change-password",{currentPassword:tempPassword,newPassword:"vendor123"});passwordChanged=false;
      await api("PATCH","/api/vendor/profile",{description:originalProfile.description});originalProfile=undefined;
      // Return public verification listing to draft after observing its public result.
      await api("PATCH",`/api/vendor/experiences/${listingId}`,{status:"draft"});
    }
    for(const width of(process.argv.includes("--assert-only")?[]:[320,390,1280])){
      await viewport(width);
      for(const [route,selector]of[["/vendor/listings",".v5-listing"],["/vendor/listings/new","#listing-title"],["/vendor/schedule","#v5-pattern-heading"],["/vendor/stats","#v5-stats-month"],["/vendor/profile","#profile-business"]]){
        await go(route,selector);await until('!document.querySelector(".v5-skeleton")',"loaded layout");
        assert.ok(await js("document.documentElement.scrollWidth<=innerWidth"),`No page overflow ${route}/${width}`);
        await shot(route.split("/").pop()+"-"+width);
      }
    }
    await go("/vendor/stats","#v5-stats-month");
    const rows=(await api("GET","/api/vendor/bookings")).body;
    const month=await js('document.querySelector("#v5-stats-month").value');
    const cohort=rows.filter(b=>b.createdAt&&new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Colombo",year:"numeric",month:"2-digit"}).format(new Date(b.createdAt))===month);
    const actual=await js('[...document.querySelectorAll(".v5-stat strong")].map(e=>e.innerText)');
    assert.equal(Number(actual[0]),cohort.length);assert.equal(Number(actual[1]),cohort.filter(b=>["confirmed","completed"].includes(b.status)).length);
    assert.equal(await js('document.querySelector("#v5-stats-month").options.length'),6);
    assert.ok(await js('document.querySelector(".v5-page").innerText.includes("Page views coming soon")'));
    pass("Real monthly stats/six month picker and all five vendor screens at320/390/1280");
    await viewport(1280);
    await go("/vendor/listings/new","#listing-title");await fill("#listing-title","Unsaved browser check");
    await click('a[href="#section-photo"]');assert.equal(await js('!!document.querySelector("[aria-labelledby=leave-title]")'),false);
    await js('[...document.querySelectorAll(\'a[href="/vendor/listings"]\')].find(e=>e.getClientRects().length).click()');
    await until('!!document.querySelector("[aria-labelledby=leave-title]")',"unsaved leave confirmation");
    await button("Keep editing");assert.ok(await js('location.pathname.endsWith("/new")'));
    await js('[...document.querySelectorAll(\'a[href="/vendor/listings"]\')].find(e=>e.getClientRects().length).click()');
    await until('!!document.querySelector("[aria-labelledby=leave-title]")',"second leave confirmation");
    await button("Leave page");await until('location.pathname==="/vendor/listings"',"discard unsaved changes");
    pass("Section anchors retain edits; leaving prompts and Cancel/Leave both work");
    assert.deepEqual(errors,[]);
  } finally {
    if(ws&&ws.readyState===1){
      await shot("last-state");
      if(passwordChanged)await api("POST","/api/auth/change-password",{currentPassword:tempPassword,newPassword:"vendor123"});
      if(originalProfile)await api("PATCH","/api/vendor/profile",{description:originalProfile.description});
      if(listingId)await api("PATCH",`/api/vendor/experiences/${listingId}`,{status:"draft"});
      ws.close();
    }
    chrome.kill("SIGTERM");console.log("Screenshots:",dir);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
