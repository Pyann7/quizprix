/**
 * EduRace – Animated Race Tracks & SVG Visuals (Redesigned & Precision Bounded)
 * Themes: rocket, car, tug, cook, plant, climb, swim, train
 */

const C1 = '#3B82F6'; // Team Blue
const C2 = '#EF4444'; // Team Red

function scene(t, a, b, ph = 0) {
  const sn = Math.sin;
  const cs = Math.cos;
  const mod = (v, m) => ((v % m) + m) % m;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v || 0));
  const pA = clamp(a);
  const pB = clamp(b);
  const A = [[pA, C1, '#93C5FD'], [pB, C2, '#FCA5A5']];
  const st = "stroke='#000' stroke-width='2.8' stroke-linejoin='round' stroke-linecap='round'";

  // Checkered pattern helper
  const checker = (x, y, w, rows, sz = 10) => {
    let out = `<rect x='${x}' y='${y}' width='${w * sz}' height='${rows * sz}' fill='#fff' stroke='#000' stroke-width='2'/>`;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < w; c++) {
        if ((r + c) % 2 === 1) {
          out += `<rect x='${x + c * sz}' y='${y + r * sz}' width='${sz}' height='${sz}' fill='#000'/>`;
        }
      }
    }
    return out;
  };

  let s = `<svg viewBox='0 0 400 260' role='img' aria-label='Animasi arena lomba'>`;

  /* ========================================================================
     1. ROCKET (Balap Roket Antariksa)
     ======================================================================== */
  if (t === 'rocket') {
    const px = p => 68 + p * 238; // Safe bounds: 68 (start) to 306 (finish nose at 336)
    s += `<rect width='400' height='260' fill='#130d26'/>`;

    // Stars & distant nebula
    for (let k = 0; k < 18; k++) {
      const sx = mod(k * 73 - ph * (6 + (k % 3) * 4), 390) + 5;
      const sy = (k * 47) % 240 + 10;
      const op = (0.4 + 0.5 * sn(ph * 3 + k)).toFixed(2);
      s += `<circle cx='${sx.toFixed(1)}' cy='${sy}' r='${1 + (k % 2)}' fill='#fff' opacity='${op}'/>`;
    }

    // Lane divider & start/finish lines
    s += `<line x1='20' y1='130' x2='335' y2='130' stroke='#33255c' stroke-width='2' stroke-dasharray='8 6'/>`;
    s += `<line x1='42' y1='20' x2='42' y2='240' stroke='#4c3885' stroke-width='2'/>`;
    s += `<line x1='336' y1='16' x2='336' y2='244' stroke='#FFD23F' stroke-width='3' stroke-dasharray='7 5'/>`;

    // Target Planet (Back ring -> Planet -> Front ring, fully inside 400px width)
    s += `<g transform='translate(364, 130)'>
      <path d='M-32,8 A34,9 0 0,1 32,-8' fill='none' stroke='#F59E0B' stroke-width='5' transform='rotate(-18)'/>
      <circle r='21' fill='#FFD23F' ${st}/>
      <path d='M-19,-4 Q0,6 19,-4' fill='none' stroke='#F59E0B' stroke-width='3.5'/>
      <path d='M32,-8 A34,9 0 0,1 -32,8' fill='none' stroke='#FFD23F' stroke-width='5' transform='rotate(-18)'/>
      <path d='M32,-8 A34,9 0 0,1 -32,8' fill='none' stroke='#000' stroke-width='1.5' transform='rotate(-18)'/>
    </g>`;

    // Two Rockets
    A.forEach((r, i) => {
      const y = i ? 190 : 70;
      const x = px(r[0]);
      const fl = 10 + 6 * sn(ph * 24 + i * 2);
      // Trail line from start
      s += `<line x1='42' y1='${y}' x2='${Math.max(42, x - 26)}' y2='${y}' stroke='${r[1]}' stroke-width='3' stroke-dasharray='4 6' opacity='0.75'/>`;
      s += `<g transform='translate(${x.toFixed(1)},${y})'>
        <!-- Thruster Flame -->
        <polygon points='-22,-6 -22,6 ${(-32 - fl).toFixed(1)},0' fill='#FF6B00' stroke='#000' stroke-width='2' stroke-linejoin='round'/>
        <polygon points='-22,-3 -22,3 ${(-26 - fl * 0.6).toFixed(1)},0' fill='#FFD23F'/>
        <!-- Fins -->
        <polygon points='-18,-9 -28,-22 -6,-11' fill='${r[1]}' ${st}/>
        <polygon points='-18,9 -28,22 -6,11' fill='${r[1]}' ${st}/>
        <!-- Rocket Body -->
        <path d='M28,0 C18,-13 0,-13 -20,-10 L-20,10 C0,13 18,13 28,0 Z' fill='#fff' ${st}/>
        <!-- Coloured Nose Tip -->
        <path d='M28,0 C21,-8 14,-10 10,-11 L10,11 C14,10 21,8 28,0 Z' fill='${r[1]}' ${st}/>
        <!-- Window -->
        <circle cx='-2' cy='0' r='5.5' fill='#fff' ${st}/>
        <circle cx='-2' cy='0' r='3' fill='${r[1]}'/>
      </g>`;
    });
  }

  /* ========================================================================
     2. CAR (Sirkuit Balap Mobil)
     ======================================================================== */
  else if (t === 'car') {
    const px = p => 64 + p * 252; // Car width ~62, nose reaches 346 at p=1
    s += `<rect width='400' height='260' fill='#86efac'/>`;
    // Road asphalt
    s += `<rect x='0' y='28' width='400' height='204' fill='#374151' ${st}/>`;

    // Red & White Racing Curbs (Top & Bottom)
    for (let k = 0; k < 16; k++) {
      const col = k % 2 ? '#EF4444' : '#ffffff';
      s += `<rect x='${k * 25}' y='28' width='25' height='9' fill='${col}' stroke='#000' stroke-width='1.5'/>`;
      s += `<rect x='${k * 25}' y='223' width='25' height='9' fill='${col}' stroke='#000' stroke-width='1.5'/>`;
    }

    // Center dashed lane line
    for (let k = 0; k < 9; k++) {
      s += `<rect x='${20 + k * 36}' y='127' width='22' height='6' rx='2' fill='#FDE047'/>`;
    }

    // Start Line & Checkered Finish Line
    s += `<line x1='34' y1='37' x2='34' y2='223' stroke='#fff' stroke-width='3'/>`;
    s += checker(350, 38, 2, 18, 10.2);

    // Race Cars
    A.forEach((r, i) => {
      const cy = i ? 176 : 82;
      const x = px(r[0]);
      const rot = (r[0] * 720 + ph * 260).toFixed(0);
      // Exhaust puff when moving
      if (r[0] > 0.02) {
        for (let k = 1; k <= 2; k++) {
          const ex = x - 34 - k * 10 - mod(ph * 25, 8);
          if (ex > 12) {
            s += `<circle cx='${ex.toFixed(1)}' cy='${cy + 8}' r='${3 + k}' fill='#E5E7EB' opacity='${0.7 - k * 0.2}'/>`;
          }
        }
      }
      s += `<g transform='translate(${x.toFixed(1)},${cy})'>
        <!-- Rear Spoiler -->
        <polygon points='-28,-6 -34,-16 -24,-16 -20,-6' fill='${r[1]}' ${st}/>
        <!-- Car Chassis -->
        <path d='M-28,10 V-4 L-16,-6 L-6,-18 H14 L24,-6 L34,0 V10 Z' fill='${r[1]}' ${st}/>
        <!-- White Racing Stripe -->
        <rect x='-26' y='1' width='58' height='4' fill='#fff'/>
        <!-- Cabin Window -->
        <polygon points='-12,-6 -4,-15 12,-15 20,-6' fill='#BAE6FD' stroke='#000' stroke-width='2.2' stroke-linejoin='round'/>
        <!-- Wheels -->
        <g transform='translate(-15, 11) rotate(${rot})'>
          <circle r='8.5' fill='#111827' ${st}/>
          <circle r='3.5' fill='#FFD23F'/>
        </g>
        <g transform='translate(19, 11) rotate(${rot})'>
          <circle r='8.5' fill='#111827' ${st}/>
          <circle r='3.5' fill='#FFD23F'/>
        </g>
      </g>`;
    });
  }

  /* ========================================================================
     3. TUG (Tarik Tambang)
     ======================================================================== */
  else if (t === 'tug') {
    const diff = clamp(pA - pB, -1, 1);
    const m = 200 - diff * 68; // If Team Blue (a) > Team Red (b), marker moves LEFT toward Blue's side!
    s += `<rect width='400' height='260' fill='#BAE6FD'/>`;
    // Sun & Clouds
    s += `<circle cx='52' cy='42' r='18' fill='#FFD23F' ${st}/>`;
    s += `<g fill='#fff' ${st}><ellipse cx='320' cy='44' rx='26' ry='11'/><ellipse cx='336' cy='38' rx='16' ry='10'/></g>`;

    // Ground & Center Mud Pit
    s += `<rect y='196' width='400' height='64' fill='#4ADE80' ${st}/>`;
    s += `<ellipse cx='200' cy='204' rx='32' ry='8' fill='#92400E' stroke='#000' stroke-width='2.2'/>`;

    // Win Zone Lines
    s += `<line x1='125' y1='196' x2='125' y2='260' stroke='${C1}' stroke-width='5'/>`;
    s += `<line x1='275' y1='196' x2='275' y2='260' stroke='${C2}' stroke-width='5'/>`;
    s += `<line x1='200' y1='180' x2='200' y2='260' stroke='#000' stroke-width='2.5' stroke-dasharray='5 4'/>`;

    // Puller character helper
    const puller = (px, col, dir, idx) => {
      const lean = dir * (8 + 3 * sn(ph * 6 + idx));
      return `<g transform='translate(${px.toFixed(1)}, 196)'>
        <!-- Legs -->
        <line x1='-6' y1='-22' x2='${-14 - dir * 6}' y2='0' stroke='#000' stroke-width='6' stroke-linecap='round'/>
        <line x1='6' y1='-22' x2='${12 - dir * 6}' y2='0' stroke='#000' stroke-width='6' stroke-linecap='round'/>
        <!-- Torso -->
        <path d='M${-11 + lean * 0.4},-20 L${11 + lean * 0.4},-20 L${9 + lean},-54 L${-9 + lean},-54 Z' fill='${col}' ${st}/>
        <!-- Head -->
        <circle cx='${lean * 1.1}' cy='-67' r='11' fill='#FDE68A' ${st}/>
        <!-- Headband -->
        <rect x='${lean * 1.1 - 11}' y='-73' width='22' height='5' rx='2' fill='${col}' stroke='#000' stroke-width='2'/>
      </g>`;
    };

    // Draw 2 pullers per team
    s += puller(m - 54, C1, -1, 0);
    s += puller(m - 98, C1, -1, 1);
    s += puller(m + 54, C2, 1, 2);
    s += puller(m + 98, C2, 1, 3);

    // Rope across hands & Center Flag Marker
    s += `<line x1='16' y1='154' x2='384' y2='154' stroke='#000' stroke-width='9' stroke-linecap='round'/>`;
    s += `<line x1='16' y1='154' x2='384' y2='154' stroke='#D97706' stroke-width='5' stroke-linecap='round'/>`;

    // Center Ribbon Marker on Rope
    s += `<g transform='translate(${m.toFixed(1)}, 154)'>
      <rect x='-6' y='-8' width='12' height='16' rx='2' fill='#FFD23F' ${st}/>
      <polygon points='0,8 -10,28 0,23 10,28' fill='#FFD23F' ${st}/>
      <line x1='0' y1='-8' x2='0' y2='-48' stroke='#000' stroke-width='3'/>
      <polygon points='0,-48 24,-40 0,-32' fill='${diff > 0.02 ? C1 : diff < -0.02 ? C2 : '#FFD23F'}' ${st}/>
    </g>`;
  }

  /* ========================================================================
     4. COOK (Kompetisi Master Masak)
     ======================================================================== */
  else if (t === 'cook') {
    s += `<rect width='400' height='260' fill='#FEF3C7'/>`;
    // Kitchen wall tiles
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        s += `<rect x='${c * 50}' y='${r * 45}' width='50' height='45' fill='none' stroke='#FDE68A' stroke-width='2'/>`;
      }
    }
    // Target Banner at Top
    s += `<line x1='30' y1='78' x2='370' y2='78' stroke='#000' stroke-width='2' stroke-dasharray='6 5'/>`;
    // Wooden Countertop
    s += `<rect y='198' width='400' height='62' fill='#B45309' ${st}/>`;
    s += `<rect y='198' width='400' height='12' fill='#D97706' ${st}/>`;

    A.forEach((r, i) => {
      const cx = i ? 290 : 110;
      const lv = r[0] * 76; // Max fill height 76px inside pot
      const topY = 182 - lv;

      // Stove Burner & Animated Flames
      s += `<rect x='${cx - 42}' y='190' width='84' height='8' rx='3' fill='#374151' ${st}/>`;
      for (let k = -1; k <= 1; k++) {
        const fh = 6 + 3 * sn(ph * 14 + k * 2 + i);
        s += `<ellipse cx='${cx + k * 22}' cy='190' rx='6' ry='${fh.toFixed(1)}' fill='#F59E0B' stroke='#000' stroke-width='1.5'/>`;
      }

      // Pot Handles
      s += `<rect x='${cx - 60}' y='118' width='14' height='10' rx='3' fill='#374151' ${st}/>`;
      s += `<rect x='${cx + 46}' y='118' width='14' height='10' rx='3' fill='#374151' ${st}/>`;

      // Cooking Pot Back
      s += `<rect x='${cx - 48}' y='102' width='96' height='84' rx='8' fill='#F3F4F6' ${st}/>`;

      // Rising Soup / Dish Level inside Pot
      if (lv > 2) {
        s += `<rect x='${cx - 45}' y='${topY.toFixed(1)}' width='90' height='${(184 - topY).toFixed(1)}' rx='4' fill='${r[1]}'/>`;
        s += `<ellipse cx='${cx}' cy='${topY.toFixed(1)}' rx='44' ry='5' fill='${r[2]}' stroke='#000' stroke-width='2'/>`;
        // Simmering bubbles
        for (let k = -1; k <= 1; k++) {
          const by = topY + 6 + mod(ph * 20 + k * 9, Math.max(8, lv - 8));
          if (by < 180) {
            s += `<circle cx='${cx + k * 22}' cy='${by.toFixed(1)}' r='3.5' fill='#fff' stroke='#000' stroke-width='1.5'/>`;
          }
        }
      }

      // Pot Rim & Team Badge on Pot Front
      s += `<rect x='${cx - 48}' y='102' width='96' height='84' rx='8' fill='none' ${st}/>`;
      s += `<rect x='${cx - 52}' y='96' width='104' height='10' rx='4' fill='#E5E7EB' ${st}/>`;
      s += `<circle cx='${cx}' cy='148' r='14' fill='#fff' ${st}/>`;
      s += `<circle cx='${cx}' cy='148' r='8' fill='${r[1]}'/>`;

      // Steam & Chef Hat on Top
      for (let k = -1; k <= 1; k++) {
        const sy = 84 - mod(ph * 18 + (k + 1) * 10, 26);
        s += `<path d='M${cx + k * 20},${sy.toFixed(1)} q-5,-8 0,-16' fill='none' stroke='#fff' stroke-width='4' stroke-linecap='round' opacity='0.85'/>`;
      }
      if (r[0] >= 0.95) {
        // Golden Chef Hat when full!
        s += `<g transform='translate(${cx}, 64)'>
          <circle cx='-12' cy='-6' r='10' fill='#fff' ${st}/>
          <circle cx='12' cy='-6' r='10' fill='#fff' ${st}/>
          <circle cx='0' cy='-12' r='12' fill='#fff' ${st}/>
          <rect x='-16' y='0' width='32' height='12' fill='#FFD23F' ${st}/>
        </g>`;
      }
    });
  }

  /* ========================================================================
     5. PLANT (Tumbuh Tanaman & Bunga)
     ======================================================================== */
  else if (t === 'plant') {
    s += `<rect width='400' height='260' fill='#E0F2FE'/>`;
    // Sun
    s += `<g transform='translate(200, 42)'>
      <circle r='22' fill='#FFD23F' ${st}/>
      ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg =>
        `<line x1='0' y1='-28' x2='0' y2='-35' stroke='#F59E0B' stroke-width='4' stroke-linecap='round' transform='rotate(${deg + ph * 15})'/>`
      ).join('')}
    </g>`;
    // Target Bloom Height Line
    s += `<line x1='35' y1='64' x2='365' y2='64' stroke='#15803D' stroke-width='2' stroke-dasharray='6 5'/>`;
    // Garden Ground
    s += `<rect y='212' width='400' height='48' fill='#86EFAC' ${st}/>`;

    A.forEach((r, i) => {
      const cx = i ? 295 : 105;
      const h = 16 + r[0] * 116; // Stem height from y=188 up to y=56
      const topY = 188 - h;
      const sway = 3 * sn(ph * 2.5 + i);

      // Stem & Leaves (drawn BEFORE pot rim so stem emerges cleanly from pot!)
      s += `<path d='M${cx},190 Q${(cx + sway).toFixed(1)},${(190 - h * 0.5).toFixed(1)} ${(cx + sway * 1.4).toFixed(1)},${topY.toFixed(1)}' fill='none' stroke='#15803D' stroke-width='7' stroke-linecap='round'/>`;

      // Attached Leaves along the stem
      [0.25, 0.5, 0.75].forEach(( step, k) => {
        if (r[0] >= step - 0.05) {
          const ly = 188 - h * step;
          const lx = cx + sway * step;
          const dir = k % 2 === 0 ? 1 : -1;
          s += `<path d='M${lx.toFixed(1)},${ly.toFixed(1)} C${(lx + dir * 14).toFixed(1)},${(ly - 14).toFixed(1)} ${(lx + dir * 28).toFixed(1)},${(ly - 6).toFixed(1)} ${(lx + dir * 24).toFixed(1)},${(ly + 4).toFixed(1)} C${(lx + dir * 14).toFixed(1)},${(ly + 10).toFixed(1)} ${lx.toFixed(1)},${(ly + 4).toFixed(1)} ${lx.toFixed(1)},${ly.toFixed(1)} Z' fill='#22C55E' ${st}/>`;
        }
      });

      // Flower Bud / Full Bloom at Top of Stem
      const fx = cx + sway * 1.4;
      if (r[0] >= 0.85) {
        for (let k = 0; k < 6; k++) {
          s += `<ellipse cx='${fx.toFixed(1)}' cy='${(topY - 12).toFixed(1)}' rx='7' ry='12' fill='${r[1]}' ${st} transform='rotate(${k * 60 + ph * 20} ${fx.toFixed(1)} ${topY.toFixed(1)})'/>`;
        }
        s += `<circle cx='${fx.toFixed(1)}' cy='${topY.toFixed(1)}' r='9' fill='#FFD23F' ${st}/>`;
      } else {
        s += `<circle cx='${fx.toFixed(1)}' cy='${topY.toFixed(1)}' r='8' fill='${r[1]}' ${st}/>`;
      }

      // Terracotta Pot with Team Badge
      s += `<polygon points='${cx - 32},192 ${cx + 32},192 ${cx + 24},236 ${cx - 24},236' fill='#EA580C' ${st}/>`;
      s += `<rect x='${cx - 36}' y='182' width='72' height='12' rx='3' fill='#C2410C' ${st}/>`;
      s += `<rect x='${cx - 18}' y='204' width='36' height='18' rx='4' fill='${r[1]}' ${st}/>`;
    });
  }

  /* ========================================================================
     6. CLIMB (Panjat Gunung)
     ======================================================================== */
  else if (t === 'climb') {
    s += `<rect width='400' height='260' fill='#BAE6FD'/>`;
    // Clouds
    s += `<g fill='#fff' ${st}><ellipse cx='70' cy='50' rx='26' ry='10'/><ellipse cx='330' cy='60' rx='28' ry='11'/></g>`;

    // Wide Mountain Body (Climbers stay ON the mountain rock face!)
    s += `<polygon points='16,246 155,44 245,44 384,246' fill='#9CA3AF' ${st}/>`;
    // Snow Cap at Summit Plateau
    s += `<polygon points='155,44 245,44 268,78 235,70 215,84 200,68 182,84 162,70 132,78' fill='#ffffff' ${st}/>`;

    // Summit Finish Flag
    s += `<line x1='200' y1='44' x2='200' y2='10' stroke='#000' stroke-width='3.5'/>`;
    s += `<polygon points='200,10 232,18 200,28' fill='#FFD23F' ${st}/>`;

    // Two Climbing Ropes Anchored on the Mountain Face
    const pathPt = (i, p) => {
      const x0 = i ? 295 : 105;
      const x1 = i ? 222 : 178;
      const y0 = 222;
      const y1 = 56;
      return [x0 + (x1 - x0) * p, y0 + (y1 - y0) * p];
    };

    s += `<line x1='105' y1='228' x2='178' y2='44' stroke='#78350F' stroke-width='3' stroke-dasharray='6 4'/>`;
    s += `<line x1='295' y1='228' x2='222' y2='44' stroke='#78350F' stroke-width='3' stroke-dasharray='6 4'/>`;

    // Ground Base
    s += `<rect y='242' width='400' height='18' fill='#4ADE80' ${st}/>`;

    // Climbers
    A.forEach((r, i) => {
      const [cx, cy] = pathPt(i, r[0]);
      const step = 4 * sn(ph * 8 + i * 2);
      s += `<g transform='translate(${cx.toFixed(1)}, ${cy.toFixed(1)})'>
        <!-- Arms holding rope -->
        <line x1='-8' y1='-6' x2='0' y2='${(-18 + step).toFixed(1)}' stroke='#000' stroke-width='5' stroke-linecap='round'/>
        <line x1='8' y1='-6' x2='0' y2='${(-18 - step).toFixed(1)}' stroke='#000' stroke-width='5' stroke-linecap='round'/>
        <!-- Legs -->
        <line x1='-5' y1='8' x2='-10' y2='${(20 - step).toFixed(1)}' stroke='#000' stroke-width='5' stroke-linecap='round'/>
        <line x1='5' y1='8' x2='10' y2='${(20 + step).toFixed(1)}' stroke='#000' stroke-width='5' stroke-linecap='round'/>
        <!-- Body Backpack/Harness -->
        <rect x='-9' y='-10' width='18' height='20' rx='5' fill='${r[1]}' ${st}/>
        <!-- Helmet Head -->
        <circle cx='0' cy='-19' r='9' fill='#FDE68A' ${st}/>
        <path d='M-9,-19 A9,9 0 0,1 9,-19 Z' fill='${r[1]}' ${st}/>
      </g>`;
    });
  }

  /* ========================================================================
     7. SWIM (Kolam Renang Olimpiade)
     ======================================================================== */
  else if (t === 'swim') {
    const px = p => 66 + p * 256;
    // Pool Deck & Water Basin
    s += `<rect width='400' height='260' fill='#E5E7EB'/>`;
    s += `<rect x='18' y='22' width='364' height='216' rx='6' fill='#0284C7' ${st}/>`;
    s += `<rect x='24' y='28' width='352' height='204' rx='4' fill='#38BDF8'/>`;

    // Pool Floor Lane Lines
    s += `<line x1='45' y1='80' x2='335' y2='80' stroke='#0369A1' stroke-width='6' stroke-linecap='round'/>`;
    s += `<line x1='45' y1='180' x2='335' y2='180' stroke='#0369A1' stroke-width='6' stroke-linecap='round'/>`;

    // Center Floating Buoy Rope
    s += `<line x1='24' y1='130' x2='350' y2='130' stroke='#000' stroke-width='2.5'/>`;
    for (let k = 0; k < 15; k++) {
      const bCol = k % 3 === 0 ? '#EF4444' : k % 3 === 1 ? '#ffffff' : '#3B82F6';
      s += `<rect x='${30 + k * 21}' y='126' width='14' height='8' rx='4' fill='${bCol}' stroke='#000' stroke-width='1.8'/>`;
    }

    // Golden Touchpad Finish Wall on Right
    s += checker(354, 28, 2, 20, 10.2);

    // Swimmers
    A.forEach((r, i) => {
      const y = i ? 180 : 80;
      const x = px(r[0]);
      const stroke = sn(ph * 9 + i * 2);

      // Water Splash Foam behind swimmer
      for (let k = 1; k <= 3; k++) {
        const bx = x - 24 - k * 9 - mod(ph * 25, 8);
        if (bx > 30) {
          s += `<circle cx='${bx.toFixed(1)}' cy='${y + (k % 2 ? 4 : -4)}' r='${4.5 - k * 0.8}' fill='#fff' opacity='0.85'/>`;
        }
      }

      s += `<g transform='translate(${x.toFixed(1)}, ${y})'>
        <!-- Freestyle Arm Stroke -->
        <path d='M-2,-4 Q${(8 + 10 * stroke).toFixed(1)},${(-20 - 4 * stroke).toFixed(1)} ${(18 + 6 * stroke).toFixed(1)},-2' fill='none' stroke='#FDE68A' stroke-width='6' stroke-linecap='round'/>
        <path d='M-2,-4 Q${(8 + 10 * stroke).toFixed(1)},${(-20 - 4 * stroke).toFixed(1)} ${(18 + 6 * stroke).toFixed(1)},-2' fill='none' stroke='#000' stroke-width='2' stroke-linecap='round'/>
        <!-- Swimmer Torso -->
        <ellipse cx='-8' cy='2' rx='18' ry='8.5' fill='${r[1]}' ${st}/>
        <!-- Head & Swim Cap -->
        <circle cx='12' cy='0' r='8.5' fill='#FDE68A' ${st}/>
        <path d='M5,-4 A8.5,8.5 0 0,1 19,-2 L12,3 Z' fill='${r[1]}' ${st}/>
        <!-- Goggles -->
        <circle cx='16' cy='1' r='2.5' fill='#111827'/>
      </g>`;
    });
  }

  /* ========================================================================
     8. TRAIN (Balap Kereta Lokomotif – Kedua Rel di Atas Tanah!)
     ======================================================================== */
  else {
    const px = p => 82 + p * 246;
    // Upper & Lower Track Levels (Split-Screen / Terraced Embankment so NO train floats in the sky!)
    s += `<rect width='400' height='130' fill='#BAE6FD'/>`;
    s += `<rect y='92' width='400' height='38' fill='#4ADE80' ${st}/>`;
    s += `<rect y='130' width='400' height='130' fill='#E0F2FE' ${st}/>`;
    s += `<rect y='222' width='400' height='38' fill='#4ADE80' ${st}/>`;

    // Checkered Finish Gate on Right
    s += checker(352, 10, 2, 11, 10);
    s += checker(352, 140, 2, 11, 10);

    A.forEach((r, i) => {
      const baseY = i ? 222 : 92; // Track bed level for Lane 1 (92) and Lane 2 (222)
      const x = px(r[0]);
      const rot = (r[0] * 720 + ph * 240).toFixed(0);

      // Wooden Sleepers & Steel Rails on the Embankment
      for (let k = 0; k < 16; k++) {
        s += `<rect x='${8 + k * 22}' y='${baseY - 4}' width='10' height='7' fill='#78350F' stroke='#000' stroke-width='1.5'/>`;
      }
      s += `<rect x='0' y='${baseY - 7}' width='352' height='4' fill='#374151' stroke='#000' stroke-width='1.5'/>`;

      // Steam Clouds from Smokestack
      for (let k = 1; k <= 3; k++) {
        const sx = x - 8 - k * 12 - mod(ph * 18, 10);
        const sy = baseY - 56 - k * 6;
        s += `<circle cx='${sx.toFixed(1)}' cy='${sy.toFixed(1)}' r='${4 + k * 1.5}' fill='#fff' stroke='#000' stroke-width='1.8' opacity='${1 - k * 0.2}'/>`;
      }

      // Locomotive Sprite (positioned from x - 64 to x + 16)
      s += `<g transform='translate(${x.toFixed(1)}, ${baseY - 7})'>
        <!-- Cabin (Rear) -->
        <rect x='-60' y='-38' width='28' height='30' rx='2' fill='${r[1]}' ${st}/>
        <rect x='-63' y='-42' width='34' height='5' rx='2' fill='#FFD23F' ${st}/>
        <rect x='-54' y='-32' width='16' height='12' rx='2' fill='#BAE6FD' stroke='#000' stroke-width='2'/>
        <!-- Boiler (Front) -->
        <rect x='-32' y='-28' width='38' height='20' rx='3' fill='${r[1]}' ${st}/>
        <rect x='-20' y='-28' width='5' height='20' fill='#FFD23F' stroke='#000' stroke-width='1.5'/>
        <!-- Smokestack -->
        <polygon points='-8,-28 -12,-44 0,-44 -2,-28' fill='#374151' ${st}/>
        <!-- Front Cowcatcher -->
        <polygon points='6,-8 18,-2 6,-2' fill='#FFD23F' ${st}/>
        <!-- Headlight -->
        <rect x='6' y='-24' width='5' height='8' rx='2' fill='#FFD23F' ${st}/>
        <!-- Wheels -->
        ${[-46, -24, -4].map(wx => `
          <g transform='translate(${wx}, -2) rotate(${rot})'>
            <circle r='7.5' fill='#111827' ${st}/>
            <circle r='3' fill='#FFD23F'/>
            <line x1='-7' y1='0' x2='7' y2='0' stroke='#fff' stroke-width='2'/>
          </g>
        `).join('')}
      </g>`;
    });
  }

  return s + '</svg>';
}
