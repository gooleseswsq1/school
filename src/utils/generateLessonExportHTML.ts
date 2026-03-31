import type { LessonData } from "./canvaToLesson";

export function generateLessonExportHTML(lesson: LessonData): string {
  const lessonJson = JSON.stringify(lesson)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${lesson.title.replace(/[<>&"]/g, "")}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f8fafc;color:#1e293b;min-height:100vh;display:flex;flex-direction:column}
.header{background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:16px;font-weight:600}
.progress-bar{height:4px;background:#e2e8f0}.progress-fill{height:100%;background:#3b82f6;transition:width .3s}
.slide-container{flex:1;max-width:800px;margin:24px auto;padding:0 16px;width:100%}
.slide-title{font-size:20px;font-weight:700;margin-bottom:16px;color:#0f172a}
.element{margin-bottom:16px}
.text-el{font-size:14px;line-height:1.7;white-space:pre-wrap;color:#475569}
.image-el{text-align:center}.image-el img{max-width:100%;max-height:400px;border-radius:12px}
.image-el .caption{font-size:12px;color:#94a3b8;margin-top:4px}
.quiz-el{background:#f1f5f9;border-radius:12px;padding:16px;border:1px solid #e2e8f0}
.quiz-el .question{font-size:14px;font-weight:600;margin-bottom:12px}
.quiz-el .option{display:block;width:100%;text-align:left;padding:8px 12px;margin-bottom:6px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;transition:all .2s}
.quiz-el .option:hover:not(:disabled){border-color:#93c5fd;background:#eff6ff}
.quiz-el .option.correct{border-color:#4ade80;background:#f0fdf4;color:#166534}
.quiz-el .option.wrong{border-color:#f87171;background:#fef2f2;color:#991b1b}
.quiz-el .option.show-correct{border-color:#4ade80;background:#f0fdf4;color:#166534}
.quiz-el .option:disabled{cursor:default}
.quiz-el .feedback{font-size:12px;margin-top:8px;padding:8px;border-radius:6px}
.quiz-el .feedback.correct{color:#166534;background:#dcfce7}
.quiz-el .feedback.wrong{color:#991b1b;background:#fee2e2}
.nav{background:#fff;border-top:1px solid #e2e8f0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
.nav button{padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:all .2s}
.nav .prev{background:#f1f5f9;color:#475569}.nav .prev:hover{background:#e2e8f0}
.nav .next{background:#3b82f6;color:#fff}.nav .next:hover{background:#2563eb}
.nav button:disabled{opacity:.4;cursor:default}
.nav .counter{font-size:12px;color:#94a3b8}
</style>
</head>
<body>
<div class="header"><h1 id="lessonTitle"></h1><span id="slideCounter" style="font-size:12px;color:#94a3b8"></span></div>
<div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
<div class="slide-container" id="slideContainer"></div>
<div class="nav">
  <button class="prev" id="prevBtn" onclick="goSlide(-1)">\u2190 Tr\u01b0\u1edbc</button>
  <span class="counter" id="navCounter"></span>
  <button class="next" id="nextBtn" onclick="goSlide(1)">Ti\u1ebfp \u2192</button>
</div>
<script>
var lesson=${lessonJson};
var current=0;
var answers={};
function render(){
  var s=lesson.slides[current];
  document.getElementById("lessonTitle").textContent=lesson.title;
  document.getElementById("progressFill").style.width=((current+1)/lesson.slides.length*100)+"%";
  document.getElementById("slideCounter").textContent=(current+1)+"/"+lesson.slides.length;
  document.getElementById("navCounter").textContent=(current+1)+" / "+lesson.slides.length;
  document.getElementById("prevBtn").disabled=current===0;
  document.getElementById("nextBtn").disabled=current===lesson.slides.length-1;
  var h='<h2 class="slide-title">'+esc(s.title)+'</h2>';
  s.elements.forEach(function(el){
    h+='<div class="element">';
    if(el.type==="text")h+='<div class="text-el">'+esc(el.content)+'</div>';
    else if(el.type==="image"){h+='<div class="image-el"><img src="'+esc(el.url)+'" alt="'+esc(el.caption||"")+'"/>';if(el.caption)h+='<div class="caption">'+esc(el.caption)+'</div>';h+='</div>';}
    else if(el.type==="quiz"){
      var a=answers[el.id];
      h+='<div class="quiz-el"><div class="question">'+esc(el.question)+'</div>';
      el.options.forEach(function(o,i){
        var cls="option";
        if(a!==undefined){
          if(i===a&&i===el.correctIndex)cls+=" correct";
          else if(i===a)cls+=" wrong";
          else if(i===el.correctIndex)cls+=" show-correct";
        }
        h+='<button class="'+cls+'" '+(a!==undefined?'disabled':'')+' onclick="answer(\\''+el.id+"\\',"+i+')">'+esc(o)+"</button>";
      });
      if(a!==undefined){
        var ok=a===el.correctIndex;
        h+='<div class="feedback '+(ok?"correct":"wrong")+'">'+(ok?"\\u2713 Ch\\u00ednh x\\u00e1c!":"\\u2717 \\u0110\\u00e1p \\u00e1n \\u0111\\u00fang: "+esc(el.options[el.correctIndex]));
        if(el.feedback)h+="<br/>"+esc(el.feedback);
        h+="</div>";
      }
      h+="</div>";
    }
    h+="</div>";
  });
  document.getElementById("slideContainer").innerHTML=h;
}
function goSlide(d){current=Math.max(0,Math.min(lesson.slides.length-1,current+d));render();}
function answer(id,i){answers[id]=i;render();}
function esc(s){if(!s)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
render();
</script>
</body>
</html>`;
}
