const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function element(value='') {
 return {value,hidden:false,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},querySelectorAll(){return[];}};
}
function contact({authenticated=false,storage={},storedStatus=201}={}) {
 const nodes=new Map(), calls=[];
 const get=(id)=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const form=get('contact-form'),submit=element();
 const fields={topic:element('일반 문의'),subject:element('문의 제목'),message:element('문의 내용')};
 form.reportValidity=()=>true;
 form.querySelector=(selector)=>selector.startsWith('button')?submit:fields[selector.match(/name="([^"]+)"/)[1]];
 form.reset=()=>{for(const value of Object.values(fields))value.value='';get('contact-name').value='';get('contact-email').value='';};
 const user={id:'member-a',nickname:'QA 이름',email:'qa@example.invalid'};
 const location={href:''};
 vm.runInNewContext(readFileSync(resolve(__dirname,'../public/assets/js/contact.js'),'utf8'),{
  document:{getElementById:get},AbortController,setTimeout,clearTimeout,
  window:{location,sessionStorage:{getItem:key=>storage[key],setItem:(key,value)=>{storage[key]=value;},removeItem:key=>{delete storage[key];}}},
  FormData:class{get(key){return fields[key]?.value;}},
  fetch:async(url,options={})=>{
   calls.push({url,...options});
   const status=url==='/api/auth/me'?(authenticated?200:401):options.method==='POST'?storedStatus:401;
   return{status,ok:status<400,json:async()=>({user,inquiry:{id:'new-inquiry'}})};
  }
 });
 return{get,fields,calls,location,storage,submit};
}
test('contact autofills readonly member identity and retains it after successful submit',async()=>{
 const p=contact({authenticated:true});await settle();
 assert.equal(p.get('contact-name').value,'QA 이름');
 assert.equal(p.get('contact-email').value,'qa@example.invalid');
 assert.equal(p.get('contact-email').readOnly,true);
 await p.get('contact-form').handlers.submit({preventDefault(){}});
 const post=p.calls.find(call=>call.method==='POST');
 assert.equal(post.url,'/api/inquiries');
 assert.equal('email' in JSON.parse(post.body),false);
 assert.equal(p.get('contact-email').value,'qa@example.invalid');
});
test('guest can stay or explicitly log in with a saved draft, which is restored after login',async()=>{
 const storage={},p=contact({storage});await settle();
 assert.equal(p.get('contact-login-actions').hidden,false);
 assert.equal(p.location.href,'');
 p.get('contact-stay').handlers.click();
 assert.equal(p.get('contact-login-actions').hidden,true);
 p.fields.message.value='사용자가 작성 중인 <문의> 원문';
 p.get('contact-login-link').handlers.click();
 assert.ok(storage['composecoffee.contact-draft.v1']);
 const signedIn=contact({authenticated:true,storage});await settle();
 assert.equal(signedIn.fields.message.value,'사용자가 작성 중인 <문의> 원문');
 assert.equal(storage['composecoffee.contact-draft.v1'],undefined);
 assert.equal(p.calls.some(call=>call.method==='POST'),false);
});
test('session expiry during contact POST shows inline login action and preserves draft',async()=>{
 const p=contact({authenticated:true,storedStatus:401});await settle();
 await p.get('contact-form').handlers.submit({preventDefault(){}});
 assert.equal(p.get('contact-login-actions').hidden,false);
 assert.equal(p.location.href,'');
 assert.equal(p.fields.message.value,'문의 내용');
});
