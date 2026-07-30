# Miniatura Subbuteo heavyweight modellata sul pezzo originale:
#   · base a CUPOLA emisferica lucida, tagliata piatta in cima, con disco colorato incassato
#   · figura umana slanciata (non a blocchi): busto affusolato, braccia in due segmenti
#     leggermente aperte e portate avanti, gambe con ginocchio, calzettoni e scarpini
# La geometria organica nasce da uno "scheletro" di vertici a cui si applica
# il modificatore Skin (raggi per vertice) + Subdivision Surface.
import bpy, bmesh, math


def _skin(name, pts, radii, material, smooth=2):
    """Crea una mesh organica da una catena/albero di punti con raggi per vertice."""
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in pts]
    bm.verts.ensure_lookup_table()
    for a, b in zip(range(len(pts) - 1), range(1, len(pts))):
        bm.edges.new((vs[a], vs[b]))
    bm.to_mesh(me)
    bm.free()
    m = ob.modifiers.new('Skin', 'SKIN')
    m.use_smooth_shade = True
    for i, r in enumerate(radii):
        rx, ry = (r, r) if isinstance(r, (int, float)) else r
        me.skin_vertices[0].data[i].radius = (rx, ry)
    me.skin_vertices[0].data[0].use_root = True
    sub = ob.modifiers.new('Sub', 'SUBSURF')
    sub.levels = sub.render_levels = smooth
    ob.data.materials.append(material)
    return ob


def _chain(name, pts, radii, material, smooth=2):
    return _skin(name, pts, radii, material, smooth)


def dome(x, y, rot, col, topcol, R=0.0108, H=0.0072):
    """Base a cupola: sfera schiacciata tagliata piatta + disco colorato in cima."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=R, segments=64, ring_count=32, location=(x, y, 0))
    d = bpy.context.object
    d.name = 'Cupola'
    d.scale = (1, 1, .85)
    bpy.ops.object.transform_apply(scale=True)
    # taglio piatto in sommità
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, H + .01))
    cut = bpy.context.object
    cut.scale = (.05, .05, .02)
    b = d.modifiers.new('B', 'BOOLEAN')
    b.operation = 'DIFFERENCE'
    b.object = cut
    bpy.context.view_layer.objects.active = d
    bpy.ops.object.modifier_apply(modifier='B')
    bpy.data.objects.remove(cut, do_unlink=True)
    # il boolean lascia lo slot 0 vuoto (era del cubo di taglio): ripulisco e riassegno
    d.data.materials.clear()
    d.data.materials.append(col)
    for p in d.data.polygons:
        p.material_index = 0
    bpy.ops.object.select_all(action='DESELECT')
    d.select_set(True)
    bpy.context.view_layer.objects.active = d
    bpy.ops.object.shade_smooth()
    # disco colorato incassato sul piano superiore
    rt = R * math.sqrt(max(0., 1 - (H / (R * .85)) ** 2)) - .0002
    bpy.ops.mesh.primitive_cylinder_add(radius=rt, depth=.0007, location=(x, y, H - .0001), vertices=64)
    t = bpy.context.object
    t.data.materials.append(topcol)
    bpy.ops.object.shade_smooth()
    for o in (d, t):
        o.rotation_euler[2] = rot
    return [d, t], H


def player(x, y, rot, MAT, z0):
    """Figura umana in piedi, gambe leggermente divaricate, braccia appena aperte."""
    P = []
    hip = z0 + .0136           # bacino
    chest = z0 + .0180
    sh = z0 + .0203            # spalle
    neck = z0 + .0213
    hd = z0 + .0233            # centro testa

    # --- busto con maglia (bacino → petto → collo), affusolato
    P.append(_chain('busto', [
        (x, y, hip + .0004), (x, y, chest), (x, y, neck - .0012)],
        [(.0021, .0014), (.0023, .0015), (.0013, .0011)], MAT['shirt']))

    # --- spalle: barretta orizzontale per allargare la maglia
    P.append(_chain('spalle', [
        (x - .0025, y, sh - .0009), (x + .0025, y, sh - .0009)],
        [(.0011, .0012), (.0011, .0012)], MAT['shirt']))

    # --- braccia (maniche lunghe, come negli originali): spalla → gomito → polso
    for s in (-1, 1):
        P.append(_chain('braccio', [
            (x + s * .0026, y, sh - .0006),
            (x + s * .0038, y - .0009, sh - .0060),
            (x + s * .0042, y - .0026, sh - .0110)],
            [.00068, .00056, .00048], MAT['shirt']))
        # mano
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.00058, segments=18, ring_count=12,
                                             location=(x + s * .0043, y - .0030, sh - .0119))
        h = bpy.context.object
        h.scale = (1, 1.15, 1.25)
        h.data.materials.append(MAT['skin'])
        bpy.ops.object.shade_smooth()
        P.append(h)

    # --- calzoncini
    P.append(_chain('short', [
        (x - .0016, y, hip - .0032), (x, y, hip - .0004), (x + .0016, y, hip - .0032)],
        [(.0014, .0011), (.0019, .0014), (.0014, .0011)], MAT['shorts']))

    # --- cosce scoperte + polpacci con calzettoni + scarpini
    for s in (-1, 1):
        P.append(_chain('coscia', [
            (x + s * .0015, y, hip - .0028),
            (x + s * .0018, y + .0002, z0 + .0064)],
            [.00098, .00078], MAT['skin']))
        P.append(_chain('calza', [
            (x + s * .0018, y + .0002, z0 + .0064),
            (x + s * .0019, y + .0001, z0 + .0034),
            (x + s * .0020, y, z0 + .0012)],
            [.00080, .00070, .00058], MAT['sock']))
        bpy.ops.mesh.primitive_uv_sphere_add(radius=.00080, segments=20, ring_count=12,
                                             location=(x + s * .0020, y - .0008, z0 + .0007))
        bt = bpy.context.object
        bt.scale = (.98, 1.95, .55)
        bt.data.materials.append(MAT['boot'])
        bpy.ops.object.shade_smooth()
        P.append(bt)

    # --- testa e capelli
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.00222, segments=36, ring_count=20, location=(x, y, hd))
    head = bpy.context.object
    head.scale = (1, 1.06, 1.16)
    head.data.materials.append(MAT['skin'])
    bpy.ops.object.shade_smooth()
    P.append(head)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.00230, segments=36, ring_count=20,
                                         location=(x, y + .0002, hd + .0009))
    hair = bpy.context.object
    hair.scale = (1, 1.04, .82)
    hair.data.materials.append(MAT['hair'])
    bpy.ops.object.shade_smooth()
    P.append(hair)

    # --- collo
    P.append(_chain('collo', [(x, y, neck - .0016), (x, y, neck + .0010)],
                    [.00072, .00066], MAT['skin']))

    for o in P:
        o.rotation_euler[2] = rot
    return P


def miniature(x, y, rot, MAT):
    """Miniatura completa: cupola + giocatore, ruotati insieme."""
    parts, H = dome(x, y, rot, MAT['base'], MAT['basetop'])
    # il giocatore va ruotato attorno all'asse della base
    px = x
    py = y
    ps = player(px, py, rot, MAT, H)
    for o in ps:
        o.rotation_euler[2] = 0
    # ruota tutto insieme attorno al centro della base
    bpy.ops.object.select_all(action='DESELECT')
    for o in ps:
        o.select_set(True)
    bpy.context.view_layer.objects.active = ps[0]
    bpy.ops.transform.rotate(value=rot, orient_axis='Z',
                             center_override=(x, y, 0))
    return parts + ps
