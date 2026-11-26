// Paste the generated work/google-sheets/Code.gs into the sheet's Apps Script editor.
// Run setup once, then Deploy > New deployment > Web app (execute as Me; access Anyone).
const SHEET_ID = '1dHbxfWuOrN6_BjsN4347gv7bR-v2iOXzF95SV7TyEeo';
const BACKEND_SECRET = '__BACKEND_SECRET__';
const FRONTEND_URL = 'http://127.0.0.1:3000'; // Replace with the hosted site before sending real invitations.
const EVENT = {
  title: 'شب یلدا', description: '',
  startsAt: '2026-12-21T23:00:00.000Z', endsAt: '2026-12-22T04:00:00.000Z', deadline: '2026-12-21T23:00:00.000Z',
  venue: 'خانهٔ میزبان', address: 'نشانی مهمانی را اینجا بنویسید',
  parking: '', entrance: '', dressCode: '', host: 'میزبان', contact: '', heroUrl: '', status: 'open',
  features: {gifts:true, pomegranate:true, feast:true, mystery:false, hafez:true, guestbook:false, card:false},
  pomegranateMultiplier:3, pomegranateMax:30,
};
const OPTIONS = [{id:'pomegranate',capacity:4},{id:'gift-card',capacity:6},{id:'pastry',capacity:3},{id:'pin',capacity:1}];
// One row per family. Technical columns are hidden by setup; visible columns remain human-readable.
const HEADERS = ['خانواده','وضعیت حضور','هدیه‌ها','پیام','حساسیت غذایی','ترجیح غذایی','راه تماس','آخرین تغییر','شناسه','اعضا','هش لینک','نشست‌ها','روز فال','شماره فال','نسخه','شناسه ثبت','هش ثبت'];
const LABELS = {pomegranate:'انار','gift-card':'کارت هدیه',pastry:'شیرینی',pin:'پین شیر و خورشید'};
const ID=8, MEMBERS=9, TOKEN=10, SESSIONS=11, DAY=12, FORTUNE=13, REVISION=14, SUBMISSION=15, SUBMISSION_HASH=16;

function setup() {
  const ss=SpreadsheetApp.openById(SHEET_ID);
  let sheet=ss.getSheetByName('مهمان‌ها');
  if(!sheet) sheet=ss.insertSheet('مهمان‌ها');
  if(sheet.getLastRow()===0) sheet.appendRow(HEADERS);
  if(JSON.stringify(sheet.getRange(1,1,1,HEADERS.length).getValues()[0])!==JSON.stringify(HEADERS)) throw new Error('ساختار برگه با نسخهٔ برنامه یکسان نیست.');
  sheet.setFrozenRows(1);
  sheet.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setBackground('#dce6d8');
  sheet.hideColumns(9,9);
  sheet.setRightToLeft(true);
  ss.toast('آماده است. از منوی یلدا یک خانواده اضافه کنید.');
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('یلدا').addItem('افزودن خانواده و ساخت لینک','addFamily').addToUi();
}
function addFamily() {
  const ui=SpreadsheetApp.getUi();
  const name=ui.prompt('نام خانواده', 'مثلاً خانوادهٔ بهار',ui.ButtonSet.OK_CANCEL);
  if(name.getSelectedButton()!==ui.Button.OK || !name.getResponseText().trim()) return;
  const people=ui.prompt('نام اعضا', 'نام‌ها را با ویرگول جدا کنید؛ مثلاً بهار، آرمان، رها',ui.ButtonSet.OK_CANCEL);
  if(people.getSelectedButton()!==ui.Button.OK) return;
  const names=people.getResponseText().split(/[,،]/).map(s=>s.trim()).filter(Boolean);
  if(!names.length || names.length>25) throw new Error('بین یک تا ۲۵ نام وارد کنید.');
  const lock=LockService.getScriptLock(); lock.waitLock(15000);
  let token;
  try {
    token=randomToken();
    const members=names.map(name=>({id:Utilities.getUuid(),name,kind:'adult',status:'pending',isPlusOne:0}));
    table().appendRow([cell(name.getResponseText().trim()),'هنوز مشخص نیست','','','','','',new Date().toISOString(),Utilities.getUuid(),JSON.stringify(members),digest(token),'[]','',0,0,'','']);
    SpreadsheetApp.flush();
  } finally {lock.releaseLock();}
  ui.alert('لینک اختصاصی؛ همین حالا کپی کنید', FRONTEND_URL.replace(/\/$/,'')+'/invite/?token='+token,ui.ButtonSet.OK);
}
function table() {
  const sheet=SpreadsheetApp.openById(SHEET_ID).getSheetByName('مهمان‌ها');
  if(!sheet) problem(503,'ابتدا setup را اجرا کنید.');
  return sheet;
}
function cell(value) {const text=String(value||'');return /^[=+@\-\t\r]/.test(text)?"'"+text:text;}
function digest(value) {return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value)).map(n=>(n+256).toString(16).slice(-2)).join('');}
function randomToken() {return digest(Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid());}
function problem(status,message) {const err=new Error(message);err.status=status;throw err;}
function choices(row) {return String(row[2]||'').split('، ').filter(Boolean).map(label=>Object.keys(LABELS).find(id=>LABELS[id]===label)).filter(Boolean);}
function today() {return Utilities.formatDate(new Date(),'America/Toronto','yyyy-MM-dd');}
function doPost(e) {
  const lock=LockService.getScriptLock();
  let locked=false;
  try {
    const input=JSON.parse(e.postData.contents);
    if(BACKEND_SECRET==='__BACKEND_SECRET__' || input.secret!==BACKEND_SECRET) problem(403,'دسترسی مجاز نیست.');
    lock.waitLock(15000); locked=true;
    const sheet=table();
    const rows=sheet.getDataRange().getValues().slice(1).map(row=>{
      // Sheets can automatically convert ISO day strings into Date cells.
      if(Object.prototype.toString.call(row[DAY])==='[object Date]') row[DAY]=Utilities.formatDate(row[DAY],sheet.getParent().getSpreadsheetTimeZone(),'yyyy-MM-dd');
      return row;
    });
    const result=route(input,rows);
    if(result.row) sheet.getRange(result.rowNumber,1,1,HEADERS.length).setValues([result.row]);
    SpreadsheetApp.flush();
    return output({status:200,data:result.data});
  } catch(err) {return output({status:err.status||500,data:{error:err.status?err.message:'ارتباط شیت برقرار نشد.'}});}
  finally {if(locked) lock.releaseLock();}
}
function output(data) {return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function route(input,rows) {
  const path=input.path, body=input.body||{};
  const stamp=new Date().toISOString();
  let index;
  if(path==='/api/auth/invite' && input.method==='POST') {
    if(!/^[a-f0-9]{64}$/.test(body.token||'')) problem(400,'لینک معتبر نیست.');
    index=rows.findIndex(row=>row[TOKEN]===digest(body.token));
    if(index<0 || EVENT.status==='archived') problem(401,'این دعوت‌نامه معتبر نیست یا لغو شده است.');
    const row=rows[index], session=randomToken();
    const sessions=JSON.parse(row[SESSIONS]||'[]').filter(s=>s.expires>Date.now());
    sessions.push({hash:digest(session),expires:Date.now()+8*3600000});
    row[SESSIONS]=JSON.stringify(sessions.slice(-12));
    return {row,rowNumber:index+2,data:{session}};
  }
  if(!/^[a-f0-9]{64}$/.test(input.session||'')) problem(401,'لطفاً دوباره وارد شوید.');
  const sessionHash=digest(input.session);
  index=rows.findIndex(row=>JSON.parse(row[SESSIONS]||'[]').some(s=>s.hash===sessionHash && s.expires>Date.now()));
  if(index<0) problem(401,'نشست منقضی شده است.');
  const row=rows[index];
  if(EVENT.status==='archived') problem(410,'دعوت‌نامه بایگانی شده است.');
  if(path==='/api/invitation' && input.method==='GET') return {data:invitation(row,rows)};
  if(input.method!=='POST') problem(405,'روش مجاز نیست.');
  if(EVENT.status!=='open') problem(409,'رویداد بسته است.');
  if(path==='/api/guest/gift-choice') {
    const option=OPTIONS.find(option=>option.id===body.kind);
    if(!option || typeof body.selected!=='boolean') problem(400,'انتخاب معتبر نیست.');
    const mine=choices(row);
    if(body.selected && !mine.includes(body.kind)) {
      if(mine.length>=2) problem(409,'یکی عالیه، دوتا کافیه.');
      if(rows.filter(r=>choices(r).includes(body.kind)).length>=option.capacity) problem(409,'ظرفیت این گزینه تکمیل است.');
      mine.push(body.kind);
    }
    row[2]=(body.selected?mine:mine.filter(kind=>kind!==body.kind)).map(kind=>LABELS[kind]).join('، ');
  } else if(path==='/api/guest/fortune') {
    if(row[DAY]!==today()) {
      row[DAY]=today();
      row[FORTUNE]=(Math.floor(Date.parse(today())/86400000)+parseInt(digest(row[ID]).slice(0,8),16))%5;
    }
    return {row,rowNumber:index+2,data:{day:row[DAY],index:Number(row[FORTUNE])}};
  } else if(path==='/api/guest/rsvp') {
    if(Date.parse(EVENT.deadline)<Date.now()) problem(409,'مهلت پاسخ پایان یافته است.');
    const bodyHash=digest(JSON.stringify(body));
    if(row[SUBMISSION]===body.requestId) {
      if(row[SUBMISSION_HASH]!==bodyHash) problem(409,'شناسهٔ درخواست تکراری است.');
      return {data:{ok:true}};
    }
    if(body.revision!==Number(row[REVISION])) problem(409,'پاسخ تغییر کرده؛ صفحه را تازه کنید.');
    const members=JSON.parse(row[MEMBERS]);
    if(!Array.isArray(body.members) || body.members.length!==members.length || new Set(body.members.map(m=>m.id)).size!==members.length || body.members.some(m=>!members.some(p=>p.id===m.id) || !['pending','attending','declined','maybe'].includes(m.status))) problem(400,'اعضا معتبر نیستند.');
    for(const [key,max] of [['dietary',1000],['allergies',1000],['message',2000],['contact',200]]) if(typeof body[key]!=='string' || body[key].length>max) problem(400,'متن واردشده معتبر نیست.');
    members.forEach(member=>member.status=body.members.find(m=>m.id===member.id).status);
    row[MEMBERS]=JSON.stringify(members);
    const count=members.filter(m=>m.status==='attending').length;
    row[1]=count===members.length?'همه می‌آییم':count?count+' نفر می‌آیند':members.every(m=>m.status==='declined')?'نمی‌آییم':'هنوز مشخص نیست';
    row[3]=cell(body.message); row[4]=cell(body.allergies); row[5]=cell(body.dietary); row[6]=cell(body.contact);
    row[REVISION]=Number(row[REVISION])+1; row[SUBMISSION]=body.requestId; row[SUBMISSION_HASH]=bodyHash;
  } else problem(404,'این بخش در حالت شیت فعال نیست.');
  row[7]=stamp;
  return {row,rowNumber:index+2,data:{ok:true}};
}
function invitation(row,rows) {
  return {
    eventId:SHEET_ID,event:EVENT,
    household:{id:row[ID],name:row[0],greeting:'',plusOnes:0,revision:Number(row[REVISION]),pomegranates:0},
    members:JSON.parse(row[MEMBERS]),response:{message:row[3]||'',allergies:row[4]||'',dietary:row[5]||'',contact:row[6]||''},
    attending:rows.reduce((sum,r)=>sum+JSON.parse(r[MEMBERS]).filter(m=>m.status==='attending').length,0),
    campaigns:[],pledges:[],registry:[],guestbook:[],
    giftChoices:OPTIONS.map(option=>({kind:option.id,reserved:rows.filter(r=>choices(r).includes(option.id)).length,mine:choices(row).includes(option.id)})),
    dailyFortune:row[DAY]===today()?{day:row[DAY],index:Number(row[FORTUNE])}:null,
  };
}
