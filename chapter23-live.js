
(() => {
  "use strict";
  const cfg = window.CHAPTER23_CONFIG || {};
  const ready = cfg.supabaseUrl?.startsWith("https://") && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith("YOUR_") && window.supabase?.createClient;
  const sb = ready ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const adminBtn = document.getElementById("adminBtn");
  const accountBtn = document.getElementById("accountBtn");
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let currentUser=null, isAdmin=false;
  const status = (message,kind="") => `<p class="notice" role="status" style="color:${kind==="bad"?"#a33245":"inherit"}">${esc(message)}</p>`;
  function modal(markup){window.openModal(markup)}
  function msg(message,kind){let p=document.querySelector("#liveStatus");if(p)p.innerHTML=status(message,kind)}
  function errorText(e){return e?.message || "Something went wrong. Please try again."}
  async function refresh(){
    if(!sb){accountBtn.textContent="Account ↗";return}
    const {data:{user}}=await sb.auth.getUser();
    currentUser=user;
    isAdmin=false;
    if(user){
      const {data}=await sb.from("admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
      isAdmin=!!data;
    }
    accountBtn.textContent=user ? `My Account ↗` : "Sign in ↗";
    adminBtn.hidden=!isAdmin;
  }
  function unconfigured(){
    modal(`<span class="micro">CHAPTER 23 / SETUP REQUIRED</span><h2>Connect your customer system.</h2><p>The website design is ready, but live login and orders need Supabase configuration. Follow the included SETUP.md file. Until then, no customer data is collected.</p>`);
  }
  function account(){
    if(!sb)return unconfigured();
    if(currentUser){
      modal(`<span class="micro">YOUR ACCOUNT</span><h2>Welcome back.</h2><p>${esc(currentUser.email)}</p><button class="btn" id="myOrders">My orders ↗</button> <button class="btn" id="signOut">Log out ↗</button><div id="liveStatus"></div>`);
      document.getElementById("signOut").onclick=async()=>{const {error}=await sb.auth.signOut();if(error)return msg(errorText(error),"bad");currentUser=null;await refresh();window.closeModal()};
      document.getElementById("myOrders").onclick=myOrders;
    }else{
      modal(`<span class="micro">CHAPTER 23 / ACCOUNT</span><h2>Your stories, beautifully kept.</h2><p>Sign in or create an account to place and track orders.</p>
        <label>Email</label><input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com">
        <label>Password</label><input id="authPassword" type="password" autocomplete="current-password" placeholder="At least 8 characters">
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:16px"><button class="btn" id="signIn">Sign in</button><button class="btn" id="signUp">Create account</button></div>
        <div id="liveStatus"></div>`);
      document.getElementById("signIn").onclick=()=>authenticate(false);
      document.getElementById("signUp").onclick=()=>authenticate(true);
    }
  }
  async function authenticate(signup){
    const email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value;
    if(!email||password.length<8)return msg("Enter an email and a password of at least 8 characters.","bad");
    const {data,error}=signup?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});
    if(error)return msg(errorText(error),"bad");
    if(signup&&!data.session)return msg("Account created. Check your email for the confirmation link, then sign in.");
    await refresh();
    if(currentUser)await sb.from("login_events").insert({user_id:currentUser.id});
    account();
  }
  async function myOrders(){
    modal(`<span class="micro">CHAPTER 23 / ACCOUNT</span><h2>My orders</h2><div id="ordersList">Loading…</div>`);
    const {data,error}=await sb.from("orders").select("id,occasion,edition,status,payment_status,created_at").order("created_at",{ascending:false});
    document.getElementById("ordersList").innerHTML=error?status(errorText(error),"bad"):(data?.length?data.map(o=>`<p style="border-bottom:1px solid #ccc;padding:12px 0"><strong>${esc(o.edition)}</strong> · ${esc(o.occasion)}<br><small>${esc(o.id.slice(0,8).toUpperCase())} · ${esc(o.status)} · Payment: ${esc(o.payment_status)} · ${new Date(o.created_at).toLocaleDateString()}</small></p>`).join(""):"No orders yet.");
  }
  function enquiry(name="A personalized edition"){
    if(!sb)return unconfigured();
    if(!currentUser){account();msg("Please sign in before placing an order.");return}
    modal(`<span class="micro">CHAPTER 23 / ORDER REQUEST</span><h2>Start your chapter.</h2><p>Submit your request. We'll confirm the price and payment instructions before production begins. This form does not charge you.</p>
      <label>Your name</label><input id="orderName" maxlength="100" required placeholder="Full name">
      <label>Contact email</label><input id="orderEmail" type="email" value="${esc(currentUser.email||"")}" readonly>
      <label>Occasion</label><input id="orderOccasion" maxlength="100" placeholder="Birthday, wedding, anniversary…">
      <label>Edition / collection</label><input id="orderEdition" maxlength="160" value="${esc(name)}">
      <label>Tell us your story</label><textarea id="orderNotes" rows="4" maxlength="3000" placeholder="Date, recipient, personalisation ideas, delivery country…"></textarea>
      <button class="btn" id="submitOrder">Submit order request ↗</button><div id="liveStatus"></div>`);
    document.getElementById("submitOrder").onclick=async()=>{
      const name=document.getElementById("orderName").value.trim(),occasion=document.getElementById("orderOccasion").value.trim(),edition=document.getElementById("orderEdition").value.trim(),notes=document.getElementById("orderNotes").value.trim();
      if(!name||!occasion||!edition)return msg("Please complete your name, occasion and edition.","bad");
      const btn=document.getElementById("submitOrder");btn.disabled=true;
      const {data,error}=await sb.from("orders").insert({user_id:currentUser.id,customer_name:name,customer_email:currentUser.email,occasion,edition,notes}).select("id").single();
      btn.disabled=false;
      if(error)return msg(errorText(error),"bad");
      modal(`<span class="micro">CHAPTER 23 / REQUEST RECEIVED</span><h2>You're in the archive.</h2><p>Your order request <strong>${esc(data.id.slice(0,8).toUpperCase())}</strong> has been saved. Payment is not yet confirmed. We'll contact you about the next steps.</p><button class="btn" id="viewOrders">View my orders ↗</button>`);
      document.getElementById("viewOrders").onclick=myOrders;
    };
  }
  async function dashboard(){
    if(!sb||!currentUser||!isAdmin)return;
    modal(`<span class="micro">CHAPTER 23 / PRIVATE ADMIN</span><h2>The Studio Dashboard</h2><p>Customer accounts, sign-ins and order requests. Access is restricted to approved administrators.</p><div id="adminData">Loading…</div>`);
    const [orders,profiles,logins]=await Promise.all([
      sb.from("orders").select("id,customer_name,customer_email,occasion,edition,status,payment_status,created_at").order("created_at",{ascending:false}).limit(100),
      sb.from("profiles").select("id,email,created_at").order("created_at",{ascending:false}).limit(100),
      sb.from("login_events").select("user_id,created_at").order("created_at",{ascending:false}).limit(100)
    ]);
    if(orders.error||profiles.error||logins.error){document.getElementById("adminData").innerHTML=status(errorText(orders.error||profiles.error||logins.error),"bad");return}
    const rows=orders.data||[], users=profiles.data||[], events=logins.data||[];
    document.getElementById("adminData").innerHTML=`
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin:20px 0">
      ${[["Customers",users.length],["Orders",rows.length],["Sign-ins (recent)",events.length],["Awaiting payment",rows.filter(x=>x.payment_status==="pending").length]].map(([k,v])=>`<div style="border:1px solid #b9a99e;padding:15px;min-width:115px"><strong style="font-size:28px">${v}</strong><br><small>${k}</small></div>`).join("")}</div>
      <button class="btn" id="showAdminOrders">Orders</button> <button class="btn" id="showAdminUsers">Customers</button> <button class="btn" id="showAdminLogins">Recent logins</button>
      <div id="adminTable" style="overflow-x:auto;margin-top:16px"></div><p class="notice">Displays up to 100 most recent records per section.</p>`;
    const table=document.getElementById("adminTable");
    const build=(heads,items)=>`<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${heads.map(x=>`<th style="padding:10px;text-align:left;border-bottom:1px solid #aaa">${x}</th>`).join("")}</tr></thead><tbody>${items.map(r=>`<tr>${r.map(x=>`<td style="padding:10px;border-bottom:1px solid #ddd">${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const showOrders=()=>{table.innerHTML=build(["Date","Customer","Edition","Order","Payment","Change status"],rows.map(o=>[new Date(o.created_at).toLocaleString(),o.customer_name,o.edition,o.status,o.payment_status,""]));table.querySelectorAll("tbody tr").forEach((tr,i)=>{const o=rows[i],cell=tr.lastElementChild;cell.innerHTML=`<select aria-label="Order status"><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="in_production">In production</option><option value="shipped">Shipped</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><select aria-label="Payment status"><option value="pending">Pending</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select><button type="button">Save</button>`;const [st,pm]=cell.querySelectorAll("select");st.value=o.status;pm.value=o.payment_status;cell.querySelector("button").onclick=async()=>{const {error}=await sb.from("orders").update({status:st.value,payment_status:pm.value}).eq("id",o.id);if(error){alert(errorText(error));return}o.status=st.value;o.payment_status=pm.value;alert("Saved")}})};
    document.getElementById("showAdminOrders").onclick=showOrders;
    document.getElementById("showAdminUsers").onclick=()=>table.innerHTML=build(["Registered","Email","User ID"],users.map(u=>[new Date(u.created_at).toLocaleString(),u.email,u.id]));
    document.getElementById("showAdminLogins").onclick=()=>table.innerHTML=build(["Signed in","User ID"],events.map(e=>[new Date(e.created_at).toLocaleString(),e.user_id]));
    showOrders();
  }
  // Replace only the demo account and enquiry interactions; preserve all magazine visuals and galleries.
  accountBtn.onclick=account;
  adminBtn.onclick=dashboard;
  document.querySelectorAll(".enquire").forEach(b=>b.onclick=()=>enquiry(b.dataset.pack));
  document.getElementById("startEnquiry").onclick=()=>enquiry();
  const originalShowIssue=window.showIssue;
  window.showIssue=function(e){originalShowIssue(e);document.getElementById("issueEnquiry").onclick=()=>enquiry(e.title)};
  if(sb){sb.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});refresh()}
})();
