import Colorjs from "colorjs.io"

window.oklchDistance =  function oklchDistance(colorA, colorB) {
    const a = new Colorjs(colorA)
    const b = new Colorjs(colorB)

    const h1 = (getSaveH(Number(a.lch.h)) * Math.PI) / 180;
    const h2 = (getSaveH(b.lch.h) * Math.PI) / 180;

    const aX = a.lch.c * Math.cos(h1);
    const aY = a.lch.c * Math.sin(h1);

    const bX = b.lch.c * Math.cos(h2);
    const bY = b.lch.c * Math.sin(h2);

    const deltaL = a.lch.l - b.lch.l;
    const deltaX = aX - bX;
    const deltaY = aY - bY;

    return Math.sqrt(deltaL ** 2 + deltaX ** 2 + deltaY ** 2);
}
window.reverentColor = (color)=>{
    const a= new Colorjs(color)
    a.lch.h = (a.lch.h+180)%360
    return `oklch(${a.oklch.toString().replace(/,/g,' ')})`
}
function getSaveH(value){
    return isNaN(value)?180:value
}