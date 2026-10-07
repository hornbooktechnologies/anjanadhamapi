/* Deterministic photo extraction: no generative model or face retouching.
 * Keeps source headshots, reuses the existing cream/gold decorative background.
 */
const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const source = path.join(root, "AAJANADDHAM  MITING  14_/_034.jpg");
const reference = path.join(root, "anjanadham/public/images/keymembers/keymemember2.png");
const out = path.join(root, "anjanadham/public/images/keymembers/trustees");
const review = path.join(root, "anjanadhamapi/.agent/trustee-portraits");
const portraits = [
  { name: "Shri Amitbhai Chaudhary", slug: "amitbhai-chaudhary", cx:316, cy:960, radius:127 },
  { name: "Shri Kanubhai Chaudhary", slug: "kanubhai-chaudhary", cx:316, cy:1282, radius:127 },
  { name: "Shri Manojkumar Chaudhary", slug: "manojkumar-chaudhary", cx:316, cy:1608, radius:127 },
  { name: "Shri Rameshbhai Patel", slug: "rameshbhai-patel", cx:316, cy:1930, radius:127 },
  { name: "Shri Vishnubhai Chaudhary", slug: "vishnubhai-chaudhary", cx:1662, cy:1279, radius:131 },
  { name: "Shri Babubhai Chaudhary", slug: "babubhai-chaudhary", cx:1672, cy:1632, radius:130 },
  { name: "Shri R. D. Chaudhary", slug: "r-d-chaudhary", cx:2917, cy:960, radius:127 },
  { name: "Shri Jesingbhai Chaudhary", slug: "jesingbhai-chaudhary", cx:2917, cy:1282, radius:127 },
  { name: "Shri D. G. Chaudhary", slug: "d-g-chaudhary", cx:2917, cy:1606, radius:127 },
  { name: "Shri D. S. Chaudhary", slug: "d-s-chaudhary", cx:2917, cy:1921, radius:127 },
];

async function background() {
  // Reuse only known background pixels; no reference person's pixels enter
  // the central frame. Hidden backdrop areas use plain colour interpolation.
  const {info}=await sharp(reference).raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height,n=info.channels;
  const pixels=Buffer.alloc(w*h*3);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const shade=y/(h-1);
    const upper=[255,251,239],lower=[255,243,218];
    for(let c=0;c<3;c++)pixels[(y*w+x)*3+c]=Math.round(upper[c]*(1-shade)+lower[c]*shade);
  }
  const smooth=await sharp(pixels,{raw:{width:w,height:h,channels:3}}).blur(30).png().toBuffer();
  const fade=async(input,width,height,type)=>{
    const gradient=type==='left'?'<linearGradient id="g"><stop offset="0" stop-color="white"/><stop offset="0.45" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>':type==='right'?'<linearGradient id="g"><stop offset="0" stop-color="black"/><stop offset="0.8" stop-color="white"/></linearGradient>':'<linearGradient id="g" x2="0" y2="1"><stop offset="0" stop-color="white"/><stop offset="0.4" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>';
    const svg=Buffer.from(`<svg width="${width}" height="${height}"><defs>${gradient}</defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
    const mask=await sharp(svg).removeAlpha().greyscale().raw().toBuffer();
    const rgba=await sharp(input).ensureAlpha().raw().toBuffer();
    for(let i=0;i<width*height;i++)rgba[i*4+3]=mask[i];
    return sharp(rgba,{raw:{width,height,channels:4}}).png().toBuffer();
  };
  const leavesLeft=await fade(await sharp(reference).extract({left:0,top:0,width:145,height:700}).resize(145,h).png().toBuffer(),145,h,'left');
  const leavesRight=await fade(await sharp(reference).extract({left:w-75,top:0,width:75,height:700}).resize(75,h).png().toBuffer(),75,h,'right');
  const top=await fade(await sharp(reference).extract({left:0,top:0,width:w,height:90}).png().toBuffer(),w,90,'top');
  const lotusRaw=await sharp(reference).extract({left:912,top:244,width:235,height:243}).ensureAlpha().raw().toBuffer();
  for(let y=0;y<243;y++)for(let x=0;x<235;x++)lotusRaw[(y*235+x)*4+3]=Math.round(Math.min(1,x/45,y/45,(234-x)/45,(242-y)/45)*255);
  const lotus=await sharp(lotusRaw,{raw:{width:235,height:243,channels:4}}).png().toBuffer();
  const trim=Buffer.from(`<svg width="${w}" height="${h}"><circle cx="627" cy="627" r="585" fill="none" stroke="#f7dda0" stroke-width="18"/><circle cx="627" cy="650" r="460" fill="#fffef9" stroke="#d8b55d" stroke-width="7"/></svg>`);
  const plate=await sharp(smooth).composite([{input:leavesLeft,left:0,top:0},{input:leavesRight,left:w-75,top:0},{input:top,left:0,top:0},{input:lotus,left:912,top:244},{input:trim,left:0,top:0}]).png().toBuffer();
  await sharp(plate).toFile(path.join(out,'matching-portrait-background.png'));
  return plate;
}

async function main() {
  fs.mkdirSync(out,{recursive:true}); fs.mkdirSync(review,{recursive:true});
  const plate=await background();
  const tiles=[],finished=[];
  for(const [i,p] of portraits.entries()) {
    const width=p.radius*2;
    const crop=await sharp(source).extract({left:p.cx-p.radius,top:p.cy-p.radius,width,height:width}).png().toBuffer();
    await sharp(crop).toFile(path.join(review,p.slug+'-source.png'));
    const originals=path.join(out,'originals');fs.mkdirSync(originals,{recursive:true});
    await sharp(crop).toFile(path.join(originals,p.slug+'.png'));
    // Keep the complete source headshot inside its existing circular crop.
    const circle=Buffer.from(`<svg width="${width}" height="${width}"><circle cx="${p.radius}" cy="${p.radius}" r="${p.radius-2}" fill="white"/></svg>`);
    const head=await sharp(crop).ensureAlpha().composite([{input:circle,blend:'dest-in'}]).png().toBuffer();
    const display=await sharp(head).resize(900,900,{kernel:'lanczos3'}).png().toBuffer();
    const final=await sharp(plate).composite([{input:display,left:177,top:200}]).png().toBuffer();
    await sharp(final).toFile(path.join(out,p.slug+'.png'));
    p.photo='/images/keymembers/trustees/'+p.slug+'.png';
    finished.push({input:await sharp(final).resize(250,250).png().toBuffer(),left:(i%5)*270+10,top:Math.floor(i/5)*310+10});
    const tile=await sharp(crop).resize(280,280).png().toBuffer();
    const text=Buffer.from(`<svg width="300" height="330"><rect width="300" height="330" fill="#fff"/><text x="150" y="310" text-anchor="middle" font-family="Arial" font-size="16">${p.name.replace('Shri ','')}</text></svg>`);
    const labeled=await sharp(text).composite([{input:tile,left:10,top:10}]).png().toBuffer();
    tiles.push({input:labeled,left:(i%5)*300,top:Math.floor(i/5)*330});
  }
  await sharp({create:{width:1500,height:660,channels:3,background:'#eeeeee'}}).composite(tiles).png().toFile(path.join(review,'source-headshots.png'));
  const labels=Buffer.from(`<svg width="1350" height="620">${portraits.map((p,i)=>`<text x="${(i%5)*270+135}" y="${Math.floor(i/5)*310+283}" text-anchor="middle" font-family="Arial" font-size="15">${p.name.replace('Shri ','')}</text>`).join('')}</svg>`);
  await sharp({create:{width:1350,height:620,channels:3,background:'#f8f5ed'}}).composite([...finished,{input:labels,left:0,top:0}]).png().toFile(path.join(review,'finished-portraits.png'));
  fs.writeFileSync(path.join(review,'portrait-manifest.json'),JSON.stringify({source,reference,portraits},null,2));
  console.log('Created 10 framed portraits and retained native-resolution original crops. No generated or retouched faces.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
