!function(){function t(t){return!!t.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/)&&RegExp.$1}function e(t){if(document.body.querySelectorAll(".gallery").forEach((function(t){t.classList.remove("gallery")})),t.closest("ul, p")){var e,i=t.closest("ul, p").querySelectorAll("a[class*='lightbox-']");i.forEach((function(t){t.classList.remove("current")})),i.forEach((function(e){t.getAttribute("href")==e.getAttribute("href")&&e.classList.add("current")})),i.length>1&&(document.getElementById("lightbox").classList.add("gallery"),i.forEach((function(t){t.classList.add("gallery")})));var n=document.querySelectorAll("a.gallery");if(Object.keys(n).forEach((function(t){n[t].classList.contains("current")&&(e=t)})),e==n.length-1)var a=0;else a=parseInt(e)+1;if(0==e)var l=parseInt(n.length-1);else l=parseInt(e)-1;document.getElementById("next").addEventListener("click",(function(){n[a].click()})),document.getElementById("prev").addEventListener("click",(function(){n[l].click()}))}}document.addEventListener("DOMContentLoaded",(function(){var i=document.createElement("div");i.setAttribute("id","lightbox"),document.body.appendChild(i),document.querySelectorAll("a").forEach((function(i){var n=i.getAttribute("href");if(n&&(-1===n.indexOf("vimeo")||i.classList.contains("no-lightbox")||function(t,i){var n=!1,a=new XMLHttpRequest;a.onreadystatechange=function(){if(a.readyState==XMLHttpRequest.DONE)if(200==a.status){var t=JSON.parse(a.responseText);n=t.video_id,console.log(n),i.classList.add("lightbox-vimeo"),i.setAttribute("data-id",n),i.addEventListener("click",(function(t){t.preventDefault(),document.getElementById("lightbox").innerHTML='<a id="close"></a><a id="next">&rsaquo;</a><a id="prev">&lsaquo;</a><div class="videoWrapperContainer"><div class="videoWrapper"><iframe src="https://player.vimeo.com/video/'+i.getAttribute("data-id")+'/?autoplay=1&byline=0&title=0&portrait=0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div></div>',document.getElementById("lightbox").style.display="block",e(this)}))}else 400==a.status?alert("There was an error 400"):alert("something else other than 200 was returned")},a.open("GET","https://vimeo.com/api/oembed.json?url="+t,!0),a.send()}(n,i),t(n)&&!i.classList.contains("no-lightbox")&&(i.classList.add("lightbox-youtube"),i.setAttribute("data-id",t(n))),function(t){return!!t.match(/([a-z\-_0-9\/\:\.]*\.(jpg|jpeg|png|gif))/i)}(n)&&!i.classList.contains("no-lightbox"))){i.classList.add("lightbox-image");var a=i.getAttribute("href").split("/").pop().split(".")[0];i.setAttribute("title",a)}})),document.getElementById("lightbox").addEventListener("click",(function(t){"next"!=t.target.id&&"prev"!=t.target.id&&(this.innerHTML="",document.getElementById("lightbox").style.display="none")})),document.querySelectorAll("a.lightbox-youtube").forEach((function(t){t.addEventListener("click",(function(t){t.preventDefault(),document.getElementById("lightbox").innerHTML='<a id="close"></a><a id="next">&rsaquo;</a><a id="prev">&lsaquo;</a><div class="videoWrapperContainer"><div class="videoWrapper"><iframe src="https://www.youtube.com/embed/'+this.getAttribute("data-id")+'?autoplay=1&showinfo=0&rel=0"></iframe></div>',document.getElementById("lightbox").style.display="block",e(this)}))})),document.querySelectorAll("a.lightbox-image").forEach((function(t){t.addEventListener("click",(function(t){t.preventDefault(),document.getElementById("lightbox").innerHTML='<a id="close"></a><a id="next">&rsaquo;</a><a id="prev">&lsaquo;</a><div class="img" style="background: url(\''+this.getAttribute("href")+'\') center center / contain no-repeat;" title="'+this.getAttribute("title")+'" ><img src="'+this.getAttribute("href")+'" alt="'+this.getAttribute("title")+'" /></div><span>'+this.getAttribute("title")+"</span>",document.getElementById("lightbox").style.display="block",e(this)}))}))}))}();