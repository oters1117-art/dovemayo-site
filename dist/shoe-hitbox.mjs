// Opaque silhouette of emoji/1f45e.svg sampled at 3 cells per CSS pixel.
// Excludes transparent padding and the separately rendered landing shadow.
export const SHOE_SIZE=24;
export const shoeAngle=(p,age)=>Math.min(1,(age-p.born)/p.duration)*4;
const spans=[[9,17,21],[10,16,22],[11,15,22],[12,14,23],[13,13,24],[14,12,24],[15,11,25],[16,10,26],[17,9,26],[18,8,27],[19,8,28],[20,7,30],[21,7,31],[22,6,33],[22,43,46],[23,4,46],[24,3,48],[25,3,48],[26,2,48],[27,1,48],[28,1,49],[29,1,49],[30,1,51],[31,2,51],[32,3,51],[33,4,51],[34,6,51],[35,7,52],[36,8,53],[37,9,53],[38,10,53],[39,12,53],[40,13,54],[41,14,54],[42,16,54],[43,17,20],[43,23,55],[44,24,55],[45,25,56],[46,26,56],[47,27,57],[48,28,57],[49,29,58],[50,29,59],[51,30,60],[52,31,61],[53,32,62],[54,33,63],[55,34,65],[56,35,66],[57,36,67],[58,38,69],[59,39,70],[60,40,70],[61,42,71],[62,44,71],[63,45,72],[64,47,72],[65,49,71],[66,52,71],[67,54,71],[68,57,71],[69,60,71],[70,63,70],[71,68,70]];
export function shoeTouches(p,point,age,radius=4){
 const dx=point.x-p.x,dy=point.y-p.y;if(Math.hypot(dx,dy)>Math.SQRT2*SHOE_SIZE/2+radius)return false;
 const angle=shoeAngle(p,age),c=Math.cos(angle),s=Math.sin(angle);
 const x=dx*c+dy*s,y=-dx*s+dy*c,half=SHOE_SIZE/2,cell=SHOE_SIZE/72;
 for(const [row,left,right] of spans){
  const x0=left*cell-half,x1=right*cell-half,y0=row*cell-half,y1=y0+cell;
  const ex=Math.max(x0-x,0,x-x1),ey=Math.max(y0-y,0,y-y1);
  if(ex*ex+ey*ey<=radius*radius)return true;
 }return false;
}
