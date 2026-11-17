/** Dán vào Tiện ích mở rộng → Apps Script của Google Sheet chứa dữ liệu (trang tính đầu tiên = danh sách người dùng) */
const TZ = 'Asia/Ho_Chi_Minh';
const NAME='Họ tên', PHONE='Số điện thoại', DOB='Ngày sinh', STREAK='Chuỗi', BEST='Chuỗi cao nhất',
      LDATE='Ngày điểm danh gần nhất', LTIME='Giờ điểm danh gần nhất', TOTAL='Tổng ngày điểm danh';
const COLS=[NAME,PHONE,DOB,STREAK,BEST,LDATE,LTIME,TOTAL];

function doGet(){ return out({ok:true}); }
function doPost(e){
  const lock=LockService.getScriptLock(); lock.waitLock(20000);
  try{ return out(handle(JSON.parse(e.postData.contents))); }
  catch(err){ return out({error:'Lỗi máy chủ: '+err.message}); }
  finally{ lock.releaseLock(); }
}
function out(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function p2(n){ return ('0'+n).slice(-2); }
function nphone(v){
  let s=String(v==null?'':v).replace(/\D/g,'');
  if(s.indexOf('84')===0&&s.length===11) s='0'+s.slice(2);
  if(s.length===9) s='0'+s;
  return s;
}
function pdate(v,tz){ // trả về 'yyyy-MM-dd' hoặc ''
  if(v instanceof Date) return Utilities.formatDate(v,tz,'yyyy-MM-dd');
  const s=String(v==null?'':v).trim(); let m;
  if((m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/))) return m[1]+'-'+p2(m[2])+'-'+p2(m[3]);
  if((m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))) return m[3]+'-'+p2(m[2])+'-'+p2(m[1]);
  return '';
}
function dd(a,b){ const t=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10)); return Math.round((t(a)-t(b))/864e5); }
function vn(s){ return s?s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4):''; }
function state(v,c,tz,today,now){
  const g=k=>v[c[k]-1], last=pdate(g(LDATE),tz);
  let streak=+g(STREAK)||0; if(!last||dd(today,last)>1) streak=0; // chuỗi đã đứt
  return {name:g(NAME),phone:nphone(g(PHONE)),streak:streak,best:+g(BEST)||0,total:+g(TOTAL)||0,
          checked:last===today,last_date:vn(last),last_time:String(g(LTIME)||''),now:now.toISOString()};
}
function handle(b){
  const ss=SpreadsheetApp.getActiveSpreadsheet(), ws=ss.getSheets()[0], tz=ss.getSpreadsheetTimeZone();
  const now=new Date(), today=Utilities.formatDate(now,TZ,'yyyy-MM-dd');
  const hdr=ws.getRange(1,1,1,Math.max(ws.getLastColumn(),1)).getValues()[0].map(x=>String(x).trim());
  COLS.forEach(h=>{ if(hdr.indexOf(h)<0){ hdr.push(h); ws.getRange(1,hdr.length).setValue(h); } });
  const c={}; hdr.forEach((h,i)=>{ if(h) c[h]=i+1; });
  const phone=nphone(b.phone), dob=pdate(b.dob,tz); let r=0;
  if(phone&&dob){
    const rows=ws.getDataRange().getValues();
    for(let i=1;i<rows.length;i++){
      if(nphone(rows[i][c[PHONE]-1])===phone&&pdate(rows[i][c[DOB]-1],tz)===dob){ r=i+1; break; }
    }
  }
  if(!r) return {error:b.action==='login'?'Sai số điện thoại hoặc ngày sinh':'Phiên đăng nhập đã hết hạn',code:401};
  const row=()=>ws.getRange(r,1,1,hdr.length).getValues()[0];
  const get=k=>row()[c[k]-1];
  const st=()=>state(row(),c,tz,today,now);
  const put=(k,v,text)=>{ const cell=ws.getRange(r,c[k]); if(text) cell.setNumberFormat('@'); cell.setValue(v); };
  const logRow=a=>{
    const lg=ss.getSheetByName('NhatKy')||ss.insertSheet('NhatKy');
    if(lg.getLastRow()===0) lg.appendRow(['Thời gian','Số điện thoại','Họ tên','Hành động']);
    lg.appendRow([Utilities.formatDate(now,TZ,'dd/MM/yyyy HH:mm:ss'),"'"+phone,get(NAME),a]);
  };
  if(b.action==='checkin'){
    const last=pdate(get(LDATE),tz);
    if(last===today) return Object.assign({error:'Hôm nay bạn đã điểm danh rồi'},st());
    const streak=last&&dd(today,last)===1?(+get(STREAK)||0)+1:1;
    put(STREAK,streak); put(BEST,Math.max(streak,+get(BEST)||0));
    put(LDATE,vn(today),true); put(LTIME,Utilities.formatDate(now,TZ,'HH:mm:ss'),true);
    put(TOTAL,(+get(TOTAL)||0)+1);
    logRow('Điểm danh (chuỗi '+streak+')');
  } else if(b.action==='reset'){
    [STREAK,BEST,TOTAL].forEach(k=>put(k,0)); put(LDATE,'',true); put(LTIME,'',true);
    logRow('RESET toàn bộ tiến độ');
  }
  SpreadsheetApp.flush();
  return st();
}
