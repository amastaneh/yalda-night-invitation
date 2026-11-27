// Run setup once to create the simple sheet and copy existing families without removing old data.
const SHEET_ID = '1dHbxfWuOrN6_BjsN4347gv7bR-v2iOXzF95SV7TyEeo';
const BACKEND_SECRET = '__BACKEND_SECRET__';
const FRONTEND_URL = 'https://yalda-night-invitation.vercel.app';
const EVENT = {
  title:'شب یلدا',description:'',startsAt:'2026-12-21T23:00:00.000Z',endsAt:'2026-12-22T04:00:00.000Z',deadline:'2026-12-21T23:00:00.000Z',
  venue:'خانهٔ میزبان',address:'نشانی مهمانی را اینجا بنویسید',parking:'',entrance:'',dressCode:'',host:'امیر و فی',contact:'',heroUrl:'',status:'open',
  features:{gifts:true,pomegranate:true,feast:true,mystery:false,hafez:true,guestbook:false,card:false},pomegranateMultiplier:3,pomegranateMax:30,
};
const OPTIONS=[{id:'pomegranate',capacity:5,label:'انار'},{id:'gift-card',capacity:20,label:'کارت هدیه'},{id:'pastry',capacity:4,label:'شیرینی'},{id:'pin',capacity:1,label:'پین شیر و خورشید'}];
const HEADERS=['شماره','نام دعوت','اعضا','پاسخ اعضا','هدیه‌ها','روز فال','شماره فال','آخرین تغییر','لینک دعوت'];
const STATUS={pending:'هنوز مشخص نیست',attending:'می‌آیم',declined:'نمی‌آیم',maybe:'شاید'};
const split=value=>String(value||'').split(/[,،]/).map(s=>s.trim()).filter(Boolean);
const link=id=>FRONTEND_URL.replace(/\/$/,'')+'/invite/?family='+id;
const cell=value=>/^[=+@\-\t\r]/.test(String(value))?"'"+value:String(value);
function book(){return SpreadsheetApp.openById(SHEET_ID);}
function table(){const sheet=book().getSheetByName('دعوت‌ها');if(!sheet)problem(503,'یک‌بار setup را اجرا کنید.');return sheet;}
function problem(status,message){const err=new Error(message);err.status=status;throw err;}
function today(){return Utilities.formatDate(new Date(),'America/Toronto','yyyy-MM-dd');}
function day(value){return Object.prototype.toString.call(value)==='[object Date]'?Utilities.formatDate(value,book().getSpreadsheetTimeZone(),'yyyy-MM-dd'):String(value||'');}
function revision(value){return Object.prototype.toString.call(value)==='[object Date]'?value.getTime():Date.parse(String(value))||0;}
function readRows(sheet){return sheet.getDataRange().getValues().slice(1);}
function members(row){const statuses=split(row[3]);return split(row[2]).map((name,i)=>({id:String(i+1),name,kind:'adult',isPlusOne:0,status:Object.keys(STATUS).find(key=>STATUS[key]===statuses[i])||'pending'}));}
function choices(row){const labels=split(row[4]);return OPTIONS.filter(option=>labels.includes(option.label)).map(option=>option.id);}
function setup(){
  const ss=book();let sheet=ss.getSheetByName('دعوت‌ها');if(!sheet)sheet=ss.insertSheet('دعوت‌ها');
  if(sheet.getLastRow()===0){
    sheet.appendRow(HEADERS);
    const old=ss.getSheetByName('مهمان‌ها');
    if(old)old.getDataRange().getValues().slice(1).filter(row=>row[8]).forEach((row,i)=>{
      const people=JSON.parse(row[9]||'[]');const id=i+1;
      sheet.appendRow([id,row[0],people.map(p=>p.name).join('، '),people.map(p=>STATUS[p.status]||STATUS.pending).join('، '),row[2],day(row[12]),Number(row[13])||0,row[7]||new Date(),link(id)]);
    });
  }
  sheet.setFrozenRows(1);sheet.setRightToLeft(true);
  sheet.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setBackground('#dce6d8');
  ss.toast('دعوت‌ها آماده است؛ شماره‌ها و لینک‌ها ساده‌اند.');
}
function onOpen(){SpreadsheetApp.getUi().createMenu('یلدا').addItem('افزودن خانواده','addFamily').addToUi();}
function addFamily(){
  const ui=SpreadsheetApp.getUi();
  const name=ui.prompt('نام دعوت','نام فرد یا خانواده',ui.ButtonSet.OK_CANCEL);if(name.getSelectedButton()!==ui.Button.OK||!name.getResponseText().trim())return;
  const people=ui.prompt('اعضا','نام‌ها با ویرگول؛ مثلاً آزی، امین',ui.ButtonSet.OK_CANCEL);if(people.getSelectedButton()!==ui.Button.OK)return;
  const names=split(people.getResponseText());if(!names.length||names.length>25)throw new Error('بین یک تا ۲۵ نام وارد کنید.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);let id;
  try{const sheet=table();id=Math.max(0,...readRows(sheet).map(row=>Number(row[0])||0))+1;sheet.appendRow([id,cell(name.getResponseText().trim()),cell(names.join('، ')),names.map(()=>STATUS.pending).join('، '),'','',0,new Date(),link(id)]);SpreadsheetApp.flush();}finally{lock.releaseLock();}
  ui.alert('لینک دعوت',link(id),ui.ButtonSet.OK);
}
function digest(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value)).map(n=>(n+256).toString(16).slice(-2)).join('');}
// Compatibility for links already shared before the simple numbered invitations.
function legacyFamily(value,isSession){
  if(!/^[a-f0-9]{64}$/.test(value||''))return 0;
  const old=book().getSheetByName('مهمان‌ها');if(!old)return 0;const hashed=digest(value);
  const index=old.getDataRange().getValues().slice(1).filter(row=>row[8]).findIndex(row=>isSession?JSON.parse(row[11]||'[]').some(s=>s.hash===hashed&&s.expires>Date.now()):row[10]===hashed);
  return index<0?0:index+1;
}
function output(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){return output({ok:true,version:'numbered-invitations-v3'});}
function doPost(e){
  const lock=LockService.getScriptLock();let locked=false;
  try{
    const input=JSON.parse(e.postData.contents);
    // Numbered guest links are deliberately public for this family gathering.
    // Only the existing guest operations may be called directly by the hosted static site.
    const guestPaths=['/api/auth/invite','/api/invitation','/api/guest/rsvp','/api/guest/gift-choice','/api/guest/fortune'];
    const publicGuest=!input.secret&&guestPaths.includes(input.path)&&(input.path==='/api/auth/invite'?/^\d{1,6}$/.test(String(input.body?.family||''))||/^[a-f0-9]{64}$/.test(input.body?.token||''):/^(\d{1,6}|[a-f0-9]{64})$/.test(input.session||''));
    if(!publicGuest&&(BACKEND_SECRET==='__BACKEND_SECRET__'||input.secret!==BACKEND_SECRET))problem(403,'دسترسی مجاز نیست.');
    lock.waitLock(15000);locked=true;
    if(!book().getSheetByName('دعوت‌ها'))setup();
    const sheet=table(),rows=readRows(sheet);const result=route(input,rows);
    if(result.row)sheet.getRange(result.rowNumber,1,1,HEADERS.length).setValues([result.row]);
    SpreadsheetApp.flush();return output({status:200,data:result.data});
  }catch(err){return output({status:err.status||500,data:{error:err.status?err.message:'ارتباط شیت برقرار نشد.'}});}finally{if(locked)lock.releaseLock();}
}
function route(input,rows){
  const body=input.body||{},path=input.path;const login=path==='/api/auth/invite'&&input.method==='POST';
  let id=login?Number(body.family)||legacyFamily(body.token,false):(/^\d{1,6}$/.test(input.session||'')?Number(input.session):legacyFamily(input.session,true));
  const index=rows.findIndex(row=>Number(row[0])===id);
  if(!id||index<0||EVENT.status==='archived')problem(401,'این دعوت‌نامه معتبر نیست یا لغو شده است.');
  const row=rows[index];
  if(login)return {data:{session:String(id),invitation:invitation(row,rows)}};
  if(path==='/api/invitation'&&input.method==='GET')return {data:invitation(row,rows)};
  if(input.method!=='POST')problem(405,'روش مجاز نیست.');
  if(EVENT.status!=='open')problem(409,'رویداد بسته است.');
  if(path==='/api/guest/gift-choice'){
    const option=OPTIONS.find(o=>o.id===body.kind);if(!option||typeof body.selected!=='boolean')problem(400,'انتخاب معتبر نیست.');
    const mine=choices(row);
    if(body.selected&&!mine.includes(body.kind)){
      if(mine.length>=2)problem(409,'یکی عالیه، دوتا کافیه.');
      if(rows.filter(r=>choices(r).includes(body.kind)).length>=option.capacity)problem(409,'ظرفیت این گزینه تکمیل است.');
      mine.push(body.kind);
    }
    row[4]=(body.selected?mine:mine.filter(kind=>kind!==body.kind)).map(kind=>OPTIONS.find(o=>o.id===kind).label).join('، ');
  }else if(path==='/api/guest/fortune'){
    if(day(row[5])!==today()){row[5]=today();row[6]=(Math.floor(Date.parse(today())/86400000)+id)%5;}
    return {row,rowNumber:index+2,data:{day:day(row[5]),index:Number(row[6])}};
  }else if(path==='/api/guest/rsvp'){
    if(Date.parse(EVENT.deadline)<Date.now())problem(409,'مهلت پاسخ پایان یافته است.');
    if(body.revision!==revision(row[7]))problem(409,'پاسخ تغییر کرده؛ صفحه را تازه کنید.');
    const people=members(row);
    if(!Array.isArray(body.members)||body.members.length!==people.length||new Set(body.members.map(m=>m.id)).size!==people.length||body.members.some(m=>!people.some(p=>p.id===m.id)||!Object.hasOwn(STATUS,m.status)))problem(400,'اعضا معتبر نیستند.');
    row[3]=people.map(p=>STATUS[body.members.find(m=>m.id===p.id).status]).join('، ');
  }else problem(404,'این بخش فعال نیست.');
  row[7]=new Date();return {row,rowNumber:index+2,data:{ok:true}};
}
function invitation(row,rows){
  return {eventId:SHEET_ID,event:EVENT,household:{id:String(row[0]),name:row[1],greeting:'',plusOnes:0,revision:revision(row[7]),pomegranates:0},members:members(row),response:{message:'',allergies:'',dietary:'',contact:''},attending:rows.reduce((n,r)=>n+members(r).filter(m=>m.status==='attending').length,0),campaigns:[],pledges:[],registry:[],guestbook:[],giftChoices:OPTIONS.map(o=>({kind:o.id,reserved:rows.filter(r=>choices(r).includes(o.id)).length,mine:choices(row).includes(o.id)})),dailyFortune:day(row[5])===today()?{day:day(row[5]),index:Number(row[6])}:null};
}
