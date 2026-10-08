// Development-only writes: one labelled listing, sessions and booking. Reservations
// are released; profile and demo password restored. Does not query production.
const assert = require("node:assert/strict");
if (!process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev")) throw Error("Development workspace required");
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
function client() {
  let cookie = "";
  return async (method, route, body) => {
    const res = await fetch(origin + route, { method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const raw = res.headers.getSetCookie()[0]; if (raw) cookie = raw.split(";")[0];
    return { status: res.status, body: await res.json() };
  };
}
const pass = message => console.log("PASS:", message);
const date = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
const addDays = (value, n) => { const [y,m,d] = value.split("-").map(Number); return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10); };
(async () => {
  const owner = client(), other = client(), member = client(), admin = client();
  for (const [api,email,password] of [[owner,"vendor1@freespirit.com","vendor123"],[other,"vendor2@freespirit.com","vendor123"],
    [member,"user@freespirit.com","customer123"],[admin,"admin@freespirit.com","admin123"]])
    assert.equal((await api("POST","/api/auth/login",{email,password})).status,200);
  const profile = (await owner("GET","/api/vendor/profile")).body;
  let booking, changedPassword = false;
  const temporary = `stage5-check-${Date.now()}`;
  try {
    const reuse = process.argv.find(v=>v.startsWith("--listing="))?.split("=")[1];
    const created = reuse ? await owner("GET",`/api/vendor/experiences/${reuse}`) : await owner("POST","/api/vendor/experiences",{
      title:"Stage 5 API verification", category:"recreation", city:"Colombo", locationText:"Development verification only",
      description:"Synthetic development listing", priceAmount:2500, capacity:12, durationMinutes:90, imageUrl:null, status:"draft",
    });
    assert.equal(created.status,200); const id = created.body.id, base=`/api/vendor/experiences/${id}`;
    assert.equal(created.body.priceAmount,2500);
    if (!reuse) {
      assert.equal((await owner("PATCH",base,{status:"published"})).status,400);
      assert.equal((await owner("PATCH",base,{imageUrl:"/images/recreation.png",status:"published"})).status,400);
      pass("Whole-LKR draft without photo; publish refused before upcoming session");
    }
    assert.equal((await owner("PATCH",base,{imageUrl:"/images/recreation.png"})).status,200);
    const pattern=[6,0].flatMap(weekday=>["10:00","14:00"].map(startTime=>({weekday,startTime,capacity:12})));
    const beforeSlots=(await owner("GET",base+"/slots")).body;
    const generation=await owner("POST",base+"/generate-sessions",{pattern,days:60});
    assert.equal(generation.status,200); assert.ok(reuse || generation.body.created>0);
    let slots=(await owner("GET",base+"/slots")).body;
    const snapshot=JSON.stringify(slots);
    assert.equal((await owner("POST",base+"/generate-sessions",{pattern,days:60})).body.created,0);
    assert.equal(JSON.stringify((await owner("GET",base+"/slots")).body),snapshot);
    const previousIds=new Set(beforeSlots.map(s=>s.id));
    assert.ok(slots.filter(s=>!previousIds.has(s.id)).every(s=>s.date>date() && s.date<=addDays(date(),60) && s.capacity===12));
    for(const original of beforeSlots) assert.deepEqual(slots.find(s=>s.id===original.id),original);
    assert.ok(slots.some(s=>s.startTime==="10:00"&&s.endTime==="11:30"));
    assert.equal((await owner("PATCH",base,{status:"published"})).status,200);
    assert.equal((await member("GET",`/api/experiences/${id}`)).status,200);
    const weekend=(await member("GET","/api/experiences?time=weekend&city=Colombo&group=2")).body;
    assert.ok(weekend.some(row=>row.id===id));
    pass("Real Sat/Sun generation, unchanged repeat, exact end time, published/Weekend discovery");
    const tonight = await owner("POST",base+"/slots",{date:date(),startTime:"23:00",capacity:12});
    assert.equal(tonight.status,200);
    if (new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Colombo",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date()) < "23:00")
      assert.ok((await member("GET","/api/experiences?time=tonight&city=Colombo")).body.some(row=>row.id===id));
    slots=(await owner("GET",base+"/slots")).body;
    const target=slots.find(s=>s.date>date() && s.startTime==="10:00" && s.status==="open" && s.capacity>=2);
    assert.ok(target);
    const requested=await member("POST","/api/bookings",{experienceId:id,slotId:target.id,qty:2,customerNote:"Stage 5 deletion safeguard verification"});
    assert.equal(requested.status,200); booking=requested.body;
    assert.equal((await owner("DELETE",`/api/vendor/slots/${target.id}`)).status,409);
    assert.equal((await owner("POST",base+"/slots",{date:target.date,startTime:"18:30",capacity:12})).status,200);
    const closed=await owner("POST",base+"/close-day",{date:target.date,reason:"Weather verification"});
    assert.equal(closed.status,200); assert.ok(closed.body.removed>=1); assert.ok(closed.body.kept>=1);
    assert.equal((await owner("GET",base+"/slots")).body.find(s=>s.id===target.id).capacity,target.capacity-2);
    const empty=slots.find(s=>s.date>target.date && s.startTime==="14:00");
    assert.equal((await owner("DELETE",`/api/vendor/slots/${empty.id}`)).status,200);
    for(const [method,url,body] of [["GET",base],["PATCH",base,{title:"Not yours"}],["GET",base+"/slots"],
      ["POST",base+"/slots",{date:target.date,startTime:"18:00",capacity:12}],
      ["POST",base+"/generate-sessions",{pattern,days:60}],["POST",base+"/close-day",{date:target.date,reason:"Weather"}],
      ["DELETE",`/api/vendor/slots/${target.id}`]])
      assert.equal((await other(method,url,body)).status,404);
    pass("Booked session retained/409, close-day removes only unbooked, empty delete; real vendor2 isolation 404");
    assert.equal((await admin("PATCH",`/api/admin/experiences/${id}`,{status:"unpublished"})).status,200);
    for (const status of ["draft","published"]) {
      const reject=await owner("PATCH",base,{status}); assert.equal(reject.status,403);
      assert.equal(reject.body.message,"Unpublished by Free Spirit — contact us");
    }
    assert.equal((await owner("PATCH",base,{title:"Stage 5 API verification (admin unpublished)"})).status,200);
    assert.equal((await member("GET",`/api/experiences/${id}`)).status,404);
    pass("Admin-only unpublish, vendor status lock with editable details, public 404");
    const about="Stage 5 profile save verification";
    assert.equal((await owner("PATCH","/api/vendor/profile",{description:about+(profile.description?.includes("— Application —")?"\n\n"+profile.description.slice(profile.description.indexOf("— Application —")):"")})).status,200);
    assert.equal((await owner("GET","/api/vendor/profile")).body.description.startsWith(about),true);
    assert.equal((await owner("POST","/api/auth/change-password",{currentPassword:"vendor123",newPassword:temporary})).status,200);
    changedPassword=true;
    assert.equal((await client()("POST","/api/auth/login",{email:"vendor1@freespirit.com",password:temporary})).status,200);
    pass("Profile persistence and existing change-password endpoint/new-password login");
  } finally {
    if (booking) assert.equal((await owner("PATCH",`/api/vendor/bookings/${booking.id}`,{status:"declined",declineReason:"Other",vendorNote:"Development verification complete"})).status,200);
    assert.equal((await owner("PATCH","/api/vendor/profile",{description:profile.description})).status,200);
    if(changedPassword) assert.equal((await owner("POST","/api/auth/change-password",{currentPassword:temporary,newPassword:"vendor123"})).status,200);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
