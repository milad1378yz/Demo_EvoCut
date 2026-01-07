// Lightweight background particles (no dependencies)
export function attachParticles(canvas){
  const ctx = canvas.getContext("2d");
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;

  const DPR = Math.min(2, window.devicePixelRatio || 1);

  function resize(){
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  const N = Math.floor(Math.min(160, (w*h)/14000));
  const parts = Array.from({length:N}, () => ({
    x: Math.random()*w,
    y: Math.random()*h,
    r: 0.8 + Math.random()*1.8,
    vx: (-0.5 + Math.random()) * 0.35,
    vy: (-0.5 + Math.random()) * 0.35,
    a: 0.08 + Math.random()*0.18
  }));

  let raf = 0;
  function tick(){
    ctx.clearRect(0,0,w,h);

    // soft fog
    ctx.fillStyle = "rgba(255,255,255,0.01)";
    ctx.fillRect(0,0,w,h);

    for (const p of parts){
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -50) p.x = w+50;
      if (p.x > w+50) p.x = -50;
      if (p.y < -50) p.y = h+50;
      if (p.y > h+50) p.y = -50;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${p.a})`;
      ctx.fill();
    }

    // occasional links for extra “fancy”
    ctx.lineWidth = 1;
    for (let i=0;i<parts.length;i++){
      for (let j=i+1;j<parts.length;j++){
        const dx = parts[i].x - parts[j].x;
        const dy = parts[i].y - parts[j].y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 110*110){
          const a = 0.07 * (1 - d2/(110*110));
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.beginPath();
          ctx.moveTo(parts[i].x, parts[i].y);
          ctx.lineTo(parts[j].x, parts[j].y);
          ctx.stroke();
        }
      }
    }

    raf = requestAnimationFrame(tick);
  }
  tick();

  return () => cancelAnimationFrame(raf);
}
