# Opening Quest — 3D assets rendered in Blender (run: blender -b -P tools/blender_assets.py -- <outdir> [only])
# Procedurally models Staunton-style chess pieces and renders:
#   bots/<id>.jpg   portrait of each bot as a chess piece in its own material
#   board-wood.jpg  top-down walnut & maple board texture
#   hero.jpg        cinematic opening scene for the home screen
#   icon.png        app icon (ivory knight)
import bpy, bmesh, math, sys, os
from mathutils import Vector, Euler

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.abspath('assets_out')
ONLY = argv[1] if len(argv) > 1 else None
os.makedirs(os.path.join(OUT, 'bots'), exist_ok=True)

# ---------------------------------------------------------------- scene helpers
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 160
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 8
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
                devs = [d for d in prefs.devices if d.type == kind]
                if devs:
                    for d in prefs.devices:
                        d.use = d.type == kind
                    sc.cycles.device = 'GPU'
                    break
            except Exception:
                continue
    except Exception:
        pass
    try:
        sc.view_settings.view_transform = 'AgX'
        sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        pass
    sc.render.film_transparent = False
    w = bpy.data.worlds.new('World')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.012, 0.012, 0.014, 1)
    bg.inputs[1].default_value = 1.0
    return sc

def set_input(node, names, value):
    for n in names if isinstance(names, (list, tuple)) else [names]:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return

def material(name, color, rough=0.35, metallic=0.0, coat=0.0, sss=0.0, sss_color=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    set_input(p, 'Base Color', (*color, 1))
    set_input(p, 'Roughness', rough)
    set_input(p, 'Metallic', metallic)
    set_input(p, ['Coat Weight', 'Clearcoat'], coat)
    set_input(p, ['Coat Roughness', 'Clearcoat Roughness'], 0.08)
    if sss:
        set_input(p, ['Subsurface Weight', 'Subsurface'], sss)
        set_input(p, ['Subsurface Radius'], (0.2, 0.1, 0.06))
        set_input(p, ['Subsurface Scale'], 0.05)
    return m

def wood(name, light, dark, scale=6.0, rough=0.38, coat=0.35, rot=0.0, seed=0.0):
    """Procedural wood grain: distorted bands between two colours."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N = nt.nodes
    p = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord')
    mp = N.new('ShaderNodeMapping')
    mp.inputs['Rotation'].default_value = (0, 0, rot)
    mp.inputs['Location'].default_value = (seed, seed * 0.7, 0)
    mp.inputs['Scale'].default_value = (1, 1, 1)
    noise = N.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 2.0
    noise.inputs['Detail'].default_value = 6.0
    wave = N.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.inputs['Scale'].default_value = scale
    wave.inputs['Distortion'].default_value = 2.5
    wave.inputs['Detail'].default_value = 3.0
    wave.inputs['Detail Scale'].default_value = 1.5
    ramp = N.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].color = (*light, 1)
    ramp.color_ramp.elements[0].position = 0.15
    ramp.color_ramp.elements[1].position = 0.95
    fine = N.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 180.0
    fine.inputs['Detail'].default_value = 2.0
    mix = N.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Fac'].default_value = 0.12
    bump = N.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.05
    L = nt.links
    L.new(tc.outputs['Object'], mp.inputs['Vector'])
    L.new(mp.outputs['Vector'], noise.inputs['Vector'])
    L.new(mp.outputs['Vector'], wave.inputs['Vector'])
    L.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], mix.inputs[1])
    L.new(mp.outputs['Vector'], fine.inputs['Vector'])
    L.new(fine.outputs['Color'], mix.inputs[2])
    L.new(mix.outputs['Color'], p.inputs['Base Color'])
    L.new(wave.outputs['Fac'], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], p.inputs['Normal'])
    set_input(p, 'Roughness', rough)
    set_input(p, ['Coat Weight', 'Clearcoat'], coat)
    set_input(p, ['Coat Roughness', 'Clearcoat Roughness'], 0.1)
    return m

def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj

def smooth(obj, angle=40):
    for f in obj.data.polygons:
        f.use_smooth = True
    try:
        obj.data.set_sharp_from_angle(angle=math.radians(angle))
    except Exception:
        pass

# ---------------------------------------------------------------- geometry
def catmull(pts, steps=6):
    """Smooth a polyline (keeps end points)."""
    if len(pts) < 3:
        return pts
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in range(2)))
    out.append(pts[-1])
    return out

def lathe(name, profile, seg=96, smooth_steps=5):
    """Revolve (r, z) points around Z. Profile must start and end on the axis (r = 0)."""
    prof = catmull(profile, smooth_steps)
    prof[0] = (0.0, prof[0][1])
    prof[-1] = (0.0, prof[-1][1])
    bm = bmesh.new()
    rings = []
    for (r, z) in prof:
        if r <= 1e-5:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for i in range(seg):
                bm.faces.new((a[0], b[i], b[(i + 1) % seg]))
        elif len(b) == 1:
            for i in range(seg):
                bm.faces.new((a[(i + 1) % seg], a[i], b[0]))
        else:
            for i in range(seg):
                bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    me = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me))
    smooth(obj, 50)
    return obj

def box(name, size, loc, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.scale = size
    o.location = loc
    o.rotation_euler = rot
    return o

def sphere(name, r, loc):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=r)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.location = loc
    smooth(o, 80)
    return o

def cut(target, cutter):
    mod = target.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    try:
        mod.solver = 'EXACT'
    except Exception:
        pass
    cutter.hide_render = True
    cutter.hide_viewport = True

def parent_all(name, objs):
    root = link(bpy.data.objects.new(name, None))
    for o in objs:
        o.parent = root
    return root

BASE = [(0, 0), (0.40, 0), (0.41, 0.03), (0.40, 0.07), (0.36, 0.09), (0.37, 0.12), (0.34, 0.15), (0.28, 0.18)]

def pawn(mat, name='pawn'):
    prof = BASE + [(0.22, 0.24), (0.165, 0.38), (0.15, 0.47), (0.23, 0.50), (0.23, 0.53), (0.13, 0.57)]
    c, R = 0.72, 0.175
    for i in range(1, 12):
        a = -math.pi / 2 + math.pi * i / 12 + 0.25
        prof.append((max(0.0, R * math.cos(a)), c + R * math.sin(a)))
    prof.append((0, c + R))
    o = lathe(name, prof, smooth_steps=4)
    o.data.materials.append(mat)
    return parent_all(name + '_root', [o])

def rook(mat, name='rook'):
    prof = BASE + [(0.25, 0.26), (0.22, 0.45), (0.21, 0.66), (0.27, 0.70), (0.27, 0.74), (0.24, 0.76), (0.26, 0.80), (0.29, 0.83), (0.29, 1.02), (0.0, 1.02)]
    o = lathe(name, prof, smooth_steps=3)
    o.data.materials.append(mat)
    hole = lathe(name + '_hole', [(0, 0.93), (0.20, 0.93), (0.20, 1.2), (0, 1.2)], smooth_steps=1)
    cut(o, hole)
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        b = box(name + f'_slot{i}', (0.11, 0.8, 0.16), (0, 0, 1.04), (0, 0, a))
        cut(o, b)
    return parent_all(name + '_root', [o])

def bishop(mat, name='bishop'):
    prof = BASE + [(0.22, 0.25), (0.15, 0.48), (0.13, 0.62), (0.21, 0.66), (0.21, 0.69), (0.12, 0.72), (0.15, 0.76), (0.19, 0.84), (0.20, 0.92), (0.17, 1.02), (0.10, 1.10), (0.04, 1.15), (0.06, 1.17), (0.07, 1.20), (0.05, 1.23), (0.0, 1.24)]
    o = lathe(name, prof, smooth_steps=5)
    o.data.materials.append(mat)
    s = box(name + '_slit', (0.03, 0.6, 0.30), (0.08, 0, 0.98), (0, math.radians(35), 0))
    cut(o, s)
    return parent_all(name + '_root', [o])

def queen(mat, name='queen'):
    prof = BASE + [(0.24, 0.26), (0.16, 0.55), (0.14, 0.80), (0.22, 0.84), (0.22, 0.87), (0.14, 0.90), (0.17, 0.98), (0.25, 1.14), (0.27, 1.20), (0.18, 1.18), (0.12, 1.22), (0.10, 1.27), (0.0, 1.28)]
    o = lathe(name, prof, smooth_steps=5)
    o.data.materials.append(mat)
    parts = [o]
    for i in range(10):
        a = 2 * math.pi * i / 10
        s = sphere(name + f'_pt{i}', 0.035, (0.25 * math.cos(a), 0.25 * math.sin(a), 1.215))
        s.data.materials.append(mat)
        parts.append(s)
    top = sphere(name + '_top', 0.06, (0, 0, 1.33))
    top.data.materials.append(mat)
    parts.append(top)
    return parent_all(name + '_root', parts)

def king(mat, name='king'):
    prof = BASE + [(0.25, 0.26), (0.17, 0.55), (0.15, 0.84), (0.23, 0.88), (0.23, 0.91), (0.15, 0.94), (0.18, 1.02), (0.25, 1.17), (0.24, 1.22), (0.12, 1.25), (0.08, 1.30), (0.0, 1.31)]
    o = lathe(name, prof, smooth_steps=5)
    o.data.materials.append(mat)
    v = box(name + '_cv', (0.07, 0.07, 0.30), (0, 0, 1.43))
    h = box(name + '_ch', (0.22, 0.07, 0.07), (0, 0, 1.46))
    for b in (v, h):
        bev = b.modifiers.new('bev', 'BEVEL')
        bev.width = 0.015
        bev.segments = 3
        b.data.materials.append(mat)
        smooth(b, 30)
    return parent_all(name + '_root', [o, v, h])

KNIGHT_SIL = [  # side silhouette (x = towards the muzzle, z up), from the back of the neck round to the chest
    (-0.27, 0.30), (-0.31, 0.44), (-0.31, 0.60), (-0.28, 0.75), (-0.21, 0.89), (-0.13, 1.01), (-0.08, 1.12),
    (-0.03, 1.21), (0.02, 1.12), (0.09, 1.07), (0.20, 0.99), (0.31, 0.89), (0.40, 0.81), (0.45, 0.74),
    (0.44, 0.68), (0.37, 0.64), (0.26, 0.655), (0.15, 0.66), (0.08, 0.58), (0.11, 0.47), (0.19, 0.37), (0.23, 0.30),
]

def knight(mat, name='knight'):
    prof = BASE[:-1] + [(0.30, 0.20), (0.27, 0.27), (0.26, 0.30), (0.0, 0.31)]
    base = lathe(name + '_base', prof, smooth_steps=3)
    base.data.materials.append(mat)
    sil = catmull(KNIGHT_SIL + [KNIGHT_SIL[0]], 4)[:-1]
    # Thick at the neck, narrow at the muzzle, like a carved Staunton knight.
    def half(x, z):
        t = max(0.0, min(1.0, (x + 0.1) / 0.55))
        return 0.165 - 0.075 * t - 0.02 * max(0.0, z - 1.05) / 0.15
    bm = bmesh.new()
    front = [bm.verts.new((x, half(x, z), z)) for (x, z) in sil]
    back = [bm.verts.new((x, -half(x, z), z)) for (x, z) in sil]
    n = len(sil)
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], back[i], back[j], front[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name + '_head')
    bm.to_mesh(me)
    bm.free()
    head = link(bpy.data.objects.new(name + '_head', me))
    bev = head.modifiers.new('bev', 'BEVEL')
    bev.width = 0.05
    bev.segments = 5
    bev.limit_method = 'ANGLE'
    sub = head.modifiers.new('sub', 'SUBSURF')
    sub.levels = 2
    sub.render_levels = 2
    head.data.materials.append(mat)
    smooth(head, 70)
    for side in (-1, 1):
        e = sphere(name + f'_eye{side}', 0.026, (0.15, side * 0.115, 0.92))
        cut(head, e)
    # nostril
    for side in (-1, 1):
        e = sphere(name + f'_nos{side}', 0.018, (0.42, side * 0.07, 0.74))
        cut(head, e)
    return parent_all(name + '_root', [base, head])

PIECES = {'pawn': pawn, 'rook': rook, 'bishop': bishop, 'queen': queen, 'king': king, 'knight': knight}

# ---------------------------------------------------------------- lights & camera
def area(name, loc, target, power, size, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy = power
    d.size = size
    d.color = color
    o = link(bpy.data.objects.new(name, d))
    o.location = loc
    look_at(o, target)
    return o

def look_at(o, target):
    direction = Vector(target) - Vector(o.location)
    o.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

def camera(loc, target, lens=85, dof=None, fstop=2.8):
    c = bpy.data.cameras.new('cam')
    c.lens = lens
    o = link(bpy.data.objects.new('cam', c))
    o.location = loc
    look_at(o, target)
    if dof is not None:
        c.dof.use_dof = True
        c.dof.focus_distance = dof
        c.dof.aperture_fstop = fstop
    bpy.context.scene.camera = o
    return o

def render(path, w, h, samples=None, fmt='JPEG'):
    sc = bpy.context.scene
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.resolution_percentage = 100
    if samples:
        sc.cycles.samples = samples
    sc.render.image_settings.file_format = fmt
    if fmt == 'JPEG':
        sc.render.image_settings.quality = 90
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('rendered', path)

def backdrop(tint):
    """Seamless studio sweep, softly lit with the bot's colour."""
    me = bpy.data.meshes.new('sweep')
    bm = bmesh.new()
    rows = []
    for i in range(24):
        t = i / 23
        a = t * math.pi / 2
        y = 1.2 + 1.4 * math.sin(a) if t < 1 else 2.6
        z = 1.4 - 1.4 * math.cos(a)
        rows.append((-6 + 0 * t, y if i else -6, z))
    pts = [(-6, 1.2 - 8, 0)] + [(0, 1.2 + 1.4 * math.sin(i / 20 * math.pi / 2), 1.4 - 1.4 * math.cos(i / 20 * math.pi / 2)) for i in range(21)] + [(0, 2.6, 8)]
    left = [bm.verts.new((-6, y, z)) for (_, y, z) in pts]
    right = [bm.verts.new((6, y, z)) for (_, y, z) in pts]
    for i in range(len(pts) - 1):
        bm.faces.new((left[i], right[i], right[i + 1], left[i + 1]))
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new('sweep', me))
    smooth(o, 80)
    m = material('sweep', tuple(c * 0.035 + 0.008 for c in tint), rough=0.95)
    o.data.materials.append(m)
    return o

# ---------------------------------------------------------------- bot portraits
BOTS = [
    # id, piece, material builder
    ('pip', 'pawn', lambda: wood('boxwood', (0.66, 0.49, 0.28), (0.55, 0.39, 0.20), scale=3.5, coat=0.4), (1.0, 0.82, 0.42)),
    ('rosa', 'queen', lambda: material('porcelain', (0.86, 0.66, 0.68), rough=0.18, coat=0.6, sss=0.2), (0.95, 0.6, 0.7)),
    ('sam', 'rook', lambda: material('lacquer', (0.42, 0.07, 0.09), rough=0.12, coat=1.0), (0.85, 0.35, 0.4)),
    ('lila', 'bishop', lambda: material('sage', (0.42, 0.55, 0.45), rough=0.35, coat=0.3, sss=0.05), (0.45, 0.8, 0.65)),
    ('baron', 'king', lambda: material('ebony', (0.025, 0.022, 0.02), rough=0.15, coat=1.0), (1.0, 0.55, 0.35)),
    ('knightley', 'knight', lambda: wood('walnut', (0.30, 0.17, 0.08), (0.19, 0.10, 0.045), scale=3.5, coat=0.5), (0.85, 0.65, 0.4)),
    ('viktor', 'rook', lambda: material('iron', (0.20, 0.20, 0.21), rough=0.55, metallic=1.0), (0.5, 0.65, 0.85)),
    ('hoshi', 'bishop', lambda: material('jade', (0.12, 0.42, 0.30), rough=0.12, coat=0.8, sss=0.35), (0.5, 0.85, 0.8)),
    ('beep', 'knight', lambda: material('chrome', (0.86, 0.87, 0.9), rough=0.12, metallic=1.0), (0.7, 0.75, 0.85)),
]

def portrait(bot_id, piece, mat_fn, tint):
    reset()
    sc = bpy.context.scene
    backdrop(tint)
    m = mat_fn()
    if bot_id in ('beep', 'viktor'):
        # metals mirror their surroundings: give them a soft grey studio to reflect
        sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.06, 0.065, 0.07, 1)
        card = box('reflector', (3.0, 0.05, 2.0), (-1.2, -3.2, 1.6), (0, 0, math.radians(-20)))
        em = bpy.data.materials.new('card'); em.use_nodes = True
        nt = em.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.6
        nt.links.new(e.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
        card.data.materials.append(em)
        card.visible_camera = False
    obj = PIECES[piece](m, piece)
    obj.rotation_euler = (0, 0, math.radians(-25 if piece != 'knight' else -18))
    h = {'pawn': 0.9, 'rook': 1.02, 'bishop': 1.24, 'queen': 1.39, 'king': 1.6, 'knight': 1.18}[piece]
    mid = h * 0.52
    area('key', (-2.2, -2.6, 2.8), (0, 0, mid), 140, 1.6, (1.0, 0.95, 0.88))
    area('rim', (2.0, 1.8, 2.0), (0, 0, mid), 160, 0.9, tint)
    area('fill', (2.4, -2.2, 0.6), (0, 0, mid), 12, 3.0)
    area('glow', (0, 0.6, 3.2), (0, 2.4, 1.0), 45, 2.0, tint)
    dist = 2.6 + h * 1.55
    camera((dist * 0.22, -dist, mid + 0.3), (0, 0, mid - 0.02), lens=85, dof=dist, fstop=4.0)
    render(os.path.join(OUT, 'bots', f'{bot_id}.jpg'), 512, 512, samples=128)

# ---------------------------------------------------------------- board texture
def board_tiles(maple, walnut, frame=None, z=0.0):
    objs = []
    for f in range(8):
        for r in range(8):
            light = (f + r) % 2 == 1
            me = bpy.data.meshes.new('sq')
            bm = bmesh.new()
            bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
            bm.to_mesh(me)
            bm.free()
            o = link(bpy.data.objects.new(f'sq{f}{r}', me))
            o.location = (f - 3.5, r - 3.5, z)
            o.data.materials.append(maple[(f * 3 + r) % len(maple)] if light else walnut[(f * 5 + r) % len(walnut)])
            objs.append(o)
    return objs

def wood_sets():
    maple = [wood(f'maple{i}', (0.86, 0.72, 0.52), (0.74, 0.58, 0.38), scale=7 + i, coat=0.3, rot=(i % 2) * 1.5708, seed=i * 3.1) for i in range(4)]
    walnut = [wood(f'walnut{i}', (0.42, 0.25, 0.13), (0.24, 0.13, 0.06), scale=7 + i, coat=0.3, rot=((i + 1) % 2) * 1.5708, seed=i * 2.3) for i in range(4)]
    return maple, walnut

def flat_wood(name, light, dark, scale, rot, seed):
    """Albedo-only wood (no lighting), so the board texture keeps exact colours."""
    m = wood(name, light, dark, scale=scale, rot=rot, seed=seed)
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    em = nt.nodes.new('ShaderNodeEmission')
    src = p.inputs['Base Color'].links[0].from_socket
    nt.links.new(src, em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
    return m

def board_texture():
    reset()
    sc = bpy.context.scene
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    maple = [flat_wood(f'maple{i}', (0.66, 0.46, 0.25), (0.53, 0.35, 0.17), 2.2 + 0.4 * i, (i % 2) * 1.5708, i * 3.1) for i in range(4)]
    walnut = [flat_wood(f'walnut{i}', (0.19, 0.10, 0.045), (0.11, 0.055, 0.025), 2.2 + 0.4 * i, ((i + 1) % 2) * 1.5708, i * 2.3) for i in range(4)]
    board_tiles(maple, walnut)
    c = bpy.data.cameras.new('cam')
    c.type = 'ORTHO'
    c.ortho_scale = 8.0
    o = link(bpy.data.objects.new('cam', c))
    o.location = (0, 0, 10)
    sc.camera = o
    render(os.path.join(OUT, 'board-wood.jpg'), 1024, 1024, samples=16)

# ---------------------------------------------------------------- hero scene
def hero():
    reset()
    sc = bpy.context.scene
    maple = [wood(f'maple{i}', (0.62, 0.45, 0.26), (0.52, 0.36, 0.19), scale=2.2 + 0.4 * i, coat=0.4, rot=(i % 2) * 1.5708, seed=i * 3.1) for i in range(4)]
    walnut = [wood(f'walnut{i}', (0.20, 0.11, 0.05), (0.12, 0.06, 0.03), scale=2.2 + 0.4 * i, coat=0.4, rot=((i + 1) % 2) * 1.5708, seed=i * 2.3) for i in range(4)]
    board_tiles(maple, walnut, z=0.0)
    frame = box('frame', (8.8, 8.8, 0.25), (0, 0, -0.13))
    frame.data.materials.append(wood('frame', (0.30, 0.17, 0.08), (0.14, 0.07, 0.03), scale=4, coat=0.6))
    ivory = material('ivory', (0.74, 0.66, 0.52), rough=0.28, coat=0.5, sss=0.12)
    ebony = material('ebony', (0.03, 0.025, 0.02), rough=0.16, coat=1.0)
    def place(piece, mat, sq, rot=0):
        f = 'abcdefgh'.index(sq[0]); r = int(sq[1]) - 1
        o = PIECES[piece](mat, piece + sq)
        o.location = (f - 3.5, r - 3.5, 0)
        o.rotation_euler = (0, 0, math.radians(rot))
        return o
    # Italian Game: 1.e4 e5 2.Nf3 Nc6 3.Bc4
    whites = [('rook', 'a1'), ('bishop', 'c1'), ('queen', 'd1'), ('king', 'e1'), ('rook', 'h1'), ('knight', 'f3'), ('bishop', 'c4'), ('knight', 'b1')]
    whites += [('pawn', p) for p in ['a2', 'b2', 'c2', 'd2', 'e4', 'f2', 'g2', 'h2']]
    blacks = [('rook', 'a8'), ('bishop', 'c8'), ('queen', 'd8'), ('king', 'e8'), ('bishop', 'f8'), ('knight', 'g8'), ('rook', 'h8'), ('knight', 'c6')]
    blacks += [('pawn', p) for p in ['a7', 'b7', 'c7', 'd7', 'e5', 'f7', 'g7', 'h7']]
    for p, s in whites:
        place(p, ivory, s, 90 if p == 'knight' else 0)
    for p, s in blacks:
        place(p, ebony, s, -90 if p == 'knight' else 0)
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.008, 0.008, 0.01, 1)
    area('key', (-6, -4, 7), (0, 0, 0), 900, 5, (1.0, 0.9, 0.78))
    area('rim', (4, 8, 4), (0, 0, 0.5), 900, 3, (0.7, 0.8, 1.0))
    area('fill', (7, -7, 3), (0, 0, 0), 120, 6)
    target = Vector((-1.5, -0.5, 0.6))   # the white bishop on c4
    cam_loc = Vector((6.5, -10.5, 5.2))
    camera(cam_loc, (-0.6, 0.6, 0.2), lens=70, dof=(target - cam_loc).length, fstop=2.2)
    render(os.path.join(OUT, 'hero.jpg'), 1280, 720, samples=160)

# ---------------------------------------------------------------- icon
def icon():
    reset()
    sc = bpy.context.scene
    backdrop((0.85, 0.7, 0.45))
    ivory = material('ivory', (0.88, 0.83, 0.72), rough=0.2, coat=0.6, sss=0.15)
    o = knight(ivory, 'knight')
    o.rotation_euler = (0, 0, math.radians(-18))
    area('key', (-2.2, -2.6, 2.8), (0, 0, 0.6), 150, 1.6, (1.0, 0.94, 0.86))
    area('rim', (1.8, 1.8, 2.2), (0, 0, 0.6), 200, 0.9, (1.0, 0.8, 0.5))
    area('glow', (0, 0.6, 3.2), (0, 2.4, 1.0), 50, 2.0, (1.0, 0.8, 0.5))
    camera((0.2, -4.4, 0.95), (0.06, 0, 0.62), lens=85, dof=4.4, fstop=8)
    render(os.path.join(OUT, 'icon.png'), 1024, 1024, samples=128, fmt='PNG')

jobs = {'board': board_texture, 'hero': hero, 'icon': icon}
if ONLY in jobs:
    jobs[ONLY]()
else:
    for b in BOTS:
        if ONLY and ONLY != b[0] and ONLY != 'bots':
            continue
        portrait(*b)
    if not ONLY:
        board_texture(); hero(); icon()
