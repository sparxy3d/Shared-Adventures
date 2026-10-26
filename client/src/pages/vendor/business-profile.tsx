import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { KeyRound, LogOut, Save, Store } from "lucide-react";
import type { Vendor } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { applicationDetails, profilePayload } from "@/lib/vendor-listings";
import "@/components/vendor-editor-stage-five.css";

export default function BusinessProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const profile = useQuery<Vendor>({ queryKey:["/api/vendor/profile"] });
  const [businessName,setBusinessName]=useState("");
  const [about,setAbout]=useState("");
  const [city,setCity]=useState("");
  const [address,setAddress]=useState("");
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [initialized,setInitialized]=useState(false);
  const [passwordError,setPasswordError]=useState("");
  const [businessTouched,setBusinessTouched]=useState(false);
  useEffect(()=>{if(profile.data&&!initialized){const meta=applicationDetails(profile.data.description);setBusinessName(profile.data.businessName);setAbout(meta.about);setCity(profile.data.region||profile.data.city||"");setAddress(profile.data.address||"");setInitialized(true);}},[profile.data,initialized]);
  const save=useMutation({
    mutationFn:()=>apiRequest("PATCH","/api/vendor/profile",profilePayload({...profile.data!,businessName,region:city,address},about)),
    onSuccess:async()=>{await client.invalidateQueries({queryKey:["/api/vendor/profile"]});toast({title:"Business profile saved"});},
    onError:()=>toast({title:"Couldn’t save profile",description:"Your edits are still here. Please retry.",variant:"destructive"}),
  });
  const password=useMutation({
    mutationFn:()=>apiRequest("POST","/api/auth/change-password",{currentPassword,newPassword}),
    onSuccess:()=>{setCurrentPassword("");setNewPassword("");setConfirmPassword("");setPasswordError("");toast({title:"Password changed"});},
    onError:(error:Error)=>{
      const raw=error.message.replace(/^\d+:\s*/,"");
      try { const parsed=JSON.parse(raw) as {message?:string}; setPasswordError(parsed.message||"Couldn’t change your password. Check your current password and retry."); }
      catch { setPasswordError(raw.length<180?raw:"Couldn’t change your password. Check your current password and retry."); }
    },
  });
  const logout=useMutation({
    mutationFn:()=>apiRequest("POST","/api/auth/logout"),
    onSuccess:async()=>{await client.invalidateQueries({queryKey:["/api/auth/me"]});window.location.assign("/login");},
    onError:()=>toast({title:"Couldn’t sign out",description:"Please retry.",variant:"destructive"}),
  });
  if(profile.isLoading)return <div className="v5-page" aria-label="Loading business profile"><div className="v5-skeleton v5-skel-hero"/><div className="v5-skeleton v5-skel-panel"/></div>;
  if(profile.isError || !profile.data)return <div className="v5-page v5-alert" role="alert"><h2>Business profile unavailable</h2><p>We couldn’t load your business details.</p><button className="v5-btn v5-quiet" onClick={()=>profile.refetch()}>Retry</button></div>;
  const metadata=applicationDetails(profile.data.description);
  const vendorVisibleMetadata = metadata.metadata.split(/\r?\n/)
    .filter((line) => !/^\s*(?:Website(?: or Instagram)?|Instagram|Google Maps(?: link)?|Maps(?: link)?)\s*:/i.test(line))
    .join("\n") || "Not recorded (onboarded by Free Spirit)";
  const setField=(setter:(value:string)=>void)=>(event:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setter(event.target.value);
  return <div className="v5-page">
    <header className="v5-heading"><div><p className="v5-eyebrow">Account settings</p><h1>Business profile</h1><p className="v5-sub">Your public details, contact information and account security.</p></div><button className="v5-btn v5-quiet" onClick={()=>logout.mutate()} disabled={logout.isPending}><LogOut size={16}/>{logout.isPending?"Signing out…":"Log out"}</button></header>
    <form onSubmit={event=>{event.preventDefault();save.mutate();}} className="v5-profile-grid">
      <section className="v5-panel">
        <div className="v5-profile-top"><div className="v5-logo" aria-label="Business logo placeholder"><Store size={25}/></div><div><h2 style={{margin:"0 0 4px",fontSize:18}}>Business identity</h2><p className="v5-hint" style={{margin:0}}>Logo uploads aren’t available yet.</p></div></div>
        <div className="v5-fields" style={{marginTop:20}}>
          <div className="v5-field"><label htmlFor="profile-business">Business name</label><input id="profile-business" maxLength={120} required value={businessName} onBlur={()=>setBusinessTouched(true)} onChange={setField(setBusinessName)} aria-invalid={businessTouched&&!businessName.trim()} aria-describedby="profile-business-error"/>{businessTouched&&!businessName.trim()&&<span id="profile-business-error" className="v5-error-text">Enter your business name.</span>}</div>
          <div className="v5-field"><label htmlFor="profile-contact-name">Contact person</label><input id="profile-contact-name" className="v5-readonly" value={user?.fullName||""} readOnly aria-readonly="true"/></div>
          <div className="v5-field"><label htmlFor="profile-email">Account email</label><input id="profile-email" className="v5-readonly" type="email" value={user?.email||""} readOnly aria-readonly="true"/></div>
          <div className="v5-field"><label htmlFor="profile-phone">Account phone</label><input id="profile-phone" className="v5-readonly" value={user?.phone||""} readOnly aria-readonly="true"/></div>
          <div className="v5-field"><label htmlFor="profile-city">City / region</label><input id="profile-city" value={city} onChange={setField(setCity)}/><span className="v5-hint">Stored in the existing region field.</span></div>
          <div className="v5-field full"><label htmlFor="profile-address">Business address</label><input id="profile-address" value={address} onChange={setField(setAddress)}/></div>
          <div className="v5-field full"><label htmlFor="profile-about">About your business</label><textarea id="profile-about" rows={5} maxLength={4000} value={about} onChange={setField(setAbout)}/><span className="v5-hint">Application details and accepted terms are retained exactly when you save.</span></div>
        </div>
        {save.isError&&<div className="v5-alert" role="alert" style={{marginTop:14}}><strong>Profile wasn’t saved.</strong><p>Your edits are still here.</p><button type="button" className="v5-btn v5-quiet" onClick={()=>save.mutate()}>Retry</button></div>}
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><button type="submit" className="v5-btn v5-primary" disabled={save.isPending||!businessName.trim()}><Save size={16}/>{save.isPending?"Saving…":"Save profile"}</button></div>
      </section>
    </form>
    <section className="v5-panel" style={{marginTop:16}}>
      <h2 style={{margin:"0 0 16px",fontSize:19}}>Application record</h2>
      <div className="v5-fields">
        <div className="v5-field"><label>Vendor terms version</label><input className="v5-readonly" value={metadata.termsVersion} readOnly/></div>
        <div className="v5-field"><label>Accepted on</label><input className="v5-readonly" value={metadata.termsDate} readOnly/></div>
        <div className="v5-field full"><label>Original application details</label><textarea className="v5-readonly" rows={5} value={vendorVisibleMetadata} readOnly/></div>
      </div>
    </section>
    <section className="v5-panel" style={{marginTop:16}}>
      <h2 style={{margin:"0 0 7px",fontSize:19}}>Notifications</h2><p className="v5-hint">Notification preferences are not available yet.</p>
      <div style={{display:"flex",alignItems:"center",gap:10}}><input id="notifications" type="checkbox" disabled/><label htmlFor="notifications" className="v5-hint">Email me about new booking requests</label></div>
    </section>
    <section className="v5-panel" style={{marginTop:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><KeyRound size={20} color="#bd4c16"/><h2 style={{margin:0,fontSize:19}}>Change password</h2></div>
      <form onSubmit={event=>{event.preventDefault();setPasswordError("");if(newPassword!==confirmPassword){setPasswordError("New passwords don’t match.");return;}if(newPassword.length<8){setPasswordError("Use at least 8 characters.");return;}password.mutate();}} className="v5-fields">
        <div className="v5-field full"><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></div>
        <div className="v5-field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></div>
        <div className="v5-field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></div>
        {passwordError&&<p className="v5-error-text" role="alert" style={{gridColumn:"1/-1"}}>{passwordError}</p>}
        <div style={{gridColumn:"1/-1",display:"flex",justifyContent:"flex-end"}}><button type="submit" className="v5-btn v5-quiet" disabled={password.isPending}><KeyRound size={16}/>{password.isPending?"Updating…":"Update password"}</button></div>
      </form>
    </section>
  </div>;
}
