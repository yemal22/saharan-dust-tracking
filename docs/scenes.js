"use strict";
(() => {
  const get = id => document.getElementById(id);
  const color = {ink:"#202124",blue:"#36566C",paper:"#FAFAF7",pale:"#D8E2E8",line:"#A8C3D3"};
  const contexts = Object.fromEntries(["product","image-demo","area-demo","check-demo"].map(id=>[id,get(id).getContext("2d")]));
  function clear(ctx) {
    ctx.fillStyle=color.paper;
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  }
  function text(ctx,label,x,y,size=24) {
    ctx.fillStyle=color.ink;ctx.font=size+"px Arial";ctx.fillText(label,x,y);
  }
  function plume(ctx,x,y,scale=1) {
    ctx.beginPath();
    for(let i=0;i<=70;i++){
      const angle=i*Math.PI*2/70;
      const radius=1+.17*Math.sin(3*angle)+.08*Math.cos(5*angle);
      const px=x+160*scale*radius*Math.cos(angle),py=y+65*scale*radius*Math.sin(angle);
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();
  }
  let productFrame=0, productRunning=false, areaProgress=0, areaRunning=false;
  function productDraw() {
    const ctx=contexts.product;clear(ctx);
    const t=productFrame/100;
    const x=760-500*t,y=235+30*Math.sin(t*3);
    text(ctx,"DUST REPLAY",32,42,20);
    text(ctx,t<.2?"1  Receive an image":t<.5?"2  Highlight the dust":"3  Follow it through time",32,85,30);
    ctx.strokeStyle="#E0E3E2";ctx.lineWidth=1;
    for(let col=30;col<980;col+=50){ctx.beginPath();ctx.moveTo(col,115);ctx.lineTo(col,400);ctx.stroke();}
    for(let row=125;row<410;row+=50){ctx.beginPath();ctx.moveTo(30,row);ctx.lineTo(970,row);ctx.stroke();}
    plume(ctx,x,y,1);ctx.fillStyle="#C8BC9E";ctx.fill();
    if(t>=.2){ctx.strokeStyle=color.blue;ctx.lineWidth=4;ctx.stroke();ctx.fillStyle="#36566C33";ctx.fill();}
    if(t>=.5){
      ctx.strokeStyle=color.blue;ctx.lineWidth=3;ctx.beginPath();
      for(let k=0;k<=productFrame;k+=2){const px=760-5*k,py=235+30*Math.sin(k*.03);if(!k)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
      ctx.stroke();ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fillStyle=color.blue;ctx.fill();
    }
    text(ctx,"Earlier",760,427,18);text(ctx,"Later",170,427,18);
    get("product-time").value=productFrame;
    get("product-label").textContent=t<.2?"An image arrives":t<.5?"A footprint appears":"A path emerges";
  }
  get("product-play").onclick=()=>{if(productFrame>=100)productFrame=0;productRunning=!productRunning;get("product-play").textContent=productRunning?"Pause":"Play the idea";};
  get("product-time").oninput=event=>{productRunning=false;get("product-play").textContent="Play the idea";productFrame=Number(event.target.value);productDraw();};

  const photograph=new Image();
  let reveal=0,revealing=false, pixels;
  photograph.onload=()=>{
    const buffer=document.createElement("canvas");buffer.width=700;buffer.height=450;
    const ctx=buffer.getContext("2d");ctx.drawImage(photograph,0,0,700,450);
    pixels=ctx.getImageData(0,0,700,450);
    imageDraw();
  };
  photograph.src=document.querySelector('img[alt*="NASA Terra MODIS"]')?.src || "assets/cabo-verde.webp";
  function imageDraw(){
    const ctx=contexts["image-demo"];clear(ctx);
    if(!pixels){text(ctx,"Loading satellite image…",30,60);return;}
    const ratio=Math.min(700/photograph.width,450/photograph.height);
    const w=photograph.width*ratio,h=photograph.height*ratio;
    ctx.drawImage(photograph,0,0,photograph.width,photograph.height,0,10,w,h);
    const cutoff=Number(get("image-sensitivity").value);
    let selected=0;
    const overlay=document.createElement("canvas");overlay.width=700;overlay.height=450;
    const octx=overlay.getContext("2d"), data=octx.createImageData(700,450);
    for(let i=0;i<pixels.data.length;i+=4){
      const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
      const keep=r>b+8+cutoff*.22 && r>g-6 && g>b+3 && r>70 && r<240;
      if(keep){selected++;data.data[i]=54;data.data[i+1]=86;data.data[i+2]=108;data.data[i+3]=185;}
    }
    octx.putImageData(data,0,0);
    ctx.save();ctx.beginPath();ctx.rect(0,10,w*reveal,h);ctx.clip();ctx.drawImage(overlay,0,10,w,h);ctx.restore();
    text(ctx,"A simple first try",730,110,26);
    text(ctx,"Look for tan pixels.",730,155,20);
    text(ctx,"Check the clouds.",730,195,20);
    text(ctx,"Check the islands.",730,230,20);
    text(ctx,reveal?Math.round(selected/315000*100)+"% selected":"Real satellite image",730,300,22);
  }
  get("image-reveal").onclick=()=>{reveal=0;revealing=true;};
  get("image-sensitivity").oninput=()=>{reveal=1;imageDraw();};

  const cells=[];
  const area=contexts["area-demo"];
  plume(area,490,205,1.65);
  for(let y=75;y<345;y+=24)for(let x=175;x<825;x+=24)if(area.isPointInPath(x+12,y+12))cells.push([x,y]);
  function areaDraw(){
    const ctx=contexts["area-demo"];clear(ctx);
    plume(ctx,490,205,1.65);ctx.fillStyle="#D6C9AD";ctx.fill();
    ctx.strokeStyle="#B8BDBB";ctx.lineWidth=1;
    for(let y=75;y<=345;y+=24){ctx.beginPath();ctx.moveTo(175,y);ctx.lineTo(823,y);ctx.stroke();}
    for(let x=175;x<=823;x+=24){ctx.beginPath();ctx.moveTo(x,75);ctx.lineTo(x,339);ctx.stroke();}
    ctx.fillStyle=color.blue;cells.slice(0,areaProgress).forEach(([x,y])=>ctx.fillRect(x+2,y+2,20,20));
    get("area-count").textContent=areaProgress+" covered squares";
    text(ctx,"One square → one piece of ground",255,390,24);
  }
  get("area-play").onclick=()=>{areaProgress=0;areaRunning=true;};
  function checkDraw(){
    const ctx=contexts["check-demo"];clear(ctx);
    const shift=Number(get("check-shift").value)*2;
    plume(ctx,470,210,1.5);ctx.fillStyle="#D6C9AD";ctx.fill();ctx.strokeStyle="#202124";ctx.lineWidth=3;ctx.stroke();
    plume(ctx,470+shift,210,1.5);ctx.strokeStyle=color.blue;ctx.setLineDash([12,9]);ctx.lineWidth=5;ctx.stroke();ctx.setLineDash([]);
    text(ctx,"Hand-drawn",45,50,22);text(ctx,"Computer",755,50,22);
    get("check-label").textContent=Math.abs(shift)<15?"The outlines agree":"Extra pixels on one side; missed pixels on the other";
  }
  get("check-shift").oninput=checkDraw;
  let last=0;
  function animate(now){
    if(now-last>45){
      if(productRunning&&!get("product").closest("section").hidden){
        productFrame=Math.min(100,productFrame+1);productDraw();
        if(productFrame===100){productRunning=false;get("product-play").textContent="Replay";}
      }
      if(revealing&&!get("image-demo").closest("section").hidden){reveal=Math.min(1,reveal+.035);imageDraw();if(reveal===1)revealing=false;}
      if(areaRunning&&!get("area-demo").closest("section").hidden){areaProgress=Math.min(cells.length,areaProgress+3);areaDraw();if(areaProgress===cells.length)areaRunning=false;}
      last=now;
    }
    requestAnimationFrame(animate);
  }
  productDraw();areaDraw();checkDraw();requestAnimationFrame(animate);
})();
