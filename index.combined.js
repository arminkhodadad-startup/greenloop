
;
const m=document.getElementById('tourModal');document.getElementById('tourBtn').onclick=()=>m.classList.add('open');document.getElementById('closeTour').onclick=()=>m.classList.remove('open');m.onclick=e=>{if(e.target===m)m.classList.remove('open')};