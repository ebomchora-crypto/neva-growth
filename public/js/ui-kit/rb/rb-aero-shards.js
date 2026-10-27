import{a as wr,b as Mr,c as eo,d as ge,e as zr,f as Oe,g as Ao,h as le,i as Sr}from"./chunks/chunk-ZUF7KD7J.js";import{c as Et,i as ca,j as Qt,l as yr,m as br}from"./chunks/chunk-6IYH4WPJ.js";var ft=Et(ca(),1);var Pr=Et(Qt(),1),la="relative h-full w-full overflow-hidden",fa="absolute inset-0 block h-full w-full",Ro=["full","left","right","center"],Lo={glass:[0,0,0,0],chrome:[1,0,0,0]},Ze=24,Y=160,K=4,to=3.1,pa=2.75,ha=[1,.5],kr=1,H=[2.7,3.9,5.6,8.1,11.6],da=[.26,.23,.2,.17,.14],ma=[1,1.3,1.8,2.6,3.6],Ar=[1,.8,.52,.32,.2],Z=H.length,Eo=3.4,ua={plus:0,dots:1},_o=8,va=[[.37,.61],[.83,.12],[.21,.88],[.66,.44],[.05,.27]],ga=4,Rr=2.6,xa=4,ya=[[.2,-.78],[-.72,.02],[.58,-.06],[-.24,.62],[.8,.3]],ba=[.84,.62,.44,.28,.14],wa=[[.98,.78],[.9,.7],[.84,.64],[.8,.6],[.76,.56]],F=Math.PI*2,Lr=`
struct Frame {
  view: vec4f,
  eye: vec4f,
  forward: vec4f,
  right: vec4f,
  up: vec4f,
  shard: vec4f,
  accent: vec4f,
  marker: vec4f,
  surface: vec4f,
}

struct Layer {
  view: vec4f,
  look: vec4f,
}

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat, first) center: vec4f,
  @location(1) @interpolate(flat, first) axis: vec4f,
  @location(2) @interpolate(flat, first) normal: vec4f,
  @location(3) @interpolate(flat, first) p01: vec4f,
  @location(4) @interpolate(flat, first) p23: vec4f,
  @location(5) @interpolate(flat, first) p4: vec4f,
  @location(6) @interpolate(flat, first) topA: vec4f,
  @location(7) @interpolate(flat, first) topB: vec4f,
  @location(8) @interpolate(flat, first) topC: vec4f,
  @location(9) @interpolate(flat, first) bottomA: vec4f,
  @location(10) @interpolate(flat, first) bottomB: vec4f,
  @location(11) @interpolate(flat, first) bottomC: vec4f,
}

struct FragmentOut {
  @location(0) color: vec4f,
  @builtin(frag_depth) depth: f32,
}

@group(0) @binding(0) var<uniform> scene: Frame;
@group(0) @binding(1) var<storage, read> shards: array<vec4f>;
@group(0) @binding(2) var<uniform> layerInfo: Layer;

fn project(world: vec3f) -> vec3f {
  let offset = world - scene.eye.xyz;
  let depth = max(dot(offset, scene.forward.xyz), 0.05);
  let x = dot(offset, scene.right.xyz);
  let y = dot(offset, scene.up.xyz);
  return vec3f(layerInfo.view.x * 0.5 + x * layerInfo.view.z / depth, layerInfo.view.y * 0.5 - y * layerInfo.view.z / depth, depth);
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instance: u32) -> VertexOut {
  let index = instance * 6u;
  let a = shards[index];
  let b = shards[index + 1u];
  let c = shards[index + 2u];
  let d = shards[index + 3u];
  let e = shards[index + 4u];
  let f = shards[index + 5u];
  let center = a.xyz;
  let size = a.w;
  let axis = normalize(b.xyz);
  let normal = normalize(c.xyz);
  let side = normalize(cross(normal, axis));

  var out: VertexOut;
  let middle = project(center);
  if (middle.z < 0.35 || size <= 0.0) {
    out.position = vec4f(2.0, 2.0, 0.5, 1.0);
    return out;
  }

  let count = i32(f.z);
  let points = array<vec2f, 5>(d.xy, d.zw, e.xy, e.zw, f.xy);
  var low = vec2f(1e9);
  var high = vec2f(-1e9);
  var tops = array<vec2f, 5>(vec2f(0.0), vec2f(0.0), vec2f(0.0), vec2f(0.0), vec2f(0.0));
  var bottoms = array<vec2f, 5>(vec2f(0.0), vec2f(0.0), vec2f(0.0), vec2f(0.0), vec2f(0.0));
  for (var i = 0; i < 5; i += 1) {
    let corner = points[min(i, count - 1)];
    let onPlate = center + (axis * corner.x + side * corner.y) * size;
    let top = project(onPlate + normal * b.w * size);
    let bottom = project(onPlate - normal * b.w * size);
    tops[i] = top.xy;
    bottoms[i] = bottom.xy;
    low = min(low, min(top.xy, bottom.xy));
    high = max(high, max(top.xy, bottom.xy));
  }
  low -= vec2f(2.0);
  high += vec2f(2.0);
  let corners = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0), vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0));
  let pixel = mix(low, high, corners[vertexIndex]);
  out.position = vec4f(pixel.x / layerInfo.view.x * 2.0 - 1.0, 1.0 - pixel.y / layerInfo.view.y * 2.0, 0.5, 1.0);
  out.center = a;
  out.axis = vec4f(axis, b.w);
  out.normal = vec4f(normal, c.w);
  out.p01 = d;
  out.p23 = e;
  out.p4 = f;
  out.topA = vec4f(tops[0], tops[1]);
  out.topB = vec4f(tops[2], tops[3]);
  out.topC = vec4f(tops[4], 0.0, 0.0);
  out.bottomA = vec4f(bottoms[0], bottoms[1]);
  out.bottomB = vec4f(bottoms[2], bottoms[3]);
  out.bottomC = vec4f(bottoms[4], 0.0, 0.0);
  return out;
}

fn cross2(a: vec2f, b: vec2f) -> f32 {
  return a.x * b.y - a.y * b.x;
}

fn outlineCoverage(p: vec2f, points: array<vec2f, 5>, count: i32) -> f32 {
  var area = 0.0;
  for (var i = 0; i < 5; i += 1) {
    if (i < count) {
      area += cross2(points[i], points[(i + 1) % count]);
    }
  }
  let orient = select(-1.0, 1.0, area > 0.0);
  var distance = -1e9;
  for (var i = 0; i < 5; i += 1) {
    if (i < count) {
      let a = points[i];
      let edge = points[(i + 1) % count] - a;
      let span = length(edge);
      if (span > 1e-4) {
        let n = vec2f(edge.y, -edge.x) * (orient / span);
        distance = max(distance, dot(p - a, n));
      }
    }
  }
  return clamp(0.5 - distance, 0.0, 1.0);
}

struct Prism {
  points: array<vec2f, 5>,
  count: i32,
  half: f32,
}

struct Hit {
  near: f32,
  far: f32,
  normal: vec3f,
}

fn plane(prism: Prism, k: i32) -> vec4f {
  if (k == 0) { return vec4f(0.0, 0.0, 1.0, prism.half); }
  if (k == 1) { return vec4f(0.0, 0.0, -1.0, prism.half); }
  let a = prism.points[k - 2];
  let b = prism.points[(k - 1) % prism.count];
  let edge = b - a;
  let n = normalize(vec2f(edge.y, -edge.x));
  return vec4f(n, 0.0, dot(n, a));
}

fn trace(prism: Prism, ro: vec3f, rd: vec3f) -> Hit {
  var hit: Hit;
  hit.near = -1e9;
  hit.far = 1e9;
  hit.normal = vec3f(0.0, 0.0, 1.0);
  for (var k = 0; k < 7; k += 1) {
    if (k < prism.count + 2) {
      let p = plane(prism, k);
      let denom = dot(p.xyz, rd);
      let gap = p.w - dot(p.xyz, ro);
      if (abs(denom) < 1e-7) {
        if (gap < 0.0) { hit.far = -1e9; }
      } else {
        let t = gap / denom;
        if (denom < 0.0) {
          if (t > hit.near) {
            hit.near = t;
            hit.normal = p.xyz;
          }
        } else if (t < hit.far) {
          hit.far = t;
        }
      }
    }
  }
  return hit;
}

fn exitFrom(prism: Prism, ro: vec3f, rd: vec3f) -> vec4f {
  var best = 1e9;
  var normal = vec3f(0.0, 0.0, -1.0);
  for (var k = 0; k < 7; k += 1) {
    if (k < prism.count + 2) {
      let p = plane(prism, k);
      let denom = dot(p.xyz, rd);
      if (denom > 1e-6) {
        let t = (p.w - dot(p.xyz, ro)) / denom;
        if (t < best) {
          best = t;
          normal = p.xyz;
        }
      }
    }
  }
  return vec4f(normal, max(best, 0.0));
}

fn rectLight(r: vec3f, dir: vec3f, across: vec3f, extent: vec2f, soft: f32) -> f32 {
  let facing = dot(r, dir);
  if (facing <= 0.0) { return 0.0; }
  let up = cross(dir, across);
  let u = dot(r, across) / facing;
  let v = dot(r, up) / facing;
  let a = 1.0 - smoothstep(extent.x - soft, extent.x + soft, abs(u));
  let b = 1.0 - smoothstep(extent.y - soft, extent.y + soft, abs(v));
  return a * b;
}

const KEY_DIR = vec3f(-0.28, 0.72, 0.64) / length(vec3f(-0.28, 0.72, 0.64));
const KEY_ACROSS = vec3f(0.92, 0.0, 0.4) / length(vec3f(0.92, 0.0, 0.4));
const LEFT_DIR = vec3f(-0.86, 0.12, 0.5) / length(vec3f(-0.86, 0.12, 0.5));
const LEFT_ACROSS = vec3f(0.5, 0.0, 0.86) / length(vec3f(0.5, 0.0, 0.86));
const RIM_DIR = vec3f(0.78, 0.22, -0.58) / length(vec3f(0.78, 0.22, -0.58));
const RIM_ACROSS = vec3f(0.6, 0.0, 0.8) / length(vec3f(0.6, 0.0, 0.8));
const TOP_DIR = vec3f(0.05, 0.94, -0.33) / length(vec3f(0.05, 0.94, -0.33));
const TOP_ACROSS = vec3f(1.0, 0.0, 0.0);

fn lobe(r: vec3f, dir: vec3f, width: f32) -> f32 {
  return exp((dot(r, dir) - 1.0) / (width * width));
}

fn studio(r: vec3f, soft: f32, accent: vec3f, ink: vec3f) -> vec3f {
  let sky = clamp(r.y * 0.5 + 0.5, 0.0, 1.0);
  var col = mix(ink * 0.03, ink * 0.12 + accent * 0.03, smoothstep(0.25, 0.95, sky));
  col += mix(ink, vec3f(1.0), 0.6) * lobe(r, KEY_DIR, 0.38) * 3.6;
  col += mix(accent, vec3f(1.0), 0.2) * lobe(r, RIM_DIR, 0.34) * 3.4;
  col += vec3f(1.0, 0.98, 1.0) * rectLight(r, LEFT_DIR, LEFT_ACROSS, vec2f(0.12, 0.8), 0.08 + soft) * 3.2;
  col += vec3f(1.0, 0.98, 1.0) * rectLight(r, TOP_DIR, TOP_ACROSS, vec2f(0.9, 0.1), 0.08 + soft) * 2.6;
  return col;
}

fn studioLight(r: vec3f, soft: f32, accent: vec3f) -> vec3f {
  let ground = vec3f(0.2, 0.2, 0.23);
  let skyTone = vec3f(0.97, 0.97, 0.99);
  var col = mix(ground, skyTone, smoothstep(-0.08 - soft, 0.16 + soft, r.y));
  col = mix(col, vec3f(0.55, 0.55, 0.6), lobe(r, vec3f(0.0, -1.0, 0.0), 0.5) * 0.4);
  col += vec3f(0.4) * rectLight(r, KEY_DIR, KEY_ACROSS, vec2f(0.46, 0.3), 0.07 + soft);
  col -= vec3f(0.55) * rectLight(r, LEFT_DIR, LEFT_ACROSS, vec2f(0.1, 0.85), 0.05 + soft);
  col -= vec3f(0.45) * rectLight(r, RIM_DIR, RIM_ACROSS, vec2f(0.12, 0.9), 0.05 + soft);
  return clamp(col, vec3f(0.05), vec3f(1.2));
}

fn schlick(cosine: f32, f0: f32) -> f32 {
  return f0 + (1.0 - f0) * pow(1.0 - clamp(cosine, 0.0, 1.0), 5.0);
}

fn rayFor(pixel: vec2f) -> vec3f {
  let x = pixel.x - layerInfo.view.x * 0.5;
  let y = layerInfo.view.y * 0.5 - pixel.y;
  return normalize(scene.forward.xyz * layerInfo.view.z + scene.right.xyz * x + scene.up.xyz * y);
}

struct Surface {
  coverage: f32,
  color: vec3f,
  alpha: f32,
  depth: f32,
}

fn shade(pixel: vec2f, in: VertexOut) -> Surface {
  let center = in.center.xyz;
  let size = in.center.w;
  let axis = in.axis.xyz;
  let plateNormal = in.normal.xyz;
  let side = normalize(cross(plateNormal, axis));
  var prism: Prism;
  prism.points = array<vec2f, 5>(in.p01.xy, in.p01.zw, in.p23.xy, in.p23.zw, in.p4.xy);
  prism.count = i32(in.p4.z);
  prism.half = in.axis.w;

  let eye = scene.eye.xyz;
  let toLocal = mat3x3f(axis.x, side.x, plateNormal.x, axis.y, side.y, plateNormal.y, axis.z, side.z, plateNormal.z);
  let fromLocal = mat3x3f(axis, side, plateNormal);
  let origin = toLocal * (eye - center) / size;

  let rd = rayFor(pixel);
  let ray = toLocal * rd;
  let denom = dot(ray, vec3f(0.0, 0.0, 1.0));
  let flatT = -origin.z / select(denom, 1e-4, abs(denom) < 1e-4);
  let flatPoint = origin.xy + ray.xy * flatT;
  let footprint = max(length(fwidth(flatPoint)) * 0.7, 1e-4);
  let softBase = clamp(length(fwidth(reflect(rd, plateNormal))) * 0.5, 0.0, 0.5);

  let primary = trace(prism, origin, ray);
  let tops = array<vec2f, 5>(in.topA.xy, in.topA.zw, in.topB.xy, in.topB.zw, in.topC.xy);
  let bottoms = array<vec2f, 5>(in.bottomA.xy, in.bottomA.zw, in.bottomB.xy, in.bottomB.zw, in.bottomC.xy);
  let coverage = max(outlineCoverage(pixel, tops, prism.count), outlineCoverage(pixel, bottoms, prism.count));

  var surface: Surface;
  let facing = select(-1.0, 1.0, origin.z > 0.0);
  let capT = (facing * prism.half - origin.z) / select(ray.z, -1e-4 * facing, abs(ray.z) < 1e-4);
  let missed = primary.near > primary.far;
  let hitT = select(primary.near, capT, missed);
  let hitNormal = select(primary.normal, vec3f(0.0, 0.0, facing), missed);
  surface.coverage = select(0.0, coverage, hitT > 0.0);
  surface.color = vec3f(0.0);
  surface.alpha = 0.0;
  surface.depth = 1.0;
  if (surface.coverage <= 0.0) { return surface; }
  let mainRay = ray;

  let local = origin + mainRay * hitT;
  let worldRay = fromLocal * mainRay;
  let viewDepth = max(hitT * size * dot(worldRay, scene.forward.xyz), 0.05);
  surface.depth = clamp(1.0 - 0.3 / viewDepth, 0.0, 1.0);

  let radius = max(prism.half * 1.15, footprint * 2.5);
  var n = hitNormal;
  var bevel = 0.0;
  if (abs(n.z) > 0.5) {
    var gap = 1e9;
    for (var k = 2; k < 7; k += 1) {
      if (k < prism.count + 2) {
        let p = plane(prism, k);
        gap = min(gap, p.w - dot(p.xy, local.xy));
      }
    }
    var toward = vec2f(0.0);
    for (var k = 2; k < 7; k += 1) {
      if (k < prism.count + 2) {
        let p = plane(prism, k);
        let g = p.w - dot(p.xy, local.xy);
        toward += p.xy * exp(-(g - gap) / (radius * 0.35));
      }
    }
    toward = normalize(toward);
    bevel = clamp(1.0 - gap / radius, 0.0, 1.0);
    let angle = bevel * bevel * 0.7853982;
    n = normalize(n * cos(angle) + vec3f(toward, 0.0) * sin(angle));
  } else {
    let gap = prism.half - abs(local.z);
    bevel = clamp(1.0 - gap / radius, 0.0, 1.0);
    let angle = bevel * bevel * 0.7853982;
    n = normalize(n * cos(angle) + vec3f(0.0, 0.0, sign(local.z)) * sin(angle));
  }
  let bendRate = 1.8 / max(radius / footprint, 1.0);
  let normal = normalize(fromLocal * n);
  let view = -worldRay;
  let reflected = reflect(worldRay, normal);
  let soft = softBase + bendRate * smoothstep(0.0, 0.25, bevel) * 1.2 + clamp(footprint * 0.6, 0.0, 0.5);
  let ndv = clamp(dot(normal, view), 0.0, 1.0);

  let accent = scene.accent.rgb;
  let base = scene.shard.rgb;
  let world = center + fromLocal * local * size;
  let height = clamp(0.5 + world.y * 0.45, 0.0, 1.0);
  let tone = mix(accent, base, height);
  let body = mix(tone, mix(base, accent, 0.5), in.normal.w * 0.3);
  let mode = scene.surface.x;
  let lightMode = scene.up.w > 0.5;
  let wrap = clamp(dot(normal, KEY_DIR) * 0.5 + 0.5, 0.0, 1.0);

  var color = vec3f(0.0);
  var alpha = 1.0;
  let chrome = mode > 0.5;
  if (lightMode) {
    let env = studioLight(reflected, soft, accent);
    if (chrome) {
      color = env * mix(body, vec3f(1.0), 0.6);
    } else {
      let fresnel = schlick(ndv, 0.05);
      let diffuse = clamp(dot(normal, KEY_DIR) * 0.5 + 0.5, 0.0, 1.0);
      alpha = clamp(0.32 + fresnel * 0.5 + (1.0 - abs(n.z)) * 0.5, 0.0, 1.0);
      color = mix(body, vec3f(1.0), 0.15) * (0.5 + 0.4 * diffuse) * alpha + (env - vec3f(0.78)) * fresnel * 0.8;
    }
  } else if (chrome) {
    let env = studio(reflected, soft, accent, body);
    color = env * mix(body, vec3f(1.0), 0.55) * 0.9 + body * 0.02;
  } else {
    let fresnel = schlick(ndv, 0.04);
    let env = studio(reflected, soft, accent, body);
    var light = vec3f(0.0);
    var cursor = local;
    var direction = toLocal * refract(worldRay, normal, 1.0 / 1.5);
    var travelled = 0.0;
    var carry = 1.0 - fresnel;
    var through = 0.0;
    for (var bounce = 0; bounce < 3; bounce += 1) {
      let outlet = exitFrom(prism, cursor, direction);
      travelled += outlet.w;
      cursor = cursor + direction * outlet.w;
      let outward = outlet.xyz;
      let escaped = refract(direction, -outward, 1.5);
      if (dot(escaped, escaped) > 0.0) {
        let leave = schlick(dot(direction, outward), 0.04);
        let worldOut = normalize(fromLocal * escaped);
        let absorb = exp(-(vec3f(1.0) - body) * travelled * size * 22.0);
        let straight = smoothstep(0.97, 0.999, dot(worldOut, worldRay));
        let energy = carry * (1.0 - leave);
        light += studio(worldOut, soft * 2.0 + 0.04, accent, body) * absorb * energy * (1.0 - straight) * 2.0;
        through += energy * straight * (absorb.r + absorb.g + absorb.b) / 3.0;
        carry *= leave;
      }
      direction = reflect(direction, outward);
    }
    let edge = max(pow(1.0 - abs(n.z), 1.2), bevel * bevel * 0.85);
    let glow = mix(mix(body, accent, 0.35), vec3f(1.0), 0.28) * edge * (0.35 + 0.45 * wrap);
    color = env * fresnel * 0.85 + light * (1.0 - smoothstep(0.0, 0.6, bevel)) + body * 0.02 + glow;
    alpha = clamp(1.0 - through + edge * 0.25, 0.0, 1.0);
  }

  color *= select(1.3, 1.0, lightMode);
  let haze = smoothstep(3.5, 12.0, viewDepth) * layerInfo.look.x;
  let hazeColor = select(mix(base, accent, 0.5) * 0.3, mix(base, vec3f(1.0), 0.72), lightMode);
  color = mix(color, hazeColor * alpha + color * 0.3, haze);
  let flash = in.p4.w;
  color += mix(accent, vec3f(1.0), 0.35) * flash * select(0.5, 0.0, lightMode) * max(alpha, 0.35);
  alpha = max(alpha, flash * 0.45 * select(1.0, 0.0, lightMode));
  surface.color = color;
  surface.alpha = alpha;
  return surface;
}

@fragment
fn fs_solid(in: VertexOut) -> FragmentOut {
  let surface = shade(in.position.xy, in);
  if (surface.coverage < 0.999 || surface.alpha < 0.6) { discard; }
  var out: FragmentOut;
  out.color = vec4f(surface.color, surface.alpha);
  out.depth = surface.depth;
  return out;
}

@fragment
fn fs_edge(in: VertexOut) -> FragmentOut {
  let surface = shade(in.position.xy, in);
  if (surface.coverage <= 0.001 || (surface.coverage >= 0.9996 && surface.alpha >= 0.62)) { discard; }
  var out: FragmentOut;
  out.color = vec4f(surface.color, surface.alpha) * surface.coverage;
  out.depth = surface.depth;
  return out;
}
`,Er=`
struct Spread { texel: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> spreadInfo: Spread;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let sigma = max(spreadInfo.texel.z, 0.3);
  let reach = min(i32(ceil(sigma * 2.6)), 20);
  var total = textureSampleLevel(source, linearSampler, uv, 0.0);
  var weight = 1.0;
  for (var i = 1; i <= reach; i += 1) {
    let w = exp(-f32(i * i) / (2.0 * sigma * sigma));
    let o = spreadInfo.texel.xy * f32(i);
    total += (textureSampleLevel(source, linearSampler, uv + o, 0.0) + textureSampleLevel(source, linearSampler, uv - o, 0.0)) * w;
    weight += 2.0 * w;
  }
  return total / weight;
}
`,Ma=`
struct Shade {
  info: vec4f,
  more: vec4f,
}
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var depthMap: texture_depth_2d;
@group(0) @binding(2) var<uniform> shadeInfo: Shade;

@fragment
fn fs_main(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let bounds = vec2i(textureDimensions(source)) - vec2i(1);
  let here = vec2i(pixel.xy);
  let color = textureLoad(source, here, 0);
  if (color.a <= 0.002 || shadeInfo.info.z <= 0.0) { return color; }
  let depth = textureLoad(depthMap, here, 0);
  let east = textureLoad(depthMap, clamp(here + vec2i(1, 0), vec2i(0), bounds), 0);
  let west = textureLoad(depthMap, clamp(here - vec2i(1, 0), vec2i(0), bounds), 0);
  let south = textureLoad(depthMap, clamp(here + vec2i(0, 1), vec2i(0), bounds), 0);
  let north = textureLoad(depthMap, clamp(here - vec2i(0, 1), vec2i(0), bounds), 0);
  let limit = shadeInfo.more.x * 0.5;
  let slopeX = clamp(select(east - depth, depth - west, abs(depth - west) < abs(east - depth)), -limit, limit);
  let slopeY = clamp(select(south - depth, depth - north, abs(depth - north) < abs(south - depth)), -limit, limit);
  var occlusion = 0.0;
  for (var i = 1; i <= 12; i += 1) {
    let offset = -shadeInfo.info.xy * f32(i);
    let probe = clamp(vec2i(pixel.xy + offset), vec2i(0), bounds);
    let other = textureLoad(depthMap, probe, 0);
    let expected = depth + slopeX * offset.x + slopeY * offset.y;
    let closer = smoothstep(shadeInfo.more.x * 0.6, shadeInfo.more.x * 2.4, expected - other);
    let reach = 1.0 - f32(i - 1) / 12.0;
    occlusion = max(occlusion, closer * reach * reach);
  }
  return vec4f(color.rgb * (1.0 - occlusion * shadeInfo.info.z), color.a);
}
`,_r=`
struct Blend { info: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> mixInfo: Blend;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return textureSampleLevel(source, linearSampler, uv, 0.0) * mixInfo.info.x;
}
`,za=`
struct Frame {
  view: vec4f,
  eye: vec4f,
  forward: vec4f,
  right: vec4f,
  up: vec4f,
  shard: vec4f,
  accent: vec4f,
  marker: vec4f,
  surface: vec4f,
}

struct MarkerOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat, first) shape: vec4f,
  @location(2) @interpolate(flat, first) light: vec4f,
}

@group(0) @binding(0) var<uniform> scene: Frame;
@group(0) @binding(1) var<storage, read> markers: array<vec4f>;

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instance: u32) -> MarkerOut {
  let a = markers[instance * 2u];
  let b = markers[instance * 2u + 1u];
  let offset = a.xyz - scene.eye.xyz;
  let depth = max(dot(offset, scene.forward.xyz), 0.05);
  let center = vec2f(
    scene.view.x * 0.5 + dot(offset, scene.right.xyz) * scene.view.z / depth,
    scene.view.y * 0.5 - dot(offset, scene.up.xyz) * scene.view.z / depth,
  );
  let pixel = scene.marker.y;
  let size = scene.marker.z * clamp(sqrt(scene.marker.w / depth), 0.6, 1.3) * b.z;
  let blur = min(scene.forward.w * abs(1.0 - scene.eye.w / depth), scene.right.w) * 0.18;
  let frame = b.y;
  let reach = select(size, size * 2.6, frame > 0.001) + blur + 1.5 * pixel;
  let corners = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0), vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0));
  let corner = corners[vertexIndex % 6u] * reach;
  var out: MarkerOut;
  if (depth < 0.35 || a.w <= 0.002) {
    out.position = vec4f(2.0, 2.0, 0.5, 1.0);
    return out;
  }
  let at = center + corner;
  out.position = vec4f(at.x / scene.view.x * 2.0 - 1.0, 1.0 - at.y / scene.view.y * 2.0, 0.5, 1.0);
  out.local = corner;
  out.shape = vec4f(size, blur, frame, pixel);
  out.light = vec4f(b.x, a.w, 0.0, 0.0);
  return out;
}

fn bar(value: f32, edge: f32, soft: f32) -> f32 {
  return clamp((edge - value) / soft + 0.5, 0.0, 1.0);
}

@fragment
fn fs_main(in: MarkerOut) -> @location(0) vec4f {
  let size = in.shape.x;
  let blur = in.shape.y;
  let frame = in.shape.z;
  let pixel = in.shape.w;
  let q = abs(in.local);
  let soft = 1.0 + blur;
  let thick = 0.6 * pixel + blur * 0.5;
  let energy = (0.6 * pixel) / thick;
  var cover = 0.0;
  if (scene.marker.x < 0.5) {
    let across = bar(q.x, size, soft) * bar(q.y, thick, soft);
    let down = bar(q.y, size, soft) * bar(q.x, thick, soft);
    cover = max(across, down) * energy;
  } else {
    cover = bar(length(in.local), size * 0.42 + blur * 0.3, soft) * mix(1.0, energy, 0.6);
  }
  if (frame > 0.001) {
    let edge = size * 2.3;
    let span = edge * 0.45;
    let line = 0.5 * pixel;
    let sides = bar(abs(q.x - edge), line, 1.0) * bar(edge - span - q.y, 0.0, 1.0) * bar(q.y - edge - line, 0.0, 1.0);
    let caps = bar(abs(q.y - edge), line, 1.0) * bar(edge - span - q.x, 0.0, 1.0) * bar(q.x - edge - line, 0.0, 1.0);
    cover = max(cover, max(sides, caps) * frame * 0.85);
  }
  let glow = in.light.x;
  let fade = in.light.y;
  let tint = mix(scene.shard.rgb, scene.accent.rgb, 0.4);
  if (scene.up.w > 0.5) {
    let ink = (1.0 - exp(-glow * 1.6)) * 0.85 * cover * fade;
    return vec4f(mix(tint, scene.accent.rgb, 0.5) * 0.55 * ink, ink);
  }
  let light = cover * glow * fade;
  let color = (1.0 - exp(-mix(tint, vec3f(1.0), 0.35) * light * 1.6)) * 1.4;
  return vec4f(color, max(max(color.r, color.g), color.b) * 0.8);
}
`,Sa=`
struct Bloom { texel: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> bloom: Bloom;

fn bright(uv: vec2f) -> vec3f {
  let color = textureSampleLevel(source, linearSampler, uv, 0.0).rgb;
  let peak = max(max(color.r, color.g), color.b);
  return color * smoothstep(bloom.texel.z, bloom.texel.z + bloom.texel.w, peak);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let o = bloom.texel.xy;
  let total = bright(uv + vec2f(o.x, o.y)) + bright(uv + vec2f(-o.x, o.y)) + bright(uv + vec2f(o.x, -o.y)) + bright(uv - o);
  return vec4f(total * 0.25, 0.0);
}
`,ka=`
struct Bloom { texel: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> bloom: Bloom;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let o = bloom.texel.xy;
  var color = textureSampleLevel(source, linearSampler, uv, 0.0) * 0.25;
  color += textureSampleLevel(source, linearSampler, uv + vec2f(o.x, o.y), 0.0) * 0.1875;
  color += textureSampleLevel(source, linearSampler, uv + vec2f(-o.x, o.y), 0.0) * 0.1875;
  color += textureSampleLevel(source, linearSampler, uv + vec2f(o.x, -o.y), 0.0) * 0.1875;
  color += textureSampleLevel(source, linearSampler, uv - o, 0.0) * 0.1875;
  return color;
}
`,Ir=`
struct Bloom { texel: vec4f }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> bloom: Bloom;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let delta = bloom.texel.xy;
  var color = textureSampleLevel(source, linearSampler, uv, 0.0) * 0.181862;
  color += (textureSampleLevel(source, linearSampler, uv + delta * 1.423135, 0.0) + textureSampleLevel(source, linearSampler, uv - delta * 1.423135, 0.0)) * 0.284316;
  color += (textureSampleLevel(source, linearSampler, uv + delta * 3.326702, 0.0) + textureSampleLevel(source, linearSampler, uv - delta * 3.326702, 0.0)) * 0.106598;
  color += (textureSampleLevel(source, linearSampler, uv + delta * 5.242989, 0.0) + textureSampleLevel(source, linearSampler, uv - delta * 5.242989, 0.0)) * 0.018156;
  return color;
}
`,Aa=`
struct Finish {
  info: vec4f,
  paper: vec4f,
  mode: vec4f,
}
@group(0) @binding(0) var sceneTexture: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var bloom0: texture_2d<f32>;
@group(0) @binding(3) var bloom1: texture_2d<f32>;
@group(0) @binding(4) var bloom2: texture_2d<f32>;
@group(0) @binding(5) var bloom3: texture_2d<f32>;
@group(0) @binding(6) var<uniform> finish: Finish;

fn hash12(value: vec2f) -> f32 {
  let p = fract(value * vec2f(0.1031, 0.1030));
  let mixed = p + dot(p, p.yx + 33.33);
  return fract((mixed.x + mixed.y) * mixed.x);
}

fn smootherstep(x: f32) -> f32 {
  let t = clamp(x, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

@fragment
fn fs_main(@location(0) uv: vec2f, @builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let scene = textureLoad(sceneTexture, vec2i(pixel.xy), 0);
  let alpha = clamp(scene.a, 0.0, 1.0);
  let noise = hash12(floor(pixel.xy) + vec2f(finish.info.y, finish.info.y * 1.618)) - 0.5;
  let grain = 1.0 + noise * finish.info.x;
  var rgb = vec3f(0.0);
  var a = alpha;
  if (finish.mode.x > 0.5) {
    rgb = clamp(scene.rgb, vec3f(0.0), vec3f(alpha)) * grain;
  } else {
    var halo = textureSampleLevel(bloom0, linearSampler, uv, 0.0).rgb * 0.4;
    halo += textureSampleLevel(bloom1, linearSampler, uv, 0.0).rgb * 0.3;
    halo += textureSampleLevel(bloom2, linearSampler, uv, 0.0).rgb * 0.2;
    halo += textureSampleLevel(bloom3, linearSampler, uv, 0.0).rgb * 0.1;
    halo = halo * finish.info.z;
    rgb = (1.0 - exp(-max(scene.rgb, vec3f(0.0)) * finish.info.w)) * grain + halo / (1.0 + halo);
    a = max(alpha, max(max(rgb.r, rgb.g), rgb.b));
  }
  let vignette = finish.mode.y;
  if (vignette > 0.0) {
    let size = vec2f(textureDimensions(sceneTexture));
    let reach = max(vignette * 0.5 * min(size.x, size.y), 1.0);
    let fromEdge = min(pixel.xy, size - pixel.xy);
    let mask = smootherstep(fromEdge.x / reach) * smootherstep(fromEdge.y / reach);
    rgb *= mask;
    a *= mask;
  }
  rgb = clamp(rgb, vec3f(0.0), vec3f(max(a, 0.0)));
  if (finish.paper.a > 0.5) {
    return vec4f(finish.paper.rgb * (1.0 - a) + rgb, 1.0);
  }
  return vec4f(rgb, a);
}
`,N=(g,p,s)=>Math.min(s,Math.max(p,g)),Je=g=>{let p=N(g,0,1);return p*p*p*(p*(p*6-15)+10)},lt=null,Io=(g,p)=>{if(g==="transparent")return null;if(typeof document>"u"||(lt||(lt=document.createElement("canvas").getContext("2d")),!lt))return p;lt.fillStyle="#000000",lt.fillStyle=g;let s=lt.fillStyle;if(s.startsWith("#")){let z=parseInt(s.slice(1),16);return[(z>>16&255)/255,(z>>8&255)/255,(z&255)/255]}let $=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(s);return $?$[4]!==void 0&&Number($[4])===0?null:[Number($[1])/255,Number($[2])/255,Number($[3])/255]:p},Fr=()=>typeof window<"u"&&(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1),Fo=(g,p,s,$)=>{let z=Math.imul(g+2654435769,2246822507)^Math.imul(p+1663821227,3266489909);return z^=Math.imul(s+668265263,374761393)^Math.imul($+2135587861,2654435761),z=Math.imul(z^z>>>15,739982445),z=Math.imul(z^z>>>12,695872825),((z^z>>>15)>>>0)/4294967296},Ra=g=>()=>{g=g+1831565813|0;let p=Math.imul(g^g>>>15,1|g);return p=p+Math.imul(p^p>>>7,61|p)^p,((p^p>>>14)>>>0)/4294967296},La=(g,p,s,$,z)=>{let J,fe,Q;if(g===0){J=-1.32+2.64*s;let X=ya[p];fe=X[0]+(X[1]-X[0])*s+.1*Math.sin(s*F*.7+p*2.3)+.045*Math.sin(s*F*1.9+p),Q=H[p]+.35*Math.sin(s*Math.PI*1.4+p*1.9)}else if(g===3){let X=s*F+p*.9+Math.PI*.5,Pe=wa[p];J=Math.cos(X)*Pe[0],fe=Math.sin(X)*Pe[1]-.02,Q=H[p]*1.1-Math.sin(X)*(.5+p*.25)}else{let X=g===1?-1:1;fe=1.32-2.64*s,J=X*(ba[p]+.1*Math.sin(s*F*.6+p*1.3)+.03*Math.sin(s*F*2.1+p)-.08*(1-s)),Q=H[p]+.3*Math.sin(s*Math.PI*1.2+p)}return z[0]=J*$*Q/K,z[1]=fe*Q/K,z[2]=K-Q,z},Or=(g,p)=>{let s=Ra(p),$=[],z=0;for(let J=0;J<Z;J+=1){let fe=J===Z-1?g-z:Math.round(g*da[J]);z+=fe;for(let Q=0;Q<fe;Q+=1){let X=s()*2-1,Pe=s(),U=[];if(Pe<.55){let C=.17+s()*.15;U.push([1,(s()-.5)*.08]),U.push([-.5-s()*.25,C*(.8+s()*.4)]),U.push([-.5-s()*.25,-C*(.8+s()*.4)])}else if(Pe<.8){let C=.2+s()*.14;U.push([1,0]),U.push([(s()-.3)*.5,C]),U.push([-.55-s()*.2,(s()-.5)*.1]),U.push([(s()-.3)*.5,-C*(.8+s()*.4)])}else{let C=s()<.5?4:5,et=.4+s()*.3,ro=s()*F;for(let pt=0;pt<C;pt+=1){let Ot=ro+(pt+(s()-.5)*.6)*F/C;U.push([Math.cos(Ot),Math.sin(Ot)*et])}}let Qe=U.length,_t=0,It=0;for(let C of U)_t+=C[0]/Qe,It+=C[1]/Qe;let Ft=[];for(let C=0;C<5;C+=1){let et=U[Math.min(C,Qe-1)];Ft.push(et[0]-_t,et[1]-It)}$.push({level:J,phase:(Q+s())/Math.max(fe,1),lane:Math.sign(X)*Math.pow(Math.abs(X),.85),layer:Math.sqrt(-2*Math.log(Math.max(s(),1e-6)))*Math.cos(F*s()),size:.6+s()*s()*1.25,shape:Ft,sides:Qe,thickness:.06+s()*.04,yaw:(s()-.5)*.36,bank:(s()-.5)*.5,pitch:(s()-.5)*.24,tint:s(),drift:[s()*F,s()*F,s()*F],rate:[.3+s()*.35,.25+s()*.35,.3+s()*.3],flutter:[s()*F,.5+s()*.5],arrive:s(),sign:s()<.5?-1:1,slot:[s()*F,.06+.3*Math.sqrt(s()),s()-.5,s()<.85?1:-1],offset:[0,0,0],velocity:[0,0,0],tilt:0,tiltVelocity:0,flash:0,gather:0,joined:!1,position:[0,0,0],s:0})}}return $};function Oo({shardColor:g="#896ABD",accentColor:p="#A855F7",backgroundColor:s="transparent",lightMode:$=!1,placement:z="full",material:J="glass",count:fe=1300,shardSize:Q=1,spread:X=1,twist:Pe=1,billow:U=1,speed:Qe=1,scale:_t=1,depthOfField:It=.75,glow:Ft=.35,grain:C=.06,vignette:et=.3,intro:ro=!0,mouseInteraction:pt=!0,mouseStrength:Ot=.6,markers:Tr="plus",pulseOnClick:Dr=!0,holdToGather:Cr=!0,parallax:Br=.5,paused:Vr=!1,dpr:Nr=2,className:Hr="",style:qr,onError:To}){let Do=(0,ft.useRef)(null),Co=(0,ft.useRef)(To);Co.current=To;let Bo={shard:Io(g,[.54,.42,.74])??[.54,.42,.74],accent:Io(p,[.66,.33,.97])??[.66,.33,.97],paper:Io(s,null),lightMode:$,placement:Math.max(0,Ro.indexOf(z)),material:Lo[J]??Lo.glass,count:Math.round(N(fe,100,6e3)),shardSize:N(Q,.2,4),spread:N(X,0,3),twist:N(Pe,0,3),billow:N(U,0,3),speed:N(Qe,0,4),scale:N(_t,.4,2.5),depthOfField:N(It,0,1),glow:N(Ft,0,2),grain:N(C,0,.5),vignette:N(et,0,1),intro:ro,mouseInteraction:pt,mouseStrength:N(Ot,0,1),markers:ua[Tr]??-1,pulseOnClick:Dr,holdToGather:Cr,parallax:N(Br,0,1),paused:Vr,dpr:Math.max(.5,Nr)},Le=(0,ft.useRef)(Bo);return Le.current=Bo,(0,ft.useEffect)(()=>{let oe=Do.current;if(!oe)return;let Pt=document.createElement("canvas");Pt.className=fa,oe.appendChild(Pt);let ht=!1,Tt=null,Dt=0,dt=[],Vo=m=>{ht||(ht=!0,cancelAnimationFrame(Dt),Tt?.dispose(),Tt=null,Co.current?.(m instanceof Error?m:new Error(String(m))))};return(async()=>{if(typeof navigator>"u"||!("gpu"in navigator))throw new Error("WebGPU is not available");let m=await Sr({powerPreference:"high-performance"});if(Tt=m,ht){m.dispose();return}dt.push(m.onError(Vo));let No=navigator.gpu.getPreferredCanvasFormat(),Ho=()=>{let o=Math.min(window.devicePixelRatio||1,Le.current.dpr);return[Math.max(1,Math.round(oe.clientWidth*o)),Math.max(1,Math.round(oe.clientHeight*o))]},x=wr(m,Pt,{autoResize:!1,size:Ho(),format:No,alphaMode:"premultiplied"}),Ee=Mr(m,{minFilter:"linear",magFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}),Te=Oe(m,{size:x.size,format:"rgba16float"}),Ct=o=>[Math.max(1,Math.round(x.size[0]/2**(o+1))),Math.max(1,Math.round(x.size[1]/2**(o+1)))],re=Array.from({length:xa},(o,t)=>({main:Oe(m,{size:Ct(t),format:"rgba16float"}),spare:Oe(m,{size:Ct(t),format:"rgba16float"})})),Bt=le(m,{view:[1,1,1,0],eye:[0,0,K,to],forward:[0,0,-1,0],right:[1,0,0,0],up:[0,1,0,0],shard:[.54,.42,.74,.5],accent:[.66,.33,.97,0],marker:[0,1,4,K],surface:[7,0,0,2.4]}),mt=0,Vt=null,ae=new Float32Array(0),ao=eo(m,{shader:za,vertices:6,cull:"none",depth:!1,blend:"premultiplied",label:"aero-shards-markers"}),qo=o=>{o<=mt&&Vt||(mt=Math.max(o,512),ae=new Float32Array(mt*_o),Vt=Ao(m,ae.byteLength,"read"),ao.set({scene:Bt,markers:Vt}))};qo(512);let pe=o=>[Math.max(1,Math.round(x.size[0]*o)),Math.max(1,Math.round(x.size[1]*o))],xe=ha.map((o,t)=>({scale:o,layer:Oe(m,{size:pe(o),format:"rgba16float",depth:"depth32float"}),shaded:Oe(m,{size:pe(o),format:"rgba16float"}),temp:Oe(m,{size:t===0?[1,1]:pe(o),format:"rgba16float"}),blurred:Oe(m,{size:t===0?[1,1]:pe(o),format:"rgba16float"}),softReady:t!==0})),no=H.map(()=>le(m,{view:[1,1,1,0],look:[.7,0,0,0]})),Yo=H.map(()=>le(m,{texel:[0,0,0,0]})),$o=H.map(()=>le(m,{texel:[0,0,0,0]})),so=H.map(()=>le(m,{info:[1,0,0,0]})),jo=H.map(()=>le(m,{info:[0,0,0,0],more:[0,0,0,0]})),io=H.map((o,t)=>eo(m,{shader:Lr,entry:{fragment:"fs_solid"},vertices:6,cull:"none",depth:{write:!0,compare:"less"},label:`aero-shards-solid-${t}`})),co=H.map((o,t)=>eo(m,{shader:Lr,entry:{fragment:"fs_edge"},vertices:6,cull:"none",depth:{write:!1,compare:"less"},blend:"premultiplied",label:`aero-shards-edge-${t}`})),lo=H.map((o,t)=>xe.map((c,h)=>({shadow:ge(m,Ma,{label:`aero-shards-shadow-${t}-${h}`,set:{source:c.layer,depthMap:c.layer.depth,shadeInfo:jo[t]}}),blurX:ge(m,Er,{label:`aero-shards-depth-x-${t}-${h}`,set:{source:c.shaded,linearSampler:Ee,spreadInfo:Yo[t]}}),blurY:ge(m,Er,{label:`aero-shards-depth-y-${t}-${h}`,set:{source:c.temp,linearSampler:Ee,spreadInfo:$o[t]}}),sharp:ge(m,_r,{label:`aero-shards-sharp-${t}-${h}`,blend:"premultiplied",set:{source:c.shaded,linearSampler:Ee,mixInfo:so[t]}}),soft:ge(m,_r,{label:`aero-shards-soft-${t}-${h}`,blend:"premultiplied",set:{source:c.blurred,linearSampler:Ee,mixInfo:so[t]}})}))),ut=0,vt=null,Nt=new Float32Array(0),B=new Float32Array(0),gt=new Float32Array(0),Ko=o=>{o<=ut&&vt||(ut=Math.max(o,256),Nt=new Float32Array(ut*Ze),B=new Float32Array(ut*Ze),gt=new Float32Array(ut),vt=Ao(m,Nt.byteLength,"read"),H.forEach((t,c)=>{io[c].set({scene:Bt,shards:vt,layerInfo:no[c]}),co[c].set({scene:Bt,shards:vt,layerInfo:no[c]})}))};Ko(Le.current.count);let fo=re.map((o,t)=>{let c=t===0?Te:re[t-1].main,h=le(m,{texel:[0,0,0,0]}),d=le(m,{texel:[0,0,0,0]}),b=le(m,{texel:[0,0,0,0]});return{source:c,level:o,downParams:h,horizontalParams:d,verticalParams:b,down:ge(m,t===0?Sa:ka,{label:`aero-shards-down-${t}`,set:{source:c,linearSampler:Ee,bloom:h}}),horizontal:ge(m,Ir,{label:`aero-shards-blur-x-${t}`,set:{source:o.main,linearSampler:Ee,bloom:d}}),vertical:ge(m,Ir,{label:`aero-shards-blur-y-${t}`,set:{source:o.spare,linearSampler:Ee,bloom:b}})}}),Xo=le(m,{info:[0,0,0,1],paper:[0,0,0,0],mode:[0,0,0,0]}),Go=ge(m,Aa,{label:"aero-shards-finish",set:{sceneTexture:Te,linearSampler:Ee,bloom0:re[0].main,bloom1:re[1].main,bloom2:re[2].main,bloom3:re[3].main,finish:Xo}});if(await Promise.all([...io.map(o=>o.compile(xe[0].layer)),...co.map(o=>o.compile(xe[0].layer)),...lo.flatMap(o=>o.flatMap((t,c)=>[t.shadow.compile(xe[c].shaded),t.blurX.compile(xe[c].temp),t.blurY.compile(xe[c].blurred),t.sharp.compile(Te),t.soft.compile(Te)])),ao.compile(Te),Go.compile({colors:[No]}),...fo.flatMap((o,t)=>[o.down.compile(re[t].main),o.horizontal.compile(re[t].spare),o.vertical.compile(re[t].main)])]),ht)return;let Ht=Array.from({length:Z},()=>({position:new Float32Array(Y*3),tangent:new Float32Array(Y*3),across:new Float32Array(Y*3),lift:new Float32Array(Y*3),length:1})),qt=[0,0,0,0,0],po=[0,0,0,0,0],ye=new Float32Array((Y+1)*3),xt=new Float32Array(Y+1),Yt=[0,0,0],Uo="",e={visible:!1,clock:0,last:0,travel:new Float64Array(Z),roll:0,twist:0,drift:0,introAt:-1,weights:Ro.map((o,t)=>t===Le.current.placement?1:0),weightVelocity:[0,0,0,0],shards:Or(Le.current.count,1337),order:[],pointer:[.5,.5],inside:!1,presence:0,yaw:0,pitch:0,yawVelocity:0,pitchVelocity:0,pressAt:-1,pressPoint:null,holding:!1,hold:0,reach:0,gatherCenter:[0,0,0],rings:[],markerDrift:0,markerTarget:"",markerTotal:0,targets:new Map,quiet:0,seen:null},Yr=o=>{let t=e.weights[3]>.999,c=`${o.toFixed(4)}|${e.weights.map(h=>h.toFixed(4)).join(",")}`;if(c===Uo)return t;Uo=c;for(let h=0;h<Z;h+=1){let d=Ht[h],b=0;for(let v=0;v<=Y;v+=1){let q=v/Y,S=0,l=0,n=0;for(let i=0;i<4;i+=1){let f=e.weights[i];f<1e-4||(La(i,h,q,o,Yt),S+=Yt[0]*f,l+=Yt[1]*f,n+=Yt[2]*f)}ye[v*3]=S,ye[v*3+1]=l,ye[v*3+2]=n,v>0&&(b+=Math.hypot(S-ye[v*3-3],l-ye[v*3-2],n-ye[v*3-1])),xt[v]=b}d.length=Math.max(b,.001);let A=0;for(let v=0;v<Y;v+=1){let q=v/(Y-1)*b;for(;A<Y-1&&xt[A+1]<q;)A+=1;let S=Math.max(xt[A+1]-xt[A],1e-6),l=N((q-xt[A])/S,0,1);for(let n=0;n<3;n+=1)d.position[v*3+n]=ye[A*3+n]+(ye[A*3+3+n]-ye[A*3+n])*l}let E=0,_=1,O=0;for(let v=0;v<Y;v+=1){let q=Math.max(0,v-1),S=Math.min(Y-1,v+1),l=d.position[S*3]-d.position[q*3],n=d.position[S*3+1]-d.position[q*3+1],i=d.position[S*3+2]-d.position[q*3+2],f=Math.hypot(l,n,i)||1;l/=f,n/=f,i/=f,v===0&&(E=-n,_=l,O=0);let u=E*l+_*n+O*i;E-=l*u,_-=n*u,O-=i*u;let P=Math.hypot(E,_,O)||1;E/=P,_/=P,O/=P,d.tangent[v*3]=l,d.tangent[v*3+1]=n,d.tangent[v*3+2]=i,d.across[v*3]=E,d.across[v*3+1]=_,d.across[v*3+2]=O,d.lift[v*3]=n*O-i*_,d.lift[v*3+1]=i*E-l*O,d.lift[v*3+2]=l*_-n*E}}return t},Wo=()=>{let o=Ho();o[0]===x.size[0]&&o[1]===x.size[1]||(x.resize(o),Te.resize(o),xe.forEach(t=>{t.layer.resize(pe(t.scale)),t.shaded.resize(pe(t.scale)),t.softReady&&(t.temp.resize(pe(t.scale)),t.blurred.resize(pe(t.scale)))}),re.forEach((t,c)=>{t.main.resize(Ct(c)),t.spare.resize(Ct(c))}),lo.forEach(t=>t.forEach((c,h)=>c.shadow.set({depthMap:xe[h].layer.depth}))),e.quiet=0)},Zo=new ResizeObserver(Wo);Zo.observe(oe),dt.push(()=>Zo.disconnect());let r={eye:[0,0,K],forward:[0,0,-1],right:[1,0,0],up:[0,1,0],focal:1},Jo=o=>{let t=Math.cos(e.yaw),c=Math.sin(e.yaw),h=Math.cos(e.pitch),d=Math.sin(e.pitch);r.eye[0]=c*h*K,r.eye[1]=d*K,r.eye[2]=t*h*K,r.forward[0]=-c*h,r.forward[1]=-d,r.forward[2]=-t*h;let b=Math.hypot(r.forward[2],r.forward[0])||1;r.right[0]=-r.forward[2]/b,r.right[1]=0,r.right[2]=r.forward[0]/b,r.up[0]=r.right[1]*r.forward[2]-r.right[2]*r.forward[1],r.up[1]=r.right[2]*r.forward[0]-r.right[0]*r.forward[2],r.up[2]=r.right[0]*r.forward[1]-r.right[1]*r.forward[0],r.focal=x.size[1]*.5*K*o.scale},L=[0,0,1],Qo=(o,t)=>{let c=(o-.5)*x.size[0],h=(.5-t)*x.size[1];L[0]=r.forward[0]*r.focal+r.right[0]*c+r.up[0]*h,L[1]=r.forward[1]*r.focal+r.right[1]*c+r.up[1]*h,L[2]=r.forward[2]*r.focal+r.right[2]*c+r.up[2]*h;let d=Math.hypot(L[0],L[1],L[2])||1;return L[0]/=d,L[1]/=d,L[2]/=d,L},$r=(o,t,c)=>{let h=x.size[0]/Math.max(x.size[1],1),d=Yr(h),b=o.intro&&!c,A=e.introAt<0?0:e.clock-e.introAt,E=o.mouseInteraction&&!c?e.presence*o.mouseStrength:0,_=0,O=0,v=0;E>.001&&(Qo(e.pointer[0],e.pointer[1]),_=L[0],O=L[1],v=L[2]);let q=Math.max(1,Math.ceil(t/(1/120))),S=t/Math.max(q,1),l=x.size[1]*.5,n=e.rings.map(w=>{let a=w.age/Rr;return{x:w.x,y:w.y,age:w.age,strength:(1-Math.exp(-w.age/.06))*(1-a)*(1-a)}}),i=(w,a,I,k)=>{let M=w-r.eye[0],ee=a-r.eye[1],ne=I-r.eye[2],be=Math.max(M*r.forward[0]+ee*r.forward[1]+ne*r.forward[2],.05);return k[0]=(M*r.right[0]+ee*r.right[1]+ne*r.right[2])*r.focal/be/l,k[1]=(M*r.up[0]+ee*r.up[1]+ne*r.up[2])*r.focal/be/l,be},f=(w,a,I)=>{let k=0;for(let M of n){let ee=Math.max(0,M.age-I*.07)*2.3,ne=Math.hypot(w-M.x,a-M.y);k+=Math.exp(-((ne-ee)*(ne-ee))/.012)*M.strength}return k},u=[0,0],P=e.shards,R=Math.min(1,o.twist);for(let w=0;w<P.length;w+=1){let a=P[w],I=a.level,k=Ht[I],M=(a.phase+e.travel[I])%1,ee=1,ne=0;if(b){let y=I*.22+Math.max(0,M-.1)*(Eo-1-(Z-1)*.22)+a.arrive*.15,T=N((A-y)/.9,0,1);ee=Je(T);let D=(1-T)*(1-T);M=d?M-D*.06:Math.max(0,M-D*.06),ne=D*.9*a.sign}a.s=M;let be=(M%1+1)%1*(Y-1),De=Math.floor(be),V=Math.min(De+1,Y-1),Ce=be-De,G=(y,T)=>y[De*3+T]+(y[V*3+T]-y[De*3+T])*Ce,he=G(k.position,0),jt=G(k.position,1),Kt=G(k.position,2),Be=G(k.tangent,0),de=G(k.tangent,1),yt=G(k.tangent,2),Ve=G(k.across,0),Ne=G(k.across,1),He=G(k.across,2),tt=G(k.lift,0),qe=G(k.lift,1),se=G(k.lift,2),ie=o.twist*(M*F*.6+e.twist+I*1.7),Ye=Math.cos(ie),me=Math.sin(ie),bt=Ve*Ye+tt*me,wt=Ne*Ye+qe*me,ho=He*Ye+se*me,Mt=tt*Ye-Ve*me,Xt=qe*Ye-Ne*me,mo=se*Ye-He*me,ue=H[I]/K,zt=o.spread*(.15+.035*H[I])*(.8+.3*Math.sin(M*F*1.3+I*.8)),$e=a.lane*zt,Ie=a.layer*.012*ue,Gt=d?1:Je(M/.12)*Je((1-M)/.12),ot=o.billow*.16*ue*Math.sin(M*F*1.3-e.drift*.5+I*1.1)*(.4+.6*Gt),we=o.billow*.06*ue*Math.sin(M*F*.8-e.drift*.35+I*2.4),St=.009*ue,rt=e.drift,kt=he+tt*ot+Ve*we+bt*$e+Mt*Ie+Math.sin(rt*a.rate[0]+a.drift[0])*St,At=jt+qe*ot+Ne*we+wt*$e+Xt*Ie+Math.sin(rt*a.rate[1]+a.drift[1])*St,ce=Kt+se*ot+He*we+ho*$e+mo*Ie+Math.sin(rt*a.rate[2]+a.drift[2])*St,te=0,Me=0,je=0,Ke=0,at=kt+a.offset[0],uo=At+a.offset[1],vo=ce+a.offset[2];if(E>.001){let y=at-r.eye[0],T=uo-r.eye[1],D=vo-r.eye[2],W=y*_+T*O+D*v,Ae=y-_*W,Re=T-O*W,ve=D-v*W,Fe=Math.hypot(Ae,Re,ve),Jt=.24*ue/o.scale,Lt=Math.exp(-(Fe*Fe)/(Jt*Jt));if(Lt>.002&&Fe>1e-5){let We=Ae/Fe,Mo=Re/Fe,zo=ve/Fe,So=(We*Be+Mo*de+zo*yt)*.7,ko=E*Lt*9*ue;te+=(We-Be*So)*ko,Me+=(Mo-de*So)*ko,je+=(zo-yt*So)*ko,Ke+=E*Lt*1.1*(We*Ve+Mo*Ne+zo*He)}}if(e.hold>.001&&a.joined){let y=a.slot,T=y[0]+e.clock*(.8/(.12+y[1]))*y[3],D=y[1]/o.scale,W=e.gatherCenter[0]+Math.cos(T)*D,Ae=e.gatherCenter[1]+Math.sin(T)*D*.75,Re=e.gatherCenter[2]+Math.sin(T)*D*.45+y[2]*.3;a.gather+=(e.hold-a.gather)*(1-Math.exp(-t/.3));let ve=a.gather*30;te+=(W-at)*ve,Me+=(Ae-uo)*ve,je+=(Re-vo)*ve,Ke+=a.gather*.6*Math.sin(T)}else a.gather+=(0-a.gather)*(1-Math.exp(-t/.2));if(n.length){i(at,uo,vo,u);for(let y of n){let T=Math.max(0,y.age-I*.07)*2.3,D=u[0]-y.x,W=u[1]-y.y,Ae=Math.hypot(D,W),Re=Math.exp(-((Ae-T)*(Ae-T))/.012)*y.strength;if(Re>.01){a.flash=Math.max(a.flash,Re*.75);let ve=Math.max(Ae,.05),Fe=(r.right[0]*D+r.up[0]*W)/ve,Jt=(r.right[1]*D+r.up[1]*W)/ve,Lt=(r.right[2]*D+r.up[2]*W)/ve;Ke+=Re*1.4*(Fe*Ve+Jt*Ne+Lt*He);let We=Re*2.2*ue/Math.max(Ae,.05);te+=(r.right[0]*D+r.up[0]*W)*We,Me+=(r.right[1]*D+r.up[1]*W)*We,je+=(r.right[2]*D+r.up[2]*W)*We}}}let go=24*(1-a.gather*.95);for(let y=0;y<q;y+=1)a.velocity[0]+=(te-go*a.offset[0]-7.5*a.velocity[0])*S,a.velocity[1]+=(Me-go*a.offset[1]-7.5*a.velocity[1])*S,a.velocity[2]+=(je-go*a.offset[2]-7.5*a.velocity[2])*S,a.offset[0]+=a.velocity[0]*S,a.offset[1]+=a.velocity[1]*S,a.offset[2]+=a.velocity[2]*S,a.tiltVelocity+=(90*(Ke-a.tilt)-15*a.tiltVelocity)*S,a.tilt+=a.tiltVelocity*S;a.flash*=Math.exp(-t/.45);let Ut=kt+a.offset[0],Wt=At+a.offset[1],Zt=ce+a.offset[2];a.position[0]=Ut,a.position[1]=Wt,a.position[2]=Zt;let Xe=r.eye[0]-Ut,Ge=r.eye[1]-Wt,Ue=r.eye[2]-Zt,xo=Math.hypot(Xe,Ge,Ue)||1;Xe/=xo,Ge/=xo,Ue/=xo;let ze=Be+a.velocity[0]*.05,Se=de+a.velocity[1]*.05,ke=yt+a.velocity[2]*.05,yo=ze*Xe+Se*Ge+ke*Ue;ze-=Xe*yo,Se-=Ge*yo,ke-=Ue*yo;let Rt=Math.hypot(ze,Se,ke);Rt<1e-4&&(ze=r.right[0],Se=r.right[1],ke=r.right[2],Rt=1),ze/=Rt,Se/=Rt,ke/=Rt;let sr=Ge*ke-Ue*Se,ir=Ue*ze-Xe*ke,cr=Xe*Se-Ge*ze,lr=a.yaw+.05*Math.sin(e.clock*a.flutter[1]*.7+a.flutter[0]),nt=Math.cos(lr),st=Math.sin(lr),fr=ze*nt+sr*st,pr=Se*nt+ir*st,hr=ke*nt+cr*st,Kr=sr*nt-ze*st,Xr=ir*nt-Se*st,Gr=cr*nt-ke*st,Ur=.8*R*Math.sin(ie)+.3*Math.sin(M*F*1.6-e.roll*.55+I*.9+a.lane*.7),Wr=.06*Math.sin(e.clock*a.flutter[1]+a.flutter[0]),dr=kr*Math.tanh((Ur+a.bank+Wr+a.tilt+ne)/kr),bo=Math.cos(dr),wo=Math.sin(dr),mr=Xe*bo+Kr*wo,ur=Ge*bo+Xr*wo,vr=Ue*bo+Gr*wo,gr=a.pitch+.2*Math.sin(M*F*1.1-e.roll*.4+I*2.1),it=Math.cos(gr),ct=Math.sin(gr),Zr=fr*it+mr*ct,Jr=pr*it+ur*ct,Qr=hr*it+vr*ct,ea=mr*it-fr*ct,ta=ur*it-pr*ct,oa=vr*it-hr*ct,ra=Ut-r.eye[0],aa=Wt-r.eye[1],na=Zt-r.eye[2],sa=ra*r.forward[0]+aa*r.forward[1]+na*r.forward[2];gt[w]=sa;let ia=1-.45*a.lane*a.lane,xr=.062*o.shardSize*a.size*ma[I]*ee*Math.sqrt(Gt)*ia,j=w*Ze;B[j]=Ut,B[j+1]=Wt,B[j+2]=Zt,B[j+3]=xr>1e-5?xr:0,B[j+4]=Zr,B[j+5]=Jr,B[j+6]=Qr,B[j+7]=a.thickness,B[j+8]=ea,B[j+9]=ta,B[j+10]=oa,B[j+11]=a.tint;for(let y=0;y<10;y+=1)B[j+12+y]=a.shape[y];B[j+22]=a.sides,B[j+23]=a.flash}let _e=0;for(let w=0;w<Z;w+=1)qt[w]=0,po[w]=0;if(o.markers>=0){let w=x.size[1]/Math.max(oe.clientHeight,1),a=(e.pointer[0]-.5)*2*h,I=(.5-e.pointer[1])*2,k=o.mouseInteraction&&!c?e.presence:0,M=e.targets,ee=new Map,ne=1-Math.exp(-t/.12),be="",De=72;for(let V=Z-1;V>=0;V-=1){po[V]=_e;let Ce=H[V],G=Ce/K,he=.42*Math.pow(G,.55),jt=h*Ce/(K*o.scale)*1.12+he,Kt=Ce/(K*o.scale)*1.12+he,Be=e.markerDrift,de=va[V],yt=Math.floor((Be-jt)/he-de[0]),Ve=Math.ceil((Be+jt)/he-de[0]),Ne=Math.floor(-Kt/he-de[1]),He=Math.ceil(Kt/he-de[1]),tt=o.spread*(.15+.035*Ce)*1.4,qe=Ht[V].position;for(let se=yt;se<=Ve;se+=1)for(let ie=Ne;ie<=He;ie+=1){if(Fo(V,se,ie,11)>.5)continue;let me=(se+de[0])*he-Be,bt=(ie+de[1])*he,wt=K-Ce,ho=i(me,bt,wt,u);if(Math.abs(u[0])>h*1.05||Math.abs(u[1])>1.05)continue;let Mt=1/0;for(let te=0;te<Y;te+=2){let Me=me-qe[te*3],je=bt-qe[te*3+1],Ke=wt-qe[te*3+2],at=Me*Me+je*je+Ke*Ke;at<Mt&&(Mt=at)}let Xt=Math.exp(-Mt/(tt*tt)),mo=Fo(V,se,ie,23),ue=Fo(V,se,ie,37),zt=mo<.07?.5+.5*Math.sin(e.clock*(1.4+ue*2.2)+ue*40):0,$e=Math.hypot(u[0]-a,u[1]-I)*l/w,Ie=`${V}:${se}:${ie}`;V<=2&&k>.01&&$e<De&&(De=$e,be=Ie);let Gt=Ie===e.markerTarget?k*(1-Je(($e-30)/42)):0,ot=M.get(Ie)??0,we=ot+(Gt-ot)*ne;we>.002&&ee.set(Ie,we);let St=Math.max(Je((zt-.55)/.4),we),rt=0;n.length&&(rt=f(u[0],u[1],V));let kt=1;if(b){let te=N((u[0]/h+1)*.5,0,1),Me=V*.22+.35+te*(Eo-1.3-(Z-1)*.22);kt=Je((A-Me)/.5)}let At=Ar[V]*(1-Je((ho-3)/10)*.45)*kt;if(At<.002)continue;_e>=mt&&qo(mt*2);let ce=_e*_o;ae[ce]=me,ae[ce+1]=bt,ae[ce+2]=wt,ae[ce+3]=At,ae[ce+4]=.42+.5*Xt+zt*.9+we*1.3+rt*2.5,ae[ce+5]=St,ae[ce+6]=1+.15*Xt+.3*zt+.2*we,ae[ce+7]=0,_e+=1,qt[V]+=1}}e.targets=ee,e.markerTarget=be}e.markerTotal=_e},jr=(o,t,c)=>{Jo(o);let h=e.shards;Ko(h.length),$r(o,t,c),e.order.length!==h.length&&(e.order=h.map((l,n)=>n));let d=e.order;for(let l=0;l<h.length;l+=1)gt[l]+=h[l].level*100;for(let l=1;l<d.length;l+=1){let n=d[l],i=gt[n],f=l-1;for(;f>=0&&gt[d[f]]<i;)d[f+1]=d[f],f-=1;d[f+1]=n}let b=[0,0,0,0,0];for(let l=0;l<d.length;l+=1){let n=d[l]*Ze,i=l*Ze;b[h[d[l]].level]+=1;for(let f=0;f<Ze;f+=1)Nt[i+f]=B[n+f]}vt?.write(Nt.subarray(0,h.length*Ze)),e.markerTotal>0&&Vt?.write(ae.subarray(0,e.markerTotal*_o));let A=[0,0,0,0,0],E=0;for(let l=Z-1;l>=0;l-=1)A[l]=E,E+=b[l];Bt.set({view:[x.size[0],x.size[1],r.focal,e.clock],eye:[r.eye[0],r.eye[1],r.eye[2],to],forward:[r.forward[0],r.forward[1],r.forward[2],o.depthOfField*x.size[1]*.03],right:[r.right[0],r.right[1],r.right[2],x.size[1]*.05],up:[r.up[0],r.up[1],r.up[2],o.lightMode?1:0],shard:[...o.shard,0],accent:[...o.accent,0],surface:o.material,marker:[o.markers,x.size[1]/Math.max(oe.clientHeight,1),4*(x.size[1]/Math.max(oe.clientHeight,1)),to]}),fo.forEach(({downParams:l,horizontalParams:n,verticalParams:i,source:f,level:u})=>{l.set({texel:[.5/f.size[0],.5/f.size[1],.75,.5]}),n.set({texel:[1/u.main.size[0],0,0,0]}),i.set({texel:[0,1/u.main.size[1],0,0]})});let _=o.paper??[0,0,0],O=o.glow>.001&&!o.lightMode;Xo.set({info:[o.grain,Math.floor(e.clock*24),O?o.glow:0,1.3],paper:[_[0],_[1],_[2],o.paper?1:0],mode:[o.lightMode?1:0,o.vignette,0,0]});let v=o.depthOfField*x.size[1]*.012,q=x.size[1]*.02,S=H.map((l,n)=>{let i=Math.min(v*Math.abs(1-pa/l),q),f=i>=2.2?1:0,u=xe[f],P=i>=.45;P&&!u.softReady&&(u.softReady=!0,u.temp.resize(pe(u.scale)),u.blurred.resize(pe(u.scale)));let R=u.layer.size;no[n].set({view:[R[0],R[1],r.focal*(R[0]/x.size[0]),n],look:[o.lightMode?.5:.7,0,0,0]});let _e=i*u.scale;Yo[n].set({texel:[1/R[0],0,_e,0]}),$o[n].set({texel:[0,1/R[1],_e,0]}),so[n].set({info:[Ar[n],0,0,0]});let w=Math.max(.6,1.4*(R[0]/Math.max(oe.clientWidth,1))),a=o.material===Lo.glass?0:o.lightMode?.32:.62;return jo[n].set({info:[w*.55,w*.85,a,0],more:[45e-5,0,0,0]}),{group:u,groupIndex:f,soft:P}});zr(m,l=>{for(let n=Z-1;n>=0;n-=1){let{group:i,groupIndex:f,soft:u}=S[n],P=lo[n][f];b[n]>0&&(l.pass({target:i.layer,clear:[0,0,0,0],clearDepth:1},R=>{R.draw(io[n],{instances:b[n],firstInstance:A[n]}),R.draw(co[n],{instances:b[n],firstInstance:A[n]})}),l.pass({target:i.shaded,clear:[0,0,0,0]},R=>R.draw(P.shadow)),u&&(l.pass({target:i.temp,clear:[0,0,0,0]},R=>R.draw(P.blurX)),l.pass({target:i.blurred,clear:[0,0,0,0]},R=>R.draw(P.blurY)))),l.pass({target:Te,clear:n===Z-1?[0,0,0,0]:!1},R=>{qt[n]>0&&R.draw(ao,{instances:qt[n],firstInstance:po[n]}),b[n]>0&&R.draw(u?P.soft:P.sharp)})}fo.forEach((n,i)=>{let f=re[i];if(!O){l.pass({target:f.main,clear:[0,0,0,0]},()=>{});return}l.pass({target:f.main,clear:[0,0,0,0]},u=>u.draw(n.down)),l.pass({target:f.spare,clear:[0,0,0,0]},u=>u.draw(n.horizontal)),l.pass({target:f.main,clear:[0,0,0,0]},u=>u.draw(n.vertical))}),l.pass({target:x,clear:[0,0,0,0]},n=>n.draw(Go))})},er=o=>{if(Dt=requestAnimationFrame(er),!e.visible||document.hidden){e.last=o;return}let t=Le.current,c=e.last?Math.min((o-e.last)/1e3,.05):0;e.last=o;let h=Fr();e.clock+=c,e.introAt<0&&(e.introAt=e.clock),e.shards.length!==t.count&&(e.shards=Or(t.count,1337),e.order=[]);let d=!t.paused&&!h;if(d){for(let i=0;i<Z;i+=1)e.travel[i]=(e.travel[i]+c*t.speed*.09/Ht[i].length)%1;e.roll+=c*t.speed*1,e.twist+=c*t.speed*.08,e.drift+=c*t.speed}let b=Ro.map((i,f)=>f===t.placement?1:0),A=!1,E=Math.exp(-4*c);for(let i=0;i<4;i+=1){let f=e.weights[i]-b[i],u=e.weightVelocity[i]+4*f;e.weights[i]=b[i]+(f+u*c)*E,e.weightVelocity[i]=(e.weightVelocity[i]-4*u*c)*E,Math.abs(e.weights[i]-b[i])>5e-4&&(A=!0)}A||(e.weights=b,e.weightVelocity=[0,0,0,0]);let _=t.mouseInteraction&&e.inside&&!h;e.presence+=((_?1:0)-e.presence)*(1-Math.exp(-c/.25));let O=_?t.parallax:0,v=(e.pointer[0]-.5)*O*.14,q=(e.pointer[1]-.5)*O*.08;e.yawVelocity+=(38*(v-e.yaw)-11*e.yawVelocity)*c,e.pitchVelocity+=(38*(q-e.pitch)-11*e.pitchVelocity)*c,e.yaw+=e.yawVelocity*c,e.pitch+=e.pitchVelocity*c;let S=Math.abs(v-e.yaw)+Math.abs(q-e.pitch)>1e-4||Math.abs(e.yawVelocity)+Math.abs(e.pitchVelocity)>1e-4;if(e.pressAt>=0&&e.pressPoint&&t.holdToGather&&!h&&e.clock-e.pressAt>.18){if(!e.holding){e.holding=!0,Jo(t),Qo(e.pressPoint[0],e.pressPoint[1]);let f=to/Math.max(L[0]*r.forward[0]+L[1]*r.forward[1]+L[2]*r.forward[2],.2);e.gatherCenter=[r.eye[0]+L[0]*f,r.eye[1]+L[1]*f,r.eye[2]+L[2]*f],e.reach=0}e.hold=Math.min(1,e.hold+c/.5),e.reach=Math.min(e.reach+c*.5,.55);let i=(.22+e.reach)/t.scale;for(let f of e.shards){if(f.joined||f.level>2)continue;let u=f.position[0]-e.gatherCenter[0],P=f.position[1]-e.gatherCenter[1];u*u+P*P<i*i&&(f.joined=!0)}}else if(e.hold>0&&(e.hold=Math.max(0,e.hold-c/.3),e.hold===0))for(let i of e.shards)i.joined=!1;for(let i of e.rings)i.age+=c;e.rings=e.rings.filter(i=>i.age<Rr),d&&(e.markerDrift+=c*t.speed*.045);let l=e.shards.some(i=>i.flash>.01||Math.abs(i.tiltVelocity)>.01||Math.abs(i.tilt)>.01),n=A||S||l||e.presence>.002||e.rings.length>0||e.hold>0||t.intro&&!h&&e.clock-e.introAt<Eo+.5;e.seen!==t||n||d?e.quiet=0:e.quiet+=1,e.seen=t,!(e.quiet>30)&&(Wo(),jr(t,c,h))},tr=o=>{let t=oe.getBoundingClientRect();return{point:[(o.clientX-t.left)/Math.max(t.width,1),(o.clientY-t.top)/Math.max(t.height,1)],inside:o.clientX>=t.left&&o.clientX<=t.right&&o.clientY>=t.top&&o.clientY<=t.bottom}},or=o=>{let t=tr(o);e.inside=t.inside,t.inside&&(e.pointer=t.point)},rr=()=>{e.inside=!1},ar=o=>{let t=Le.current;if(o.button!==0||Fr()||!t.mouseInteraction||o.target instanceof Element&&o.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;let c=tr(o);c.inside&&(e.pointer=c.point,e.pressAt=e.clock,e.pressPoint=c.point)},$t=()=>{let o=Le.current;if(!(e.pressAt<0)){if(!e.holding&&o.pulseOnClick&&e.pressPoint){let t=x.size[0]/Math.max(x.size[1],1);e.rings.push({x:(e.pressPoint[0]*2-1)*t,y:1-e.pressPoint[1]*2,age:0}),e.rings.length>ga&&e.rings.shift()}if(e.holding)for(let t of e.shards)t.joined&&(t.tiltVelocity+=9*t.sign);e.pressAt=-1,e.holding=!1}};window.addEventListener("pointermove",or,{passive:!0}),window.addEventListener("pointerdown",ar),window.addEventListener("pointerup",$t),window.addEventListener("pointercancel",$t),document.documentElement.addEventListener("pointerleave",rr),dt.push(()=>{window.removeEventListener("pointermove",or),window.removeEventListener("pointerdown",ar),window.removeEventListener("pointerup",$t),window.removeEventListener("pointercancel",$t),document.documentElement.removeEventListener("pointerleave",rr)});let nr=new IntersectionObserver(o=>{e.visible=o.some(t=>t.isIntersecting)});nr.observe(oe),dt.push(()=>nr.disconnect()),Dt=requestAnimationFrame(er)})().catch(Vo),()=>{ht=!0,cancelAnimationFrame(Dt),dt.forEach(m=>m()),Tt?.dispose(),Pt.remove()}},[]),(0,Pr.jsx)("div",{ref:Do,className:[la,Hr].filter(Boolean).join(" "),style:qr})}var Po=Et(Qt(),1),Ea=["/img/refs/26a93f7d95a980e9.webp","/img/refs/cb6de64949b0bec6.webp","/img/refs/a93756f0c0cb59fc.webp","/img/refs/94d9841532f84af8.webp","/img/refs/3f5a569abcca0bbf.webp","/img/refs/0401e230bb9cda3a.webp","/img/refs/f64c0d544bffcec5.webp","/img/refs/cfebfdafc08fb11d.webp"],oo=["Interiores","Tecnologia","Atendimento com IA","Ag\xEAncia criativa","Moda e cal\xE7ados","Beleza","Velas e decora\xE7\xE3o","Sa\xFAde e cl\xEDnicas"],Ba=Ea.map((g,p)=>({id:p+1,image:g,src:g,img:g,url:g,title:oo[p],text:oo[p],label:oo[p],alt:oo[p],subtitle:"Refer\xEAncia Neva",description:"Refer\xEAncia de design da Neva Growth.",link:"#",href:"#",height:[300,420,260,380,320,280,400,340][p],handle:"neva",borderColor:"#48c8f5",gradient:"linear-gradient(145deg,#48c8f5,#091629)"}));function _a({big:g}){return(0,Po.jsx)(br,{big:g,dark:!0,center:!1,zoom:1,drive:!1,children:(0,Po.jsx)(Oo,{})})}var Va=yr(_a);export{Va as default};
