let weatherSourceMode='cache';
let currentTimezone=null;
let lastWeatherRefresh=0;
let weatherRefreshInFlight=false;

const windDirBtn=document.getElementById('windDirBtn');
const windDirCard=document.getElementById('windDirCard');
const windDirArrow=document.getElementById('windDirArrow');
const windDirToward=document.getElementById('windDirToward');
const windDirFrom=document.getElementById('windDirFrom');

async function loadCatalog(){
  try{
    catalog=await fetch(`https://raw.githubusercontent.com/bennessism/window/main/weather/catalog.json?ts=${Date.now()}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json()})
  }catch(e){
    catalog={default:{country:'my',location:'selangor'},countries:{my:{name:'Malaysia',locations:[{id:'selangor',name:'Selangor',city:'Shah Alam',lat:3.0738,lon:101.5183}]}}}
  }
  populateCountries()
}

function populateCountries(){
  countrySelect.innerHTML='';
  Object.entries(catalog.countries).forEach(([id,c])=>{const o=document.createElement('option');o.value=id;o.textContent=c.name;countrySelect.append(o)});
  countrySelect.value=localStorage.getItem('windCountry')||catalog.default.country||'my';
  if(!catalog.countries[countrySelect.value])countrySelect.value=Object.keys(catalog.countries)[0];
  populateLocations()
}

function populateLocations(){
  locationSelect.innerHTML='';
  const c=catalog.countries[countrySelect.value];
  c.locations.forEach(l=>{const o=document.createElement('option');o.value=l.id;o.textContent=l.name+(l.city&&l.city!==l.name?' · '+l.city:'');locationSelect.append(o)});
  const saved=localStorage.getItem('windLocation')||catalog.default.location;
  if(c.locations.some(l=>l.id===saved))locationSelect.value=saved
}

function selectedLocation(){
  const c=catalog.countries[countrySelect.value];
  return c.locations.find(l=>l.id===locationSelect.value)||c.locations[0]
}

function labelFor(loc){return loc.city&&loc.city!==loc.name?`${loc.name} · ${loc.city}`:loc.name}
function areaFor(loc){return loc.name||loc.city||'Location'}
function fmtTime(iso){if(!iso)return'--';const m=String(iso).match(/T(\d{2}):(\d{2})/);if(!m)return'--';let h=Number(m[1]);const min=m[2],s=h>=12?'PM':'AM';h=h%12||12;return`${h}:${min} ${s}`}

function liveDayForTimezone(timezone,fallback){
  if(!timezone)return fallback;
  try{
    const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',hourCycle:'h23'}).format(new Date()));
    if(Number.isFinite(hour))return hour>=6&&hour<19;
  }catch(e){}
  return fallback;
}

function applyDayNight(nextDay){
  const changed=nextDay!==isDay;
  isDay=nextDay;
  document.querySelector('meta[name="theme-color"]').content=isDay?'#76b7e8':'#07111f';
  if(changed)seedScene(stage.clientWidth,stage.clientHeight)
}

function syncDayNight(){
  applyDayNight(liveDayForTimezone(currentTimezone,isDay));
  if(typeof refreshWeatherTime==='function')refreshWeatherTime()
}

function refreshDirectionUI(){
  const fromDeg=((Number(windDir)||0)%360+360)%360;
  const towardDeg=(fromDeg+180)%360;
  const fromName=compassName(fromDeg),towardName=compassName(towardDeg);
  windDirArrow.style.transform=`translate(-50%,-45%) rotate(${towardDeg}deg)`;
  windDirToward.textContent=`Toward ${towardName} · ${Math.round(towardDeg)}°`;
  windDirFrom.textContent=`From ${fromName} · ${Math.round(fromDeg)}°`;
  windDirBtn.setAttribute('aria-label',`Wind blowing toward ${towardName}, from ${fromName}`);
}

function refreshUI(updatedIso,weatherText=''){
  const strength=windStrength(wind),dir=compassName(windDir);
  summaryLine.textContent=`${currentArea} · ${strength} · ${Math.round(wind)} km/h`;
  detailLoc.textContent=currentPlace;
  conditionEl.textContent=weatherText?`${strength} · ${weatherText}`:strength;
  speedEl.textContent=Math.round(wind);
  gustEl.textContent=Math.round(gust)+' km/h';
  fromText.textContent='From '+dir;
  directionEl.textContent=`${dir} · ${Math.round(windDir)}°`;
  updatedEl.textContent='Updated '+fmtTime(updatedIso);
  refreshDirectionUI()
}

function applyWindData(data,label,area){
  currentPlace=label;
  currentArea=area;
  currentLat=Number(data.latitude ?? currentLat);
  currentLon=Number(data.longitude ?? currentLon);
  wind=Number(data.wind_speed_kmh)||0;
  gust=Number(data.wind_gusts_kmh)||wind;
  windDir=Number(data.wind_direction_deg)||0;
  currentTimezone=data.timezone||currentTimezone;
  const cachedDay=typeof data.is_day==='boolean'?data.is_day:Number(data.is_day)===1;
  applyDayNight(liveDayForTimezone(currentTimezone,cachedDay));
  if(typeof applyWeatherEffects==='function')applyWeatherEffects(data);
  const precipitation=Math.max(0,Number(data.precipitation_mm||0),Number(data.rain_mm||0)+Number(data.showers_mm||0));
  const weatherText=typeof weatherEffectName==='function'&&typeof weatherEffectKind==='function'
    ?weatherEffectName(weatherEffectKind(Number(data.weather_code||0),precipitation))
    :'';
  refreshUI(data.time,weatherText);
  seedScene(stage.clientWidth,stage.clientHeight)
}

async function loadCachedWind(countryCode=countrySelect.value,locationId=locationSelect.value){
  const country=catalog?.countries?.[countryCode];
  const loc=country?.locations?.find(l=>l.id===locationId)||country?.locations?.[0];
  if(!loc||weatherRefreshInFlight)return;
  weatherRefreshInFlight=true;
  weatherSourceMode='cache';
  currentLat=loc.lat;
  currentLon=loc.lon;
  currentPlace=labelFor(loc);
  currentArea=areaFor(loc);
  try{
    const url=`https://raw.githubusercontent.com/bennessism/window/main/weather/data/${countryCode}.json?ts=${Date.now()}`;
    const payload=await fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json()});
    const data=payload.locations?.[loc.id];
    if(!data)throw new Error();
    lastWeatherRefresh=Date.now();
    applyWindData(data,labelFor(loc),areaFor(loc))
  }catch(e){
    summaryLine.textContent=currentArea+' · data unavailable'
  }finally{
    weatherRefreshInFlight=false
  }
}

function refreshCurrentWind(){return loadCachedWind(countrySelect.value,locationSelect.value)}
function refreshWhenActive(force=false){
  if(document.hidden||!catalog)return;
  if(!force&&Date.now()-lastWeatherRefresh<60*1000)return;
  refreshCurrentWind()
}

summaryBtn.onclick=()=>{const open=detailCard.classList.toggle('show');summaryBtn.classList.toggle('open',open);if(!open)picker.classList.remove('show')};
document.getElementById('detailClose').onclick=()=>{detailCard.classList.remove('show');summaryBtn.classList.remove('open');picker.classList.remove('show')};
document.getElementById('changeLocationBtn').onclick=()=>picker.classList.toggle('show');
countrySelect.onchange=populateLocations;
document.getElementById('applyLocationBtn').onclick=()=>{
  const loc=selectedLocation();
  localStorage.setItem('windCountry',countrySelect.value);
  localStorage.setItem('windLocation',loc.id);
  picker.classList.remove('show');
  loadCachedWind(countrySelect.value,loc.id)
};

windDirBtn.onclick=()=>{
  const open=windDirCard.classList.toggle('show');
  windDirCard.setAttribute('aria-hidden',String(!open));
  windDirBtn.setAttribute('aria-expanded',String(open));
};

scroller.addEventListener('scroll',()=>{if(innerWidth>700)return;const i=Math.max(0,Math.min(2,Math.round(scroller.scrollLeft/innerWidth)));document.querySelectorAll('.dots i').forEach((d,n)=>d.classList.toggle('on',n===i))},{passive:true});
addEventListener('resize',resize);
addEventListener('focus',()=>refreshWhenActive(true));
addEventListener('pageshow',()=>refreshWhenActive(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncDayNight();refreshWhenActive(true)}});
resize();
requestAnimationFrame(draw);
loadCatalog().then(()=>{const loc=selectedLocation();loadCachedWind(countrySelect.value,loc.id)});
setInterval(syncDayNight,60*1000);
setInterval(()=>refreshWhenActive(false),15*60*1000);
