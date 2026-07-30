# Scena Blender per i rendering fotorealistici della landing page
# Materiale Subbuteo classico: panno verde, miniature HW, pallone, porta.
import bpy, math, random, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else '/tmp'
SHOT = sys.argv[sys.argv.index('--shot') + 1] if '--shot' in sys.argv else 'hero'
SAMPLES = int(sys.argv[sys.argv.index('--samples') + 1]) if '--samples' in sys.argv else 256

random.seed(7)

# ---------------------------------------------------------------- pulizia
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def mat(name, base, rough=0.5, metal=0.0, spec=0.5, clearcoat=0.0, sheen=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if 'Specular IOR Level' in b.inputs:
        b.inputs['Specular IOR Level'].default_value = spec
    if clearcoat and 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = clearcoat
        b.inputs['Coat Roughness'].default_value = 0.08
    if sheen and 'Sheen Weight' in b.inputs:
        b.inputs['Sheen Weight'].default_value = sheen
        b.inputs['Sheen Roughness'].default_value = 0.4
    return m


# ---------------------------------------------------------------- panno verde
def make_baize():
    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
    p = bpy.context.object
    p.name = 'Baize'
    m = bpy.data.materials.new('Panno')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.028, 0.155, 0.052, 1)
    bsdf.inputs['Roughness'].default_value = 0.92
    if 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = 0.35
        bsdf.inputs['Sheen Roughness'].default_value = 0.5
    tex = nt.nodes.new('ShaderNodeTexCoord')
    # peluria del panno: rumore finissimo in bump
    n1 = nt.nodes.new('ShaderNodeTexNoise')
    n1.inputs['Scale'].default_value = 900
    n1.inputs['Detail'].default_value = 6
    n1.inputs['Roughness'].default_value = 0.7
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.42
    bump.inputs['Distance'].default_value = 0.0012
    nt.links.new(tex.outputs['Object'], n1.inputs['Vector'])
    nt.links.new(n1.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    # variazione lenta di tono (usura, luce)
    n2 = nt.nodes.new('ShaderNodeTexNoise')
    n2.inputs['Scale'].default_value = 5
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.020, 0.105, 0.036, 1)
    ramp.color_ramp.elements[1].color = (0.040, 0.190, 0.062, 1)
    nt.links.new(tex.outputs['Object'], n2.inputs['Vector'])
    nt.links.new(n2.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    p.data.materials.append(m)
    return p


def line(x, y, w, h, rot=0):
    """riga bianca dipinta sul panno"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y, 0.00035))
    o = bpy.context.object
    o.scale = (w, h, 1)
    o.rotation_euler[2] = rot
    o.data.materials.append(WHITE_LINE)
    return o


# ---------------------------------------------------------------- miniatura HW
import figure as FIG


def kit(shirt, shorts, sock, boot, base, basetop, skin=(0.76, 0.56, 0.42), hair=(0.30, 0.20, 0.11)):
    """Set di materiali di una squadra, con la plastica dipinta degli originali."""
    n = len(bpy.data.materials)
    return {
        'shirt':   mat('sh%d' % n, shirt, 0.36, clearcoat=0.32),
        'shorts':  mat('sp%d' % n, shorts, 0.38, clearcoat=0.30),
        'sock':    mat('sk%d' % n, sock, 0.40, clearcoat=0.26),
        'boot':    mat('bt%d' % n, boot, 0.30, clearcoat=0.45),
        'skin':    mat('fl%d' % n, skin, 0.47, clearcoat=0.18),
        'hair':    mat('hr%d' % n, hair, 0.44, clearcoat=0.30),
        'base':    mat('bs%d' % n, base, 0.13, clearcoat=0.75),
        'basetop': mat('bp%d' % n, basetop, 0.22, clearcoat=0.55),
    }


def figure(x, y, rot, K):
    return FIG.miniature(x, y, rot, K)


# ---------------------------------------------------------------- pallone
def ball(x, y, r=0.0085):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, r), segments=64, ring_count=32)
    b = bpy.context.object
    bpy.ops.object.shade_smooth()
    m = bpy.data.materials.new('Pallone')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.30
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = 0.4
        bsdf.inputs['Coat Roughness'].default_value = 0.15
    tc = nt.nodes.new('ShaderNodeTexCoord')
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.feature = 'DISTANCE_TO_EDGE'
    vor.inputs['Scale'].default_value = 4.6
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].position = 0.02
    ramp.color_ramp.elements[0].color = (0.02, 0.02, 0.025, 1)
    ramp.color_ramp.elements[1].position = 0.055
    ramp.color_ramp.elements[1].color = (0.92, 0.91, 0.88, 1)
    nt.links.new(tc.outputs['Generated'], vor.inputs['Vector'])
    nt.links.new(vor.outputs['Distance'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.25
    nt.links.new(ramp.outputs['Color'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    b.data.materials.append(m)
    b.rotation_euler = (0.4, 0.9, 0.2)
    return b


# ---------------------------------------------------------------- porta
def goal(y, w=0.14, h=0.045):
    posts = []
    for dx in (-w / 2, w / 2):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.0022, depth=h, location=(dx, y, h / 2),
                                            vertices=24)
        posts.append(bpy.context.object)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0022, depth=w, location=(0, y, h), vertices=24)
    cb = bpy.context.object
    cb.rotation_euler[1] = math.pi / 2
    posts.append(cb)
    # rete: piano con trama a quadretti in alpha
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, y + 0.022, h / 2))
    net = bpy.context.object
    net.scale = (w, 1, h)
    net.rotation_euler[0] = math.pi / 2
    m = bpy.data.materials.new('Rete')
    m.use_nodes = True
    m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else m.blend_method
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.62, 0.63, 0.62, 1)
    bsdf.inputs['Roughness'].default_value = 0.72
    tp = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    ck = nt.nodes.new('ShaderNodeTexChecker')
    ck.inputs['Scale'].default_value = 150
    out = nt.nodes['Material Output']
    nt.links.new(ck.outputs['Fac'], mix.inputs['Fac'])
    nt.links.new(tp.outputs['BSDF'], mix.inputs[1])
    nt.links.new(bsdf.outputs['BSDF'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    net.data.materials.append(m)
    mm = mat('palo', (0.93, 0.93, 0.92), 0.25, clearcoat=0.4)
    for p in posts:
        p.data.materials.append(mm)
        bpy.ops.object.select_all(action='DESELECT')
        p.select_set(True)
        bpy.context.view_layer.objects.active = p
        bpy.ops.object.shade_smooth()
    return posts


# ---------------------------------------------------------------- luci
def lights(key_energy=9.0, warm=True):
    # NB: scena in scala reale (miniature di ~3,5 cm) → potenze basse,
    # l'irradianza va col quadrato della distanza.
    bpy.ops.object.light_add(type='AREA', location=(-0.32, -0.20, 0.42))
    k = bpy.context.object
    k.data.energy = key_energy
    k.data.size = 0.55
    k.data.color = (1.0, 0.96, 0.90) if warm else (1, 1, 1)
    k.rotation_euler = (math.radians(38), math.radians(-16), math.radians(-40))

    bpy.ops.object.light_add(type='AREA', location=(0.42, 0.10, 0.26))
    f = bpy.context.object
    f.data.energy = key_energy * 0.28
    f.data.size = 0.9
    f.data.color = (0.86, 0.92, 1.0)
    f.rotation_euler = (math.radians(58), 0, math.radians(58))

    bpy.ops.object.light_add(type='AREA', location=(0.05, 0.40, 0.20))
    r = bpy.context.object
    r.data.energy = key_energy * 0.45
    r.data.size = 0.35
    r.data.color = (1.0, 0.88, 0.72)
    r.rotation_euler = (math.radians(104), 0, math.radians(186))

    w = bpy.data.worlds.new('W')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.035, 0.055, 0.05, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0


def camera(loc, look, lens=55, fstop=2.2, focus=None):
    bpy.ops.object.camera_add(location=loc)
    c = bpy.context.object
    d = Vector(look) - Vector(loc)
    c.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    c.data.lens = lens
    c.data.dof.use_dof = True
    c.data.dof.aperture_fstop = fstop
    c.data.dof.focus_distance = focus if focus else d.length
    sc.camera = c
    return c


# ---------------------------------------------------------------- materiali comuni
WHITE_LINE = mat('linea', (0.86, 0.86, 0.83), 0.78)

# divise ricalcate su Ref. reali del catalogo HW
ROSSO  = kit((0.42, 0.045, 0.055), (0.86, 0.86, 0.84), (0.40, 0.05, 0.06), (0.20, 0.13, 0.09),
             (0.60, 0.045, 0.055), (0.87, 0.87, 0.85))                       # maglia rossa, base rossa
BLU    = kit((0.055, 0.075, 0.34), (0.86, 0.86, 0.84), (0.05, 0.07, 0.30), (0.18, 0.12, 0.09),
             (0.06, 0.10, 0.52), (0.88, 0.88, 0.86))                          # maglia blu, base blu
BIANCO = kit((0.86, 0.86, 0.83), (0.85, 0.85, 0.82), (0.045, 0.045, 0.05), (0.19, 0.13, 0.09),
             (0.88, 0.88, 0.85), (0.72, 0.57, 0.045))                         # bianca, base bianca/oro
GIALLO = kit((0.62, 0.44, 0.05), (0.06, 0.06, 0.07), (0.05, 0.05, 0.06), (0.20, 0.13, 0.09),
             (0.045, 0.045, 0.05), (0.66, 0.47, 0.05))                        # giallonera, base nera

make_baize()

# ---------------------------------------------------------------- inquadrature
if SHOT == 'pitch':
    # Panno, pallone e porta: nessuna miniatura (il modello 3D del giocatore
    # non regge il confronto con il pezzo originale, quindi non lo si usa).
    line(0, 0.235, 0.90, 0.0022)
    line(0, 0.105, 0.90, 0.0020)
    ball(0.040, -0.004, 0.0092)
    goal(0.52, w=0.26, h=0.078)
    lights(4.8)
    camera((-0.010, -0.235, 0.030), (0.012, 0.030, 0.011), lens=85, fstop=13.0, focus=0.236)
    W, H = 2000, 1125

elif SHOT == 'hero':
    line(0, 0.235, 0.90, 0.0022)
    figure(-0.030, 0.014, 0.28, ROSSO)
    figure(0.024, 0.050, -0.95, BLU)
    figure(0.066, 0.008, 2.45, ROSSO)
    figure(-0.074, 0.072, 1.15, BLU)
    ball(-0.005, -0.020)
    goal(0.52, w=0.26, h=0.078)
    lights(4.6)
    camera((-0.030, -0.250, 0.052), (0.004, 0.020, 0.019), lens=85, fstop=16.0, focus=0.252)
    W, H = 2000, 1125

elif SHOT == 'ball':
    ball(0, 0, 0.0092)
    figure(0.038, 0.062, -0.55, ROSSO)
    figure(-0.054, 0.090, 0.75, BLU)
    line(0, 0.24, 0.90, 0.0022)
    lights(4.8)
    camera((-0.008, -0.150, 0.030), (0, 0.004, 0.009), lens=100, fstop=14.0, focus=0.152)
    W, H = 1600, 1200

elif SHOT == 'team':
    for i, dx in enumerate([-0.062, -0.031, 0.0, 0.031, 0.062]):
        figure(dx, (0.014 if i % 2 else 0), random.uniform(-0.35, 0.35), ROSSO)
    ball(0.086, -0.026, 0.0085)
    lights(4.4)
    camera((0.010, -0.400, 0.150), (0.0, 0.006, 0.020), lens=85, fstop=14.0, focus=0.420)
    W, H = 2000, 900

elif SHOT == 'box':
    # quattro divise diverse, come le file di un catalogo
    for i, (dx, K) in enumerate(zip([-0.054, -0.018, 0.018, 0.054],
                                    [ROSSO, BIANCO, BLU, GIALLO])):
        figure(dx, 0.0, math.radians(4 * (i - 1.5)), K)
    lights(4.0)
    camera((0.0, -0.330, 0.150), (0.0, 0.004, 0.020), lens=85, fstop=16.0, focus=0.360)
    W, H = 2000, 800

# ---------------------------------------------------------------- render
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.device = 'GPU'
except Exception as e:
    print('GPU non disponibile:', e)
    sc.cycles.device = 'CPU'

sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 8
sc.cycles.caustics_reflective = False
sc.render.resolution_x = W
sc.render.resolution_y = H
sc.render.film_transparent = False
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.compression = 20
sc.view_settings.view_transform = 'AgX'
sc.view_settings.exposure = 0.15
sc.view_settings.look = 'AgX - Punchy'
sc.render.filepath = os.path.join(OUT, SHOT + '.png')
bpy.ops.render.render(write_still=True)
print('SCRITTO', sc.render.filepath)
