const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const root = resolve(__dirname, '..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');
const importSource = async (path, imports = {}) => {
  let code = source(path);
  for (const [specifier, target] of Object.entries(imports)) code = code.replace(specifier, target);
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
};
const validationUrl = 'data:text/javascript;base64,'+Buffer.from(source('lib/server/validation.js')).toString('base64');
const schemaUrl = 'data:text/javascript;base64,'+Buffer.from(source('lib/server/inquiry-schema.js')).toString('base64');
const memberUrl = 'data:text/javascript;base64,'+Buffer.from(source('lib/server/member.js')).toString('base64');

test('nickname validation rejects HTML and controls while allowing Unicode names and apostrophes', async () => {
  const { validNickname } = await import(validationUrl);
  for (const name of ['김민수', "O'Neil", 'QA_사용자-2', 'José']) assert.equal(validNickname(name), true, name);
  for (const name of ['<script>alert(1)</script>', 'Alice\nBob', 'Alice\u0000', 'a']) assert.equal(validNickname(name), false, name);
});
test('whitespace-only passwords are rejected without trimming valid passphrases', async () => {
  const { validPassword } = await import(validationUrl);
  for (const password of ['        ', '\t\n       ', '\u3000'.repeat(8), 'short']) assert.equal(validPassword(password), false);
  for (const password of ['a long plain passphrase', '  valid passphrase  ', '가나다라마바사아']) assert.equal(validPassword(password), true);
});
test('signup API rejects whitespace passwords and markup nicknames before storing users', async () => {
  const { onRequestPost } = await importSource('functions/api/auth/signup.js', { '../../../lib/server/validation.js': validationUrl });
  const DB = { prepare() { throw new Error('Validation must fail before database queries'); } };
  for (const overrides of [{password:'        '}, {nickname:'<script>alert(1)</script>'}]) {
    const request = new Request('https://local.invalid/api/auth/signup', { method:'POST', body:JSON.stringify({nickname:'QA 사용자',email:'qa@example.invalid',password:'valid passphrase',gender:'undisclosed',...overrides}) });
    const result = await onRequestPost({request,env:{DB}});
    assert.equal(result.status,400);
  }
});
function database(user) {
  const calls = [];
  return { calls, prepare(sql) { return { bind(...args) {
    calls.push({sql,args});
    return { async first() { return sql.includes('FROM users') ? user : null; }, async run() { return {success:true}; }, async all() { return {results:[]}; } };
  } }; } };
}
test('inquiry creation rejects anonymous users and binds authenticated identity against spoofing', async () => {
  const { onRequestPost } = await importSource('functions/api/inquiries.js', {'../../lib/server/member.js':memberUrl,'../../lib/server/inquiry-schema.js':schemaUrl});
  const user = {id:'member-a',nickname:'인증된 이름',email:'member-a@example.invalid'};
  const DB = database(user);
  const payload = {name:'위조된 이름',email:'other@example.invalid',user_id:'member-b',topic:'일반 문의',subject:'A < B & C',message:'<img src=x onerror=alert(1)> is plain text'};
  const request = (cookie) => new Request('https://local.invalid/api/inquiries', {method:'POST',headers:cookie?{cookie:'compose_session=synthetic-token'}:{},body:JSON.stringify(payload)});
  assert.equal((await onRequestPost({request:request(false),env:{DB}})).status,401);
  const response = await onRequestPost({request:request(true),env:{DB}});
  assert.equal(response.status,201);
  const data = await response.json();
  assert.equal(data.inquiry.name,user.nickname);
  assert.equal(data.inquiry.email,user.email);
  assert.equal(data.inquiry.user_id,user.id);
  assert.equal(data.inquiry.message,payload.message);
  const insert = DB.calls.find((call) => call.sql.includes('INSERT INTO inquiries'));
  assert.deepEqual(insert.args.slice(1,3),[user.nickname,user.email]);
  assert.equal(insert.args.at(-1),user.id);
});
test('member inquiry queries use immutable member ID and restrict email fallback to legacy rows', async () => {
  const { onRequestGet } = await importSource('functions/api/my/inquiries.js',{'../../../lib/server/member.js':memberUrl,'../../../lib/server/inquiry-schema.js':schemaUrl});
  const user = {id:'member-a',nickname:'QA',email:'qa@example.invalid'};
  for (const suffix of ['', '?id=inquiry-a']) {
    const DB = database(user);
    await onRequestGet({request:new Request('https://local.invalid/api/my/inquiries'+suffix,{headers:{cookie:'compose_session=synthetic-token'}}),env:{DB}});
    const query = DB.calls.find((call) => call.sql.includes('FROM inquiries'));
    assert.match(query.sql,/user_id = \? OR \(user_id IS NULL AND email = \? COLLATE NOCASE\)/);
    assert.deepEqual(query.args.slice(-2),[user.id,user.email]);
  }
});
function field(value='') {
  return {value,attrs:{},handlers:{},focus(){this.focused=true;},setAttribute(key,value){this.attrs[key]=value;},removeAttribute(key){delete this.attrs[key];},addEventListener(key,handler){this.handlers[key]=handler;}};
}
async function signup(values) {
  const status = field(), submit = field();
  const fields = Object.fromEntries(Object.entries({nickname:'QA 이름',email:'qa@example.invalid',password:'a long passphrase',passwordConfirm:'a long passphrase',gender:'undisclosed',...values}).map(([key,value])=>[key,field(value)]));
  const handlers = {}, calls = [];
  const form = {reportValidity:()=>true,reset(){},addEventListener(key,handler){handlers[key]=handler;},querySelector(selector){return selector==='[type="submit"]'?submit:fields[selector.match(/name="([^"]+)"/)[1]];}};
  vm.runInNewContext(source('public/assets/js/auth.js'),{
    document:{getElementById:(id)=>id==='signup-form'?form:id==='auth-status'?status:null,querySelectorAll:()=>[]},
    window:{location:{search:'',href:'https://local.invalid/signup.html',origin:'https://local.invalid'},setTimeout(){}},URL,URLSearchParams,
    FormData:class{get(key){return fields[key].value;}},
    fetch:async(url,options)=>{calls.push({url,...options});return{ok:true,json:async()=>({})};}
  });
  await handlers.submit({preventDefault(){}});
  return {status,fields,calls};
}
test('signup form prevents mismatched passwords, whitespace passwords and markup nicknames with inline errors', async () => {
  for (const [values,key,message] of [[{passwordConfirm:'wrong passphrase'},'passwordConfirm',/비밀번호가 일치하지/],[{password:'        ',passwordConfirm:'        '},'password',/공백만/],[{nickname:'<img src=x>'},'nickname',/닉네임/]]) {
    const p=await signup(values);
    assert.equal(p.calls.length,0);
    assert.match(p.status.textContent,message);
    assert.equal(p.fields[key].attrs['aria-invalid'],'true');
    assert.equal(p.fields[key].focused,true);
  }
  const p=await signup({password:'  a long passphrase  ',passwordConfirm:'  a long passphrase  '});
  assert.equal(p.calls.length,1);
  const payload=JSON.parse(p.calls[0].body);
  assert.equal(payload.password,'  a long passphrase  ');
  assert.equal('passwordConfirm' in payload,false);
});

test('schema compatibility only recognizes missing user_id and does not swallow unrelated database failures',async()=>{
 const {missingInquiryOwnerColumn}=await import(schemaUrl);
 assert.equal(missingInquiryOwnerColumn(new Error('D1_ERROR: table inquiries has no column named user_id: SQLITE_ERROR')),true);
 assert.equal(missingInquiryOwnerColumn(new Error('D1_ERROR: no such column: user_id: SQLITE_ERROR')),true);
 for(const message of ['network unavailable','no such table: inquiries','no such column: subject','UNIQUE constraint failed']) assert.equal(missingInquiryOwnerColumn(new Error(message)),false);
});
