export const SIZE = 44;
export const WALLS = [
  {x:0,z:-22,w:44,d:1,h:5},{x:0,z:22,w:44,d:1,h:5},
  {x:-22,z:0,w:1,d:44,h:5},{x:22,z:0,w:1,d:44,h:5},
  {x:-8,z:-9,w:8,d:5,h:4},{x:8,z:9,w:8,d:5,h:4},
  {x:-8,z:9,w:5,d:8,h:3.7},{x:8,z:-9,w:5,d:8,h:3.7},
  {x:0,z:0,w:5,d:5,h:3.2},
  {x:-15,z:0,w:3,d:3,h:2.2},{x:15,z:0,w:3,d:3,h:2.2},
  {x:0,z:-16,w:4,d:2,h:2},{x:0,z:16,w:4,d:2,h:2}
];
export const SPAWNS = [[-18,-18],[18,18],[-18,18],[18,-18],[-18,5],[18,-5],[5,18],[-5,-18]];
export function blocked(x,z,r=.36){return WALLS.some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}
export function move(p,dx,dz){const x=p.x+dx,z=p.z+dz;if(!blocked(x,p.z))p.x=x;if(!blocked(p.x,z))p.z=z;}
export function rayBox(o,d,min,max){let near=0,far=Infinity;for(let i=0;i<3;i++){if(Math.abs(d[i])<1e-8){if(o[i]<min[i]||o[i]>max[i])return Infinity;continue;}let a=(min[i]-o[i])/d[i],b=(max[i]-o[i])/d[i];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return Infinity;}return near;}
export function wallDistance(o,d){return Math.min(...WALLS.map(b=>rayBox(o,d,[b.x-b.w/2,0,b.z-b.d/2],[b.x+b.w/2,b.h,b.z+b.d/2])));}
